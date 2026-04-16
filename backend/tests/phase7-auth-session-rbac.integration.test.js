import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.PHASE7_BASE_URL || "http://127.0.0.1:3000";

const request = async (path, { method = "GET", body, token, cookie } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  return { response, payload };
};

const registerAndLogin = async (prefix) => {
  const unique = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `${unique}@g.bracu.ac.bd`;
  const password = "SecurePass123!";

  const registerResult = await request("/auth/register", {
    method: "POST",
    body: {
      email,
      password,
      pseudonym: unique.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 24),
      fullName: `${prefix} User`,
      contactInfo: "01700000000",
    },
  });

  assert.equal(registerResult.response.status, 201);

  const loginResult = await request("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  assert.equal(loginResult.response.status, 200);
  assert.ok(loginResult.payload.challengeId);
  assert.ok(loginResult.payload.devOtp);

  const verifyResult = await request("/auth/verify-2fa", {
    method: "POST",
    body: {
      email,
      challengeId: loginResult.payload.challengeId,
      otp: loginResult.payload.devOtp,
    },
  });

  assert.equal(verifyResult.response.status, 200);
  assert.ok(verifyResult.payload.accessToken);

  const setCookie = verifyResult.response.headers.get("set-cookie");
  assert.ok(setCookie);

  return {
    email,
    accessToken: verifyResult.payload.accessToken,
    refreshCookie: setCookie.split(";")[0],
  };
};

test("phase7: 2FA + RBAC + session security checks", async () => {
  const actor = await registerAndLogin("phase7auth");

  const profileResult = await request("/profiles/me", { token: actor.accessToken });
  assert.equal(profileResult.response.status, 200);
  assert.equal(profileResult.payload.profile.twoFactor.enabled, true);

  const adminDenied = await request("/admin/status", { token: actor.accessToken });
  assert.equal(adminDenied.response.status, 403);

  const refreshResult = await request("/auth/refresh", {
    method: "POST",
    cookie: actor.refreshCookie,
  });

  assert.equal(refreshResult.response.status, 200);
  assert.ok(refreshResult.payload.accessToken);

  const logoutResult = await request("/auth/logout", {
    method: "POST",
    cookie: actor.refreshCookie,
  });

  assert.equal(logoutResult.response.status, 200);

  const refreshAfterLogout = await request("/auth/refresh", {
    method: "POST",
    cookie: actor.refreshCookie,
  });

  assert.equal(refreshAfterLogout.response.status, 401);
});
