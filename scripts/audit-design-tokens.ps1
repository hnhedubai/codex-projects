<#
.SYNOPSIS
    Audits a built CSS bundle for design-token drift.

.DESCRIPTION
    Counts distinct values per CSS property so you can see whether your type,
    spacing and colour scales are genuinely constrained or being invented ad hoc.
    Values written as var(--token) are counted separately from raw literals, so a
    healthy codebase shows a low literal count and a high token count.

.PARAMETER Path
    Directory holding built CSS. Defaults to .\dist. Point it at the real output
    for your stack (.next\static\css, build\static\css, .output\public\_nuxt, ...).

.PARAMETER Property
    CSS properties to audit.

.PARAMETER Top
    How many values to print per property, most frequent first. 0 prints all.

.PARAMETER MaxDistinct
    Exit code 1 if any property exceeds this many distinct raw literal values.
    0 (default) disables the gate. Use it in CI: -MaxDistinct 8

.PARAMETER ExcludePattern
    Regex of file paths to skip, e.g. vendor or third-party stylesheets.

.PARAMETER PassThru
    Emit the result objects to the pipeline as well as the table.

.EXAMPLE
    .\audit-design-tokens.ps1 -Path .\dist

.EXAMPLE
    .\audit-design-tokens.ps1 -Path .next\static\css -MaxDistinct 8 -ExcludePattern 'vendor|bootstrap'
#>
[CmdletBinding()]
param(
    [string]   $Path = '.\dist',
    [string[]] $Property = @(
        'font-size', 'line-height', 'padding', 'margin',
        'border-radius', 'color', 'background-color'
    ),
    [int]      $Top = 6,
    [int]      $MaxDistinct = 0,
    [string]   $ExcludePattern = '',
    [switch]   $PassThru
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# `powershell.exe -File script.ps1 -Property a,b` passes one comma-joined string,
# so split on commas here and both invocation styles behave the same.
$Property = @($Property | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })

function Expand-HexColor {
    param([string] $Value)
    # count #abc and #aabbcc as the same colour
    if ($Value -match '^#([0-9a-f])([0-9a-f])([0-9a-f])$') {
        return '#' + $Matches[1] + $Matches[1] + $Matches[2] + $Matches[2] + $Matches[3] + $Matches[3]
    }
    return $Value
}

if (-not (Test-Path -LiteralPath $Path)) {
    Write-Host "No such path: $Path" -ForegroundColor Red
    Write-Host 'Built CSS is usually in one of these - pass the right one with -Path:' -ForegroundColor Yellow
    @(
        '.\dist                        Vite, Astro, SvelteKit, plain webpack',
        '.\.next\static\css            Next.js',
        '.\build\static\css            Create React App',
        '.\dist\<app>\browser          Angular',
        '.\.output\public\_nuxt        Nuxt',
        '.\public                      Hugo / Jekyll'
    ) | ForEach-Object { Write-Host "  $_" }
    Write-Host 'Run your production build first (npm run build).' -ForegroundColor Yellow
    exit 2
}

$files = Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -ieq '.css' }
if ($ExcludePattern) {
    $files = $files | Where-Object { $_.FullName -notmatch $ExcludePattern }
}
$files = @($files)

if ($files.Count -eq 0) {
    Write-Host "No .css files under $Path - did the build run, and is this the right folder?" -ForegroundColor Red
    exit 2
}

$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
Write-Host ''
Write-Host ("Auditing {0} CSS file(s), {1:N1} KB, under {2}" -f $files.Count, ($totalBytes / 1KB), (Resolve-Path -LiteralPath $Path).Path) -ForegroundColor Cyan

$results = @()
$failed  = $false

foreach ($prop in $Property) {
    if ([string]::IsNullOrWhiteSpace($prop)) { continue }

    # the lookbehind stops "color" from also matching "background-color"
    $regex = [regex]::new(
        '(?<![\w-])' + [regex]::Escape($prop) + '\s*:\s*([^;}]+)',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)

    $literals = @{}
    $tokens   = @{}
    $total    = 0

    foreach ($file in $files) {
        # strip comments first: commented-out rules and prose like
        # "never write @media { font-size: ... }" must not count as declarations
        $text = (Get-Content -LiteralPath $file.FullName -Raw) -replace '(?s)/\*.*?\*/', ' '
        foreach ($m in $regex.Matches($text)) {
            $total++
            $value = ($m.Groups[1].Value -replace '\s+', ' ').Trim().ToLowerInvariant()
            # token-driven includes composed values like clamp(var(--a), 4vw, var(--b))
            if ($value.Contains('var(')) {
                if ($tokens.ContainsKey($value)) { $tokens[$value]++ } else { $tokens[$value] = 1 }
            }
            else {
                $value = Expand-HexColor $value
                if ($literals.ContainsKey($value)) { $literals[$value]++ } else { $literals[$value] = 1 }
            }
        }
    }

    if ($total -eq 0) { continue }

    $distinctLiterals = $literals.Count
    if ($MaxDistinct -gt 0 -and $distinctLiterals -gt $MaxDistinct) { $failed = $true }

    $pairs = $literals.GetEnumerator() | Sort-Object -Property @{Expression = 'Value'; Descending = $true },
                                                              @{Expression = 'Name'; Descending = $false }
    if ($Top -gt 0) { $pairs = $pairs | Select-Object -First $Top }
    $shown = ($pairs | ForEach-Object { '{0} x{1}' -f $_.Name, $_.Value }) -join ', '

    $results += [pscustomobject]@{
        Property       = $prop
        Distinct       = $distinctLiterals
        Tokenised      = $tokens.Count
        Declarations   = $total
        'Most common raw values' = $shown
        Flag           = if ($MaxDistinct -gt 0 -and $distinctLiterals -gt $MaxDistinct) { 'OVER' } else { '' }
    }
}

if ($results.Count -eq 0) {
    Write-Host 'None of the audited properties appear in these files.' -ForegroundColor Yellow
    exit 0
}

$results | Format-Table -AutoSize | Out-String -Width 4096 | Write-Host

Write-Host 'Distinct = distinct raw values (the number that should stay small).' -ForegroundColor DarkGray
Write-Host 'Tokenised = distinct var(--...) references (this is the healthy layer).' -ForegroundColor DarkGray

if ($MaxDistinct -gt 0) {
    if ($failed) {
        Write-Host "FAIL: at least one property exceeds -MaxDistinct $MaxDistinct" -ForegroundColor Red
        if ($PassThru) { $results }
        exit 1
    }
    Write-Host "PASS: every property is within -MaxDistinct $MaxDistinct" -ForegroundColor Green
}

if ($PassThru) { $results }
exit 0
