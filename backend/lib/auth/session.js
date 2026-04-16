import crypto from "crypto";
import AuthSession from "../../models/auth-session.model.js";
import { issueToken, verifyToken } from "./token.js";

const ACCESS_TTL = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);
const REFRESH_TTL = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7);

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret-change-me";

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const getAccessTokenFromRequest = (req) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
};

export const parseCookies = (cookieHeader) => {
  const output = {};

  if (!cookieHeader) {
    return output;
  }

  cookieHeader.split(";").forEach((cookiePair) => {
    const [rawKey, ...rest] = cookiePair.trim().split("=");
    if (!rawKey) {
      return;
    }
    output[rawKey] = decodeURIComponent(rest.join("="));
  });

  return output;
};

export const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie || "");
  return cookies.refreshToken || req.body?.refreshToken || null;
};

export const setRefreshCookie = (res, refreshToken) => {
  const cookie = [
    `refreshToken=${encodeURIComponent(refreshToken)}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/auth",
    `Max-Age=${REFRESH_TTL}`,
  ];

  if (process.env.NODE_ENV === "production") {
    cookie.push("Secure");
  }

  res.setHeader("Set-Cookie", cookie.join("; "));
};

export const clearRefreshCookie = (res) => {
  res.setHeader("Set-Cookie", "refreshToken=; HttpOnly; SameSite=Strict; Path=/auth; Max-Age=0");
};

export const issueSessionTokens = async ({ user, userAgent = "", ipAddress = "" }) => {
  const sessionId = crypto.randomBytes(16).toString("hex");

  const accessToken = issueToken({
    payload: {
      sub: String(user._id),
      role: user.role,
      type: "access",
      sid: sessionId,
    },
    secret: ACCESS_SECRET,
    expiresInSeconds: ACCESS_TTL,
  });

  const refreshToken = issueToken({
    payload: {
      sub: String(user._id),
      role: user.role,
      type: "refresh",
      sid: sessionId,
    },
    secret: REFRESH_SECRET,
    expiresInSeconds: REFRESH_TTL,
  });

  await AuthSession.create({
    sessionId,
    userId: user._id,
    refreshTokenHash: hashToken(refreshToken),
    userAgent,
    ipAddress,
    expiresAt: new Date(Date.now() + REFRESH_TTL * 1000),
    lastUsedAt: new Date(),
  });

  return {
    accessToken,
    refreshToken,
  };
};

export const verifyAccessToken = (token) => verifyToken({ token, secret: ACCESS_SECRET });

export const verifyRefreshToken = (token) => verifyToken({ token, secret: REFRESH_SECRET });

export const rotateRefreshToken = async ({ refreshToken, userAgent = "", ipAddress = "" }) => {
  const payload = verifyRefreshToken(refreshToken);

  if (payload.type !== "refresh") {
    throw new Error("Invalid refresh token type");
  }

  const session = await AuthSession.findOne({
    sessionId: payload.sid,
    userId: payload.sub,
    revokedAt: null,
  });

  if (!session) {
    throw new Error("Session not found");
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    throw new Error("Session expired");
  }

  if (session.userAgent && userAgent && session.userAgent !== userAgent) {
    session.revokedAt = new Date();
    await session.save();
    throw new Error("Session fingerprint mismatch");
  }

  if (session.refreshTokenHash !== hashToken(refreshToken)) {
    throw new Error("Refresh token mismatch");
  }

  const accessToken = issueToken({
    payload: {
      sub: payload.sub,
      role: payload.role,
      type: "access",
      sid: payload.sid,
    },
    secret: ACCESS_SECRET,
    expiresInSeconds: ACCESS_TTL,
  });

  const newRefreshToken = issueToken({
    payload: {
      sub: payload.sub,
      role: payload.role,
      type: "refresh",
      sid: payload.sid,
    },
    secret: REFRESH_SECRET,
    expiresInSeconds: REFRESH_TTL,
  });

  session.refreshTokenHash = hashToken(newRefreshToken);
  session.lastUsedAt = new Date();
  session.ipAddress = ipAddress || session.ipAddress;
  await session.save();

  return {
    payload,
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const revokeSessionByRefreshToken = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  const payload = verifyRefreshToken(refreshToken);

  await AuthSession.findOneAndUpdate(
    {
      sessionId: payload.sid,
      userId: payload.sub,
      revokedAt: null,
    },
    {
      revokedAt: new Date(),
    }
  );
};
