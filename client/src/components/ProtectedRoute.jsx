import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, loadingProfile, profile } = useAuth();
  const location = useLocation();

  if (loadingProfile) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-600">
        Checking secure session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(profile?.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
