import { useState } from "react";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const Profile = () => {
  const { profile, token, setProfile, fetchProfile } = useAuth();
  const [form, setForm] = useState({
    pseudonym: profile?.pseudonym || "",
    fullName: profile?.fullName || "",
    contactInfo: profile?.contactInfo || "",
  });
  const [reportForm, setReportForm] = useState({
    reportedUserId: "",
    reason: "",
    postId: "",
    bidId: "",
  });
  const [message, setMessage] = useState("");
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);

  const submitProfile = async (event) => {
    event.preventDefault();

    try {
      const response = await api.updateProfile(form, token);
      setProfile(response.profile);
      setMessage("Profile updated securely.");
      await fetchProfile(token);
    } catch (requestError) {
      setMessage(requestError.message || "Profile update failed");
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();

    try {
      const response = await api.reportUser(reportForm, token);
      setMessage(`Report submitted. ID: ${response.reportId}`);
      setReportForm({ reportedUserId: "", reason: "", postId: "", bidId: "" });
    } catch (requestError) {
      setMessage(requestError.message || "Failed to submit report");
    }
  };

  const beginTotpSetup = async () => {
    setTotpLoading(true);
    setMessage("");

    try {
      const response = await api.startTotpSetup(token);
      setTotpSetupData(response);
      setTotpCode("");
      setMessage("Authenticator setup initiated. Scan the QR and verify with a code.");
    } catch (requestError) {
      setMessage(requestError.message || "Failed to start authenticator setup");
    } finally {
      setTotpLoading(false);
    }
  };

  const confirmTotpSetup = async (event) => {
    event.preventDefault();
    setTotpLoading(true);
    setMessage("");

    try {
      await api.verifyTotpSetup({ code: totpCode }, token);
      setTotpSetupData(null);
      setTotpCode("");
      setMessage("Authenticator enabled. You can now use app code for login.");
      await fetchProfile(token);
    } catch (requestError) {
      setMessage(requestError.message || "Failed to verify authenticator code");
    } finally {
      setTotpLoading(false);
    }
  };

  const submitDisableTotp = async (event) => {
    event.preventDefault();
    setTotpLoading(true);
    setMessage("");

    try {
      await api.disableTotp({ code: disableCode }, token);
      setDisableCode("");
      setTotpSetupData(null);
      setMessage("Authenticator disabled. Email OTP login remains active.");
      await fetchProfile(token);
    } catch (requestError) {
      setMessage(requestError.message || "Failed to disable authenticator");
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-6">
      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">My Profile</h1>

        {message && <div className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">{message}</div>}

        <div className="mb-5 p-4 rounded-xl bg-slate-50 text-sm text-slate-700 space-y-1">
          <p>Campus Badge: {profile?.trust?.verifiedCampusBadge ? "Verified" : "Pending"}</p>
          <p>Successful Trades: {profile?.trust?.successfulTradeCount || 0}</p>
          <p>Reports Received: {profile?.trust?.reportsReceived || 0}</p>
          <p>2FA: {profile?.twoFactor?.enabled ? "Enabled" : "Disabled"}</p>
          <p>Authenticator App: {profile?.twoFactor?.totpEnabled ? "Enabled" : "Disabled"}</p>
        </div>

        <form onSubmit={submitProfile} className="space-y-3">
          <input
            value={form.pseudonym}
            onChange={(event) => setForm((prev) => ({ ...prev, pseudonym: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Pseudonym"
          />
          <input
            value={form.fullName}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Full Name"
          />
          <input
            value={form.contactInfo}
            onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Contact Info"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold">
            Update Profile
          </button>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Report User</h2>
        <p className="text-sm text-slate-600 mb-4">
          Use this for suspicious behavior. Admin will review the report.
        </p>

        <form onSubmit={submitReport} className="space-y-3">
          <input
            value={reportForm.reportedUserId}
            onChange={(event) =>
              setReportForm((prev) => ({ ...prev, reportedUserId: event.target.value }))
            }
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Reported User ID"
            required
          />
          <textarea
            value={reportForm.reason}
            onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3 min-h-24"
            placeholder="Reason"
            required
          />
          <input
            value={reportForm.postId}
            onChange={(event) => setReportForm((prev) => ({ ...prev, postId: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Post ID (optional)"
          />
          <input
            value={reportForm.bidId}
            onChange={(event) => setReportForm((prev) => ({ ...prev, bidId: event.target.value }))}
            className="w-full border border-slate-300 rounded-xl p-3"
            placeholder="Bid ID (optional)"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold">
            Submit Report
          </button>
        </form>
      </section>

      <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Authenticator App 2FA (Google Authenticator)</h2>
        <p className="text-sm text-slate-600 mb-4">
          Keep email OTP as default and optionally add authenticator app code as an alternative login method.
        </p>

        {!profile?.twoFactor?.totpEnabled && !totpSetupData && (
          <button
            type="button"
            onClick={beginTotpSetup}
            disabled={totpLoading}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {totpLoading ? "Preparing..." : "Enable Authenticator"}
          </button>
        )}

        {totpSetupData && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 items-start">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-sm font-semibold text-slate-800 mb-2">Scan This QR</p>
              <img
                src={totpSetupData.qrCodeDataUrl}
                alt="Authenticator QR"
                className="w-48 h-48 rounded-lg border border-slate-200 bg-white"
              />
              <p className="text-xs text-slate-600 mt-3 break-all">
                Manual key: <strong>{totpSetupData.manualKey}</strong>
              </p>
            </div>

            <form onSubmit={confirmTotpSetup} className="space-y-3">
              <label className="text-sm text-slate-700 block">Enter code from your app to finish setup</label>
              <input
                type="text"
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 tracking-[0.2em] text-center font-semibold"
                placeholder="123456"
                maxLength={6}
                required
              />
              <button
                type="submit"
                disabled={totpLoading}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
              >
                {totpLoading ? "Verifying..." : "Verify & Enable"}
              </button>
            </form>
          </div>
        )}

        {profile?.twoFactor?.totpEnabled && (
          <form onSubmit={submitDisableTotp} className="mt-4 max-w-md space-y-3">
            <label className="text-sm text-slate-700 block">Enter current authenticator code to disable</label>
            <input
              type="text"
              value={disableCode}
              onChange={(event) => setDisableCode(event.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 tracking-[0.2em] text-center font-semibold"
              placeholder="123456"
              maxLength={6}
              required
            />
            <button
              type="submit"
              disabled={totpLoading}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold disabled:opacity-60"
            >
              {totpLoading ? "Disabling..." : "Disable Authenticator"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default Profile;
