import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import AuthContext from "./auth-context";

const TOKEN_KEY = "cse447_access_token";

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(token));

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setProfile(null);
    setLoadingProfile(false);
  }, []);

  const fetchProfile = useCallback(async (activeToken) => {
    if (!activeToken) {
      setProfile(null);
      setLoadingProfile(false);
      return null;
    }

    setLoadingProfile(true);

    try {
      const response = await api.getProfile(activeToken);
      setProfile(response.profile);
      return response.profile;
    } catch {
      clearAuth();
      return null;
    } finally {
      setLoadingProfile(false);
    }
  }, [clearAuth]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      fetchProfile(token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setProfile(null);
      setLoadingProfile(false);
    }
  }, [token, fetchProfile]);

  const completeLogin = useCallback(async (accessToken) => {
    setToken(accessToken);
    localStorage.setItem(TOKEN_KEY, accessToken);
    await fetchProfile(accessToken);
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await api.logout(false);
    } catch {
      // Ignore logout network errors and clear local session anyway.
    }

    clearAuth();
  }, [clearAuth]);

  const value = useMemo(
    () => ({
      token,
      setToken,
      profile,
      setProfile,
      loadingProfile,
      fetchProfile,
      completeLogin,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, profile, loadingProfile, fetchProfile, completeLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
