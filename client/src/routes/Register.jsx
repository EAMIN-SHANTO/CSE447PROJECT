import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const EMAIL_PATTERN = /^[^@\s]+@(g\.bracu\.ac\.bd|bracu\.ac\.bd)$/i;

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

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!EMAIL_PATTERN.test(form.email)) {
      setError("Use a BRACU email: @g.bracu.ac.bd or @bracu.ac.bd");
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
      await api.register({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        pseudonym: form.pseudonym.trim().toLowerCase() || undefined,
        fullName: form.fullName,
        contactInfo: form.contactInfo,
      });

      setSuccess("Registration complete. Please login and finish 2FA.");
      setTimeout(() => navigate("/login"), 700);
    } catch (requestError) {
      setError(requestError.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Secure Account</h1>
        <p className="text-sm text-slate-600 mt-1">Only BRACU students can register for this marketplace.</p>

        {error && <div className="mt-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}
        {success && <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">{success}</div>}

        <form onSubmit={submit} className="mt-5 grid gap-3">
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="your-id@g.bracu.ac.bd"
            required
          />
          <input
            type="text"
            value={form.pseudonym}
            onChange={(event) => setForm((prev) => ({ ...prev, pseudonym: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Pseudonym (optional)"
          />
          <input
            type="text"
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Full name"
          />
          <input
            type="text"
            value={form.contactInfo}
            onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Contact info"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Password"
            required
          />
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Confirm Password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-indigo-700 hover:text-indigo-900">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
