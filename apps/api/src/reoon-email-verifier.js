const VERIFY_URL = 'https://emailverifier.reoon.com/api/v1/verify';
const BALANCE_URL = 'https://emailverifier.reoon.com/api/v1/check-account-balance/';
const POWER_STATUSES = new Set([
  'safe',
  'invalid',
  'disabled',
  'disposable',
  'inbox_full',
  'catch_all',
  'role_account',
  'spamtrap',
  'unknown',
]);

function providerError(message, status = 502) {
  return Object.assign(new Error(message), { status });
}

function requireApiKey(apiKey) {
  if (!apiKey) throw providerError('Reoon verification needs REOON_API_KEY on the server.', 409);
}

function normalizeEmail(email) {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!value || !value.includes('@') || value.length > 320) {
    throw providerError('Provide a valid email address for Reoon verification.', 422);
  }
  return value;
}

async function readJsonResponse(response, message) {
  if (!response.ok) throw providerError(message);
  try {
    return await response.json();
  } catch {
    throw providerError(message);
  }
}

function normalizePowerResult(body, requestedEmail) {
  const status = typeof body?.status === 'string' ? body.status.toLowerCase() : '';
  if (!POWER_STATUSES.has(status) || body?.verification_mode !== 'power') {
    throw providerError('Reoon returned an invalid Power Mode result.');
  }
  return {
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : requestedEmail,
    status,
    overallScore: Number.isFinite(Number(body.overall_score)) ? Number(body.overall_score) : null,
    username: typeof body.username === 'string' ? body.username : '',
    domain: typeof body.domain === 'string' ? body.domain : '',
    isSafeToSend: body.is_safe_to_send === true,
    isValidSyntax: body.is_valid_syntax === true,
    isDisposable: body.is_disposable === true,
    isRoleAccount: body.is_role_account === true,
    canConnectSmtp: body.can_connect_smtp === true,
    hasInboxFull: body.has_inbox_full === true,
    isCatchAll: body.is_catch_all === true,
    isDeliverable: body.is_deliverable === true,
    isDisabled: body.is_disabled === true,
    isSpamtrap: body.is_spamtrap === true,
    isFreeEmail: body.is_free_email === true,
    mxAcceptsMail: body.mx_accepts_mail === true,
    mxRecords: Array.isArray(body.mx_records) ? body.mx_records.filter(value => typeof value === 'string').slice(0, 50) : [],
    verificationMode: 'power',
    raw: body,
  };
}

export function createReoonEmailVerifier({ apiKey = process.env.REOON_API_KEY, fetchImpl = fetch, timeoutMs = 90000 } = {}) {
  const request = async (url, message) => fetchImpl(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  }).then(response => readJsonResponse(response, message));

  return {
    capabilities() {
      return { enabled: Boolean(apiKey), provider: 'reoon', verificationMode: 'power' };
    },
    async verifyPower(email) {
      requireApiKey(apiKey);
      const normalizedEmail = normalizeEmail(email);
      const url = new URL(VERIFY_URL);
      url.searchParams.set('email', normalizedEmail);
      url.searchParams.set('key', apiKey);
      url.searchParams.set('mode', 'power');
      const body = await request(url.href, 'Reoon email verification could not complete.');
      return normalizePowerResult(body, normalizedEmail);
    },
    async accountBalance() {
      requireApiKey(apiKey);
      const url = new URL(BALANCE_URL);
      url.searchParams.set('key', apiKey);
      const body = await request(url.href, 'Reoon account balance could not be retrieved.');
      if (body?.status !== 'success') throw providerError('Reoon account balance returned an invalid result.');
      return {
        apiStatus: typeof body.api_status === 'string' ? body.api_status : 'unknown',
        remainingDailyCredits: Number.isFinite(Number(body.remaining_daily_credits)) ? Number(body.remaining_daily_credits) : 0,
        remainingInstantCredits: Number.isFinite(Number(body.remaining_instant_credits)) ? Number(body.remaining_instant_credits) : 0,
        status: 'success',
      };
    },
  };
}

