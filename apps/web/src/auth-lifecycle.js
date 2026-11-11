import { createAuthClient } from "@neondatabase/auth";

const ACTION_TIMEOUT_MS = 20_000;
const query = new URLSearchParams(window.location.search);

function messageFrom(error, fallback) {
  if (typeof error === "string" && error) return error;
  if (error?.message) return error.message;
  return fallback;
}

async function withTimeout(operation) {
  let timer;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error("This request took too long. Please try again.")), ACTION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    window.clearTimeout(timer);
  }
}

async function readAuthConfiguration() {
  const response = await fetch("/auth-config", { cache: "no-store" });
  if (!response.ok) throw new Error("Authentication is not available right now.");
  const configuration = await response.json();
  if (!configuration.authPath) throw new Error("Authentication is not configured.");
  return configuration;
}

const authConfiguration = readAuthConfiguration();
const authClient = authConfiguration.then(({ authPath }) => createAuthClient(new URL(authPath, window.location.origin).toString()));

async function callAuth(action, fallback) {
  const result = await withTimeout(action);
  if (result?.error) throw new Error(messageFrom(result.error, fallback));
  return result?.data ?? result;
}

function setStatus(form, text, kind = "") {
  const status = form.parentElement.querySelector(".status");
  status.textContent = text;
  status.dataset.kind = kind;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setQueryValue(name, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  return `${url.pathname}${url.search}`;
}

function prefillEmail() {
  const email = query.get("email");
  if (!email) return;
  document.querySelectorAll('input[name="email"]').forEach((input) => {
    input.value = email;
  });
}

async function requestPasswordReset(email) {
  const { authPath } = await authConfiguration;
  const response = await withTimeout(() => fetch(`${authPath}/email-otp/request-password-reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  }));
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(body, "Unable to send a reset code."));
  return body;
}

async function resetPassword({ email, otp, password }) {
  const { authPath } = await authConfiguration;
  const response = await withTimeout(() => fetch(`${authPath}/email-otp/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, otp, password }),
  }));
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(messageFrom(body, "Unable to reset the password."));
  return body;
}

async function deleteCurrentAccount(password) {
  const client = await authClient;
  // The same-origin SDK carries the session cookie to /delete-user.
  // A separately issued JWT is not a prerequisite for session authentication.
  const result = await callAuth(() => client.deleteUser({ password }), "Unable to delete the account.");
  if (result?.success !== true || result?.message !== "User deleted") {
    throw new Error(result?.message === "Verification email sent"
      ? "Check your email to complete account deletion verification. Your account has not been deleted yet."
      : "Account deletion was not confirmed. Please try again.");
  }
  return result;
}

const formHandlers = {
  async register(values) {
    const client = await authClient;
    await callAuth(() => client.signUp.email(values), "Unable to create the account.");
    window.location.assign(`/auth/verify.html?email=${encodeURIComponent(values.email)}`);
  },
  async verify({ email, otp }) {
    const client = await authClient;
    await callAuth(() => client.emailOtp.verifyEmail({ email, otp }), "The verification code could not be confirmed.");
    window.location.assign(`/auth/login.html?email=${encodeURIComponent(email)}`);
  },
  async login({ email, password }) {
    const client = await authClient;
    await callAuth(() => client.signIn.email({ email, password }), "Unable to sign in.");
    window.location.assign("/tracker/");
  },
  async forgot({ email }) {
    await requestPasswordReset(email);
    window.location.assign(`/auth/reset-password.html?email=${encodeURIComponent(email)}`);
  },
  async reset(values) {
    await resetPassword(values);
    window.location.assign(`/auth/login.html?email=${encodeURIComponent(values.email)}`);
  },
  async delete({ password }) {
    await deleteCurrentAccount(password);
    window.location.assign("/auth/register.html?deleted=1");
  },
};

function bindForm(form) {
  const handler = formHandlers[form.dataset.authForm];
  if (!handler) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setStatus(form, "Working…");
    try {
      await withTimeout(() => handler(formValues(form)));
    } catch (error) {
      setStatus(form, messageFrom(error, "Something went wrong. Please try again."), "error");
    } finally {
      button.disabled = false;
    }
  });
}

async function populateAccount() {
  const email = document.querySelector("[data-account-email]");
  if (!email) return;
  try {
    const client = await authClient;
    const session = await callAuth(() => client.getSession(), "Unable to restore your session.");
    if (!session?.user?.email) {
      window.location.replace("/auth/login.html");
      return;
    }
    email.textContent = session.user.email;
  } catch {
    window.location.replace("/auth/login.html");
  }
}

prefillEmail();
document.querySelectorAll("[data-auth-form]").forEach(bindForm);
void populateAccount();

if (query.get("deleted") === "1") {
  const form = document.querySelector('[data-auth-form="register"]');
  if (form) setStatus(form, "Your account has been deleted.", "success");
}
