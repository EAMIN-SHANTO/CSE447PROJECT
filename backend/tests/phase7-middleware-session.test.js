import assert from "node:assert/strict";
import test from "node:test";
import { getAccessTokenFromRequest, setRefreshCookie, clearRefreshCookie } from "../lib/auth/session.js";
import { issueToken, verifyToken } from "../lib/auth/token.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    payload: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
  };

  return response;
};

test("phase7: token verification fails when tampered", () => {
  const secret = "phase7-token-secret";
  const token = issueToken({ payload: { sub: "u1", role: "user", type: "access" }, secret, expiresInSeconds: 600 });
  const tamperedToken = `${token.slice(0, -1)}x`;

  const payload = verifyToken({ token, secret });
  assert.equal(payload.sub, "u1");

  assert.throws(() => verifyToken({ token: tamperedToken, secret }), /Invalid token signature/);
});

test("phase7: access token extraction handles bearer format", () => {
  const req = { headers: { authorization: "Bearer abc.def.ghi" } };
  const token = getAccessTokenFromRequest(req);
  assert.equal(token, "abc.def.ghi");
});

test("phase7: session cookie flags are strict", () => {
  const res = createMockResponse();
  setRefreshCookie(res, "refresh-token-value");
  const cookie = res.headers["Set-Cookie"];

  assert.ok(cookie.includes("HttpOnly"));
  assert.ok(cookie.includes("SameSite=Strict"));
  assert.ok(cookie.includes("Path=/auth"));
  assert.ok(cookie.includes("Max-Age="));

  clearRefreshCookie(res);
  const cleared = res.headers["Set-Cookie"];
  assert.ok(cleared.includes("Max-Age=0"));
});

test("phase7: authenticate middleware denies missing token", () => {
  const req = { headers: {} };
  const res = createMockResponse();

  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test("phase7: authenticate middleware accepts valid access token", () => {
  const token = issueToken({
    payload: { sub: "507f1f77bcf86cd799439011", role: "admin", type: "access", sid: "session-1" },
    secret: "dev-access-secret-change-me",
    expiresInSeconds: 600,
  });

  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = createMockResponse();

  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.auth.userId, "507f1f77bcf86cd799439011");
  assert.equal(req.auth.role, "admin");
});

test("phase7: authorizeRole enforces RBAC", () => {
  const middleware = authorizeRole("admin");
  const req = { auth: { role: "user" } };
  const res = createMockResponse();

  let nextCalled = false;
  middleware(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);

  const reqAdmin = { auth: { role: "admin" } };
  const resAdmin = createMockResponse();
  let nextAdmin = false;
  middleware(reqAdmin, resAdmin, () => {
    nextAdmin = true;
  });

  assert.equal(nextAdmin, true);
  assert.equal(resAdmin.statusCode, 200);
});
