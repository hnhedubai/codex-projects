#!/usr/bin/env node
/**
 * audit-tokens.mjs - design-token drift audit for built CSS. Zero dependencies.
 *
 * Counts distinct values per CSS property so you can see whether your type,
 * spacing and colour scales are genuinely constrained or being invented ad hoc.
 * var(--token) references are counted separately from raw literals: a healthy
 * codebase keeps literals low and tokens high.
 *
 * Usage:
 *   node audit-tokens.mjs                          # audits ./dist
 *   node audit-tokens.mjs --path .next/static/css
 *   node audit-tokens.mjs --max 8                  # gate: exit 1 if a property exceeds 8
 *   node audit-tokens.mjs --props font-size,color
 *   node audit-tokens.mjs --json                   # machine-readable, for CI or an agent
 *   node audit-tokens.mjs --all                    # also count node_modules, vendor, *.min.css
 *
 * By default node_modules/, .git/, vendor/ and *.min.css are skipped, so you can
 * point --path at a project root without counting third-party stylesheets.
 *
 * Exit codes: 0 ok, 1 gate failed (--max), 2 bad path / no CSS found.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, resolve, relative, dirname } from 'node:path';

const DEFAULT_PROPS = [
  'font-size', 'line-height', 'padding', 'margin',
  'border-radius', 'color', 'background-color',
];

/**
 * Skipped by default, matched against each file's path RELATIVE to the audit
 * root. Relative matching matters: `--path dist` must still audit dist/, while
 * `--path .` on a monorepo must skip build output and dependencies.
 */
const DEFAULT_EXCLUDE =
  [
    'node_modules', '\\.git', '\\.next', '\\.turbo', '\\.svelte-kit', '\\.output',
    '\\.cache', '\\.venv', 'bower_components', 'vendor', 'coverage', 'dist', 'build', 'out',
    '\\.codex-backups', 'backups?', '_[^\\\\/]*backup[^\\\\/]*',
  ]
    .map((d) => `(?:^|[\\\\/])${d}(?:[\\\\/]|$)`)
    .join('|') + '|\\.(min\\.css|bak|orig|old|save)$';

const BUILT_CSS_HINTS = [
  ['dist', 'Vite, Astro, SvelteKit, plain webpack'],
  ['.next/static/css', 'Next.js'],
  ['build/static/css', 'Create React App'],
  ['dist/<app>/browser', 'Angular'],
  ['.output/public/_nuxt', 'Nuxt'],
  ['public', 'Hugo / Jekyll'],
];

function parseArgs(argv) {
  const opts = { path: 'dist', props: DEFAULT_PROPS, top: 6, max: 0, exclude: '', json: false, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--path': case '-p': opts.path = next(); break;
      case '--props': opts.props = next().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--top': opts.top = Number(next()); break;
      case '--max': opts.max = Number(next()); break;
      case '--exclude': opts.exclude = next(); break;
      case '--all': opts.all = true; break;
      case '--json': opts.json = true; break;
      case '--help': case '-h': opts.help = true; break;
      default: throw new Error(`unknown argument: ${a}`);
    }
  }
  return opts;
}

function collectCssFiles(dir, exclude, useDefaults = true) {
  const out = [];
  const patterns = [];
  if (useDefaults) patterns.push(DEFAULT_EXCLUDE);
  if (exclude) patterns.push(exclude);
  const skip = patterns.length ? new RegExp(patterns.map((p) => `(?:${p})`).join('|'), 'i') : null;

  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      const rel = relative(dir, full).replace(/\\/g, '/');
      if (skip && skip.test(rel)) continue;
      if (entry.isDirectory()) walk(full);
      else if (extname(entry.name).toLowerCase() === '.css') out.push(full);
    }
  };

  walk(dir);
  return out;
}

/** Count #abc and #aabbcc as the same colour. */
function expandHexColor(value) {
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value);
  return m ? `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}` : value;
}

function auditProperty(files, prop) {
  // the lookbehind stops "color" from also matching "background-color"
  const re = new RegExp(`(?<![\\w-])${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;}]+)`, 'gi');
  const literals = new Map();
  const tokens = new Map();
  let declarations = 0;

  for (const file of files) {
    // strip comments first: commented-out rules and prose like
    // "never write @media { font-size: ... }" must not count as declarations
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    for (const match of text.matchAll(re)) {
      declarations++;
      let value = match[1].replace(/\s+/g, ' ').trim().toLowerCase();
      // token-driven includes composed values like clamp(var(--a), 4vw, var(--b))
      if (value.includes('var(')) {
        tokens.set(value, (tokens.get(value) ?? 0) + 1);
      } else {
        value = expandHexColor(value);
        literals.set(value, (literals.get(value) ?? 0) + 1);
      }
    }
  }

  return { prop, declarations, literals, tokens };
}

/**
 * When the requested path does not exist, look around for where the CSS actually
 * lives instead of dead-ending. Walks up to the nearest existing ancestor, then
 * scans two levels down for directories that directly contain .css files.
 */
function suggestCssLocations(startPath) {
  let dir = resolve(startPath);
  for (let i = 0; i < 8 && !existsSync(dir); i++) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!existsSync(dir)) return { from: null, suggestions: [] };

  const heavy = /(?:^|[\\/])(node_modules|\.git|\.next|\.turbo|\.svelte-kit|\.output|\.cache|coverage)(?:[\\/]|$)/i;
  const suggestions = [];
  const queue = [{ dir, depth: 0 }];
  let visited = 0;

  while (queue.length && visited < 800 && suggestions.length < 8) {
    const { dir: current, depth } = queue.shift();
    visited++;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    let hasCss = false;
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const child = join(current, entry.name);
        if (depth < 3 && !heavy.test(child)) queue.push({ dir: child, depth: depth + 1 });
      } else if (extname(entry.name).toLowerCase() === '.css') {
        hasCss = true;
      }
    }
    if (hasCss) suggestions.push(relative(dir, current).replace(/\\/g, '/') || '.');
  }

  return { from: dir, suggestions };
}

function pad(str, width) {
  return String(str).padEnd(width);
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`error: ${err.message}`);
    console.error('try: node audit-tokens.mjs --help');
    process.exit(2);
  }

  if (opts.help) {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0]);
    process.exit(0);
  }

  const absPath = resolve(opts.path);
  let stat;
  try {
    stat = statSync(absPath);
  } catch {
    console.error(`No such path: ${opts.path}`);
    const { from, suggestions } = suggestCssLocations(opts.path);
    if (suggestions.length) {
      console.error(`Directories that actually contain .css files${from ? ` (searched from ${from})` : ''}:`);
      for (const s of suggestions) console.error(`  --path ${s}`);
      console.error('Pick the one that holds the CSS you want to audit.');
    } else {
      console.error('Built CSS is usually in one of these - pass the right one with --path:');
      for (const [p, stack] of BUILT_CSS_HINTS) console.error(`  ${pad(p, 26)} ${stack}`);
      console.error('Run your production build first (npm run build).');
    }
    process.exit(2);
  }
  if (!stat.isDirectory()) {
    console.error(`Not a directory: ${opts.path}`);
    process.exit(2);
  }

  const files = collectCssFiles(absPath, opts.exclude, !opts.all);
  if (files.length === 0) {
    console.error(`No .css files under ${opts.path} - did the build run, and is this the right folder?`);
    process.exit(2);
  }

  const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0);
  const rows = [];
  let gateFailed = false;

  for (const prop of opts.props) {
    const result = auditProperty(files, prop);
    if (result.declarations === 0) continue;

    const sorted = [...result.literals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const shown = (opts.top > 0 ? sorted.slice(0, opts.top) : sorted)
      .map(([value, count]) => `${value} x${count}`)
      .join(', ');
    const over = opts.max > 0 && result.literals.size > opts.max;
    if (over) gateFailed = true;

    rows.push({
      property: prop,
      distinct: result.literals.size,
      tokenised: result.tokens.size,
      declarations: result.declarations,
      values: shown,
      over,
    });
  }

  if (opts.json) {
    console.log(JSON.stringify({
      path: absPath,
      files: files.length,
      bytes: totalBytes,
      maxDistinct: opts.max,
      gateFailed,
      properties: rows,
    }, null, 2));
  } else {
    console.log('');
    console.log(`Auditing ${files.length} CSS file(s), ${(totalBytes / 1024).toFixed(1)} KB, under ${absPath}`);

    if (rows.length === 0) {
      console.log('None of the audited properties appear in these files.');
    } else {
      const headers = ['Property', 'Distinct', 'Tokenised', 'Declarations', 'Most common raw values'];
      const widths = [
        Math.max(headers[0].length, ...rows.map((r) => r.property.length)),
        headers[1].length,
        headers[2].length,
        headers[3].length,
      ];
      console.log('');
      console.log(`${pad(headers[0], widths[0])}  ${pad(headers[1], widths[1])}  ${pad(headers[2], widths[2])}  ${pad(headers[3], widths[3])}  ${headers[4]}`);
      console.log(`${'-'.repeat(widths[0])}  ${'-'.repeat(widths[1])}  ${'-'.repeat(widths[2])}  ${'-'.repeat(widths[3])}  ${'-'.repeat(headers[4].length)}`);
      for (const r of rows) {
        console.log(`${pad(r.property, widths[0])}  ${pad(r.distinct, widths[1])}  ${pad(r.tokenised, widths[2])}  ${pad(r.declarations, widths[3])}  ${r.values}${r.over ? '  <-- OVER' : ''}`);
      }
      console.log('');
      console.log('Distinct = distinct raw values (the number that should stay small).');
      console.log('Tokenised = distinct var(--...) references (this is the healthy layer).');
    }
  }

  if (opts.max > 0) {
    if (gateFailed) {
      if (!opts.json) console.error(`FAIL: at least one property exceeds --max ${opts.max}`);
      process.exit(1);
    }
    if (!opts.json) console.log(`PASS: every property is within --max ${opts.max}`);
  }

  process.exit(0);
}

main();
