import { getAccessTokenFromRequest, verifyAccessToken } from "../lib/auth/session.js";

export const authenticate = (req, res, next) => {
  try {
    const token = getAccessTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({ message: "Access token missing" });
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      return res.status(401).json({ message: "Invalid token type" });
    }

    req.auth = {
      userId: payload.sub,
      role: payload.role,
      sessionId: payload.sid,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired access token" });
  }
};
