import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const Login = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeLogin } = useAuth();

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [otpMethod, setOtpMethod] = useState("email");
  const [activeOtpMethod, setActiveOtpMethod] = useState("email");
  const [awaitingSecondFactor, setAwaitingSecondFactor] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");

  const targetPath = location.state?.from || "/";

  const submitCredentials = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.login({ ...credentials, otpMethod });
      setChallengeId(response.challengeId || "");
      setDevOtpHint(response.devOtp || "");
      setActiveOtpMethod(response.otpDelivery === "authenticator" ? "authenticator" : "email");
      setOtp("");
      setAwaitingSecondFactor(true);
    } catch (requestError) {
      setError(requestError.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        email: credentials.email,
        otp,
      };

      if (challengeId) {
        payload.challengeId = challengeId;
      }

      const response = await api.verify2FA(payload, false);

      await completeLogin(response.accessToken);
      navigate(targetPath, { replace: true });
    } catch (requestError) {
      setError(requestError.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">Authentication</p>
          <h1 className="text-3xl font-extrabold text-black">Secure Login</h1>
          <p className="text-sm text-gray-500 mt-2">
            Sign in with password, then use either email OTP or your authenticator app code.
          </p>
        </div>

        {error && <div className="mb-6 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-bold shadow-sm">{error}</div>}

        {!awaitingSecondFactor && (
          <form onSubmit={submitCredentials} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Email Address</label>
              <input
                type="email"
                value={credentials.email}
                onChange={(event) => setCredentials((prev) => ({ ...prev, email: event.target.value.trim().toLowerCase() }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                placeholder="md.eamin@g.bracu.ac.bd"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Two-Factor Method</p>
              <label className="flex items-center gap-3 text-sm font-bold text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="otpMethod"
                  value="email"
                  checked={otpMethod === "email"}
                  onChange={() => setOtpMethod("email")}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                Send code to my Gmail
              </label>
              <label className="flex items-center gap-3 text-sm font-bold text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="otpMethod"
                  value="authenticator"
                  checked={otpMethod === "authenticator"}
                  onChange={() => setOtpMethod("authenticator")}
                  className="w-4 h-4 text-black border-gray-300 focus:ring-black"
                />
                Use Google Authenticator App
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-6 py-4 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? "Checking..." : "Continue to 2FA"}
            </button>
          </form>
        )}

        {awaitingSecondFactor && (
          <form onSubmit={submitOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">
                {activeOtpMethod === "authenticator" ? "Authenticator Code" : "Email OTP Code"}
              </label>
              <p className="text-xs text-gray-500 mb-2">
                {activeOtpMethod === "authenticator"
                  ? "Enter the 6-digit code from your Google Authenticator app."
                  : "We've sent a 6-digit code to your email."}
              </p>
              <input
                type="text"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 tracking-[0.3em] text-center font-extrabold text-2xl text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                placeholder="••••••"
                maxLength={6}
                required
              />
            </div>

            {devOtpHint && activeOtpMethod !== "authenticator" && (
              <div className="px-4 py-3 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 text-xs font-bold text-center">
                Dev OTP: <span className="tracking-widest">{devOtpHint}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? "Verifying..." : "Secure Login"}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Don't have an account?{" "}
            <Link to="/register" className="font-extrabold text-black hover:underline">
              Create one now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
