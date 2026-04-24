import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const EMAIL_PATTERN = /^[^@\s]+@(g\.bracu\.ac\.bd|bracu\.ac\.bd|gmail\.com)$/i;

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    pseudonym: "",
    fullName: "",
    contactInfo: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [signupOtp, setSignupOtp] = useState("");
  const [devOtpHint, setDevOtpHint] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!EMAIL_PATTERN.test(form.email)) {
      setError("Use an allowed email: @g.bracu.ac.bd, @bracu.ac.bd, or @gmail.com");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      if (!otpChallengeId) {
        const response = await api.requestSignupOtp({ email: normalizedEmail });
        setOtpChallengeId(response.otpChallengeId);
        setDevOtpHint(response.devOtp || "");
        setSuccess("OTP sent to your email. Enter the OTP below to complete signup.");
        return;
      }

      if (!signupOtp) {
        setError("Enter the signup OTP sent to your email");
        return;
      }

      await api.register({
        email: normalizedEmail,
        password: form.password,
        pseudonym: form.pseudonym.trim().toLowerCase() || undefined,
        fullName: form.fullName,
        contactInfo: form.contactInfo,
        otpChallengeId,
        otp: signupOtp,
      });

      setSuccess("Registration complete. Please login and finish 2FA.");
      setTimeout(() => navigate("/login"), 900);
    } catch (requestError) {
      setError(requestError.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8 md:p-10">
        
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">Platform Access</p>
          <h1 className="text-3xl font-extrabold text-black">Create Secure Account</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
            Allowed domains: BRACU email (@g.bracu.ac.bd, @bracu.ac.bd) and temporary @gmail.com for testing.
          </p>
        </div>

        {error && <div className="mb-6 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-bold shadow-sm">{error}</div>}
        {success && <div className="mb-6 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm font-bold shadow-sm">{success}</div>}

        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Institutional Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="md.eamin@g.bracu.ac.bd"
              required
              disabled={Boolean(otpChallengeId)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                placeholder="MD EAMIN"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Pseudonym (Optional)</label>
              <input
                type="text"
                value={form.pseudonym}
                onChange={(event) => setForm((prev) => ({ ...prev, pseudonym: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                placeholder="Unisell13"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Contact Info</label>
            <input
              type="text"
              value={form.contactInfo}
              onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
              placeholder="Phone number or alternative email"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
                disabled={Boolean(otpChallengeId)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
                required
                disabled={Boolean(otpChallengeId)}
              />
            </div>
          </div>

          {Boolean(otpChallengeId) && (
            <div className="pt-6 border-t border-gray-100 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-widest text-center block">
                  Verify Your Email
                </label>
                <input
                  type="text"
                  value={signupOtp}
                  onChange={(event) => setSignupOtp(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 tracking-[0.3em] text-center font-extrabold text-2xl text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="••••••"
                  maxLength={6}
                  required
                />
              </div>

              {devOtpHint && (
                <div className="px-4 py-3 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 text-xs font-bold text-center">
                  Dev OTP: <span className="tracking-widest">{devOtpHint}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setOtpChallengeId("");
                  setSignupOtp("");
                  setDevOtpHint("");
                  setSuccess("");
                }}
                className="w-full px-6 py-3.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
              >
                Change Email / Resend OTP
              </button>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-4 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading
                ? otpChallengeId
                  ? "Verifying OTP..."
                  : "Sending OTP..."
                : otpChallengeId
                ? "Verify OTP & Complete Registration"
                : "Secure Account & Send OTP"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600 font-medium">
            Already have an account?{" "}
            <Link to="/login" className="font-extrabold text-black hover:underline">
              Sign in securely
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
