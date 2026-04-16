export const authorizeRole = (...allowedRoles) => (req, res, next) => {
  const userRole = req.auth?.role;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({ message: "Forbidden: insufficient role" });
  }

  return next();
};
