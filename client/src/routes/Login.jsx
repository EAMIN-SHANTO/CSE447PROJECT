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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Secure Login</h1>
        <p className="text-sm text-slate-600 mt-1">
          Sign in with password, then use either email OTP or your authenticator app code.
        </p>

        {error && <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

        {!awaitingSecondFactor && (
          <form onSubmit={submitCredentials} className="mt-5 space-y-3">
            <input
              type="email"
              value={credentials.email}
              onChange={(event) =>
                setCredentials((prev) => ({ ...prev, email: event.target.value.trim().toLowerCase() }))
              }
              className="w-full border border-slate-300 rounded-xl p-3"
              placeholder="your-id@g.bracu.ac.bd"
              required
            />
            <input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
              className="w-full border border-slate-300 rounded-xl p-3"
              placeholder="Password"
              required
            />

            <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-slate-50">
              <p className="text-sm font-medium text-slate-800">Choose login OTP option</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="otpMethod"
                  value="email"
                  checked={otpMethod === "email"}
                  onChange={() => setOtpMethod("email")}
                />
                Send code to your Gmail
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="otpMethod"
                  value="authenticator"
                  checked={otpMethod === "authenticator"}
                  onChange={() => setOtpMethod("authenticator")}
                />
                Use code from Google Authenticator
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-60"
            >
              {loading ? "Checking..." : "Continue to OTP"}
            </button>
          </form>
        )}

        {awaitingSecondFactor && (
          <form onSubmit={submitOtp} className="mt-5 space-y-3">
            <label className="text-sm text-slate-700 block">
              {activeOtpMethod === "authenticator"
                ? "Enter your 6-digit code from Google Authenticator"
                : "Enter your 6-digit code sent to your Gmail"}
            </label>
            <input
              type="text"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 tracking-[0.2em] text-center font-semibold"
              placeholder="123456"
              maxLength={6}
              required
            />
            {devOtpHint && activeOtpMethod !== "authenticator" && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                Dev OTP (non-production only): <strong>{devOtpHint}</strong>
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify OTP & Login"}
            </button>
          </form>
        )}

        <p className="mt-5 text-sm text-slate-600">
          No account yet?{" "}
          <Link to="/register" className="font-semibold text-indigo-700 hover:text-indigo-900">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
