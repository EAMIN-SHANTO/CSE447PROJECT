import { useState } from "react";
import UserAvatar from "../components/UserAvatar";
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

  const profileStats = [
    {
      label: "Campus Badge",
      value: profile?.trust?.verifiedCampusBadge ? "Verified" : "Pending",
    },
    {
      label: "Successful Trades",
      value: profile?.trust?.successfulTradeCount || 0,
    },
    {
      label: "Reports Received",
      value: profile?.trust?.reportsReceived || 0,
    },
    {
      label: "Rating",
      value: `${Number(profile?.trust?.ratingAverage ?? 5).toFixed(1)} / 5 (${Number(
        profile?.trust?.ratingCount || 0
      )})`,
    },
    {
      label: "2FA",
      value: profile?.twoFactor?.enabled ? "Enabled" : "Disabled",
    },
    {
      label: "Authenticator App",
      value: profile?.twoFactor?.totpEnabled ? "Enabled" : "Disabled",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold">Account Center</p>
              <h1 className="text-3xl font-black text-slate-900 mt-2">My Profile</h1>
              <p className="text-slate-600 mt-2">
                Manage your public profile, trust details, and account security settings.
              </p>
            </div>
            <div className="inline-flex items-center gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50">
              <UserAvatar name={profile?.pseudonym} size="lg" />
              <div>
                <p className="text-xs text-slate-500">Signed in as</p>
                <p className="text-sm font-semibold text-slate-900">@{profile?.pseudonym || "user"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {profileStats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        {message && (
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            {message}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-6">
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Profile Information</h2>
            <p className="text-sm text-slate-600 mt-1">Update how your account appears in the marketplace.</p>

            <form onSubmit={submitProfile} className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-700 font-medium block mb-1.5">Pseudonym</label>
                <input
                  value={form.pseudonym}
                  onChange={(event) => setForm((prev) => ({ ...prev, pseudonym: event.target.value }))}
                  className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="Pseudonym"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-700 font-medium block mb-1.5">Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700 font-medium block mb-1.5">Contact Info</label>
                  <input
                    value={form.contactInfo}
                    onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))}
                    className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    placeholder="Contact Info"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Update Profile
              </button>
            </form>
          </section>

          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Report User</h2>
            <p className="text-sm text-slate-600 mt-1">
              Submit suspicious behavior for admin review with optional post or bid references.
            </p>

            <form onSubmit={submitReport} className="mt-5 space-y-3">
              <input
                value={reportForm.reportedUserId}
                onChange={(event) =>
                  setReportForm((prev) => ({ ...prev, reportedUserId: event.target.value }))
                }
                className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Reported User ID"
                required
              />
              <textarea
                value={reportForm.reason}
                onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
                className="w-full border border-slate-300 rounded-xl p-3 min-h-24 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Reason"
                required
              />
              <input
                value={reportForm.postId}
                onChange={(event) => setReportForm((prev) => ({ ...prev, postId: event.target.value }))}
                className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Post ID (optional)"
              />
              <input
                value={reportForm.bidId}
                onChange={(event) => setReportForm((prev) => ({ ...prev, bidId: event.target.value }))}
                className="w-full border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Bid ID (optional)"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
              >
                Submit Report
              </button>
            </form>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Authenticator App 2FA (Google Authenticator)</h2>
          <p className="text-sm text-slate-600 mt-1">
            Keep email OTP as default and optionally add authenticator app code as an alternative login method.
          </p>

          {!profile?.twoFactor?.totpEnabled && !totpSetupData && (
            <button
              type="button"
              onClick={beginTotpSetup}
              disabled={totpLoading}
              className="mt-5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-emerald-700 transition-colors"
            >
              {totpLoading ? "Preparing..." : "Enable Authenticator"}
            </button>
          )}

          {totpSetupData && (
            <div className="mt-5 grid md:grid-cols-2 gap-5 items-start">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <p className="text-sm font-semibold text-slate-800 mb-2">Scan This QR</p>
                <img
                  src={totpSetupData.qrCodeDataUrl}
                  alt="Authenticator QR"
                  className="w-48 h-48 rounded-xl border border-slate-200 bg-white"
                />
                <p className="text-xs text-slate-600 mt-3 break-all">
                  Manual key: <strong>{totpSetupData.manualKey}</strong>
                </p>
              </div>

              <form onSubmit={confirmTotpSetup} className="space-y-3">
                <label className="text-sm text-slate-700 font-medium block">
                  Enter code from your app to finish setup
                </label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 tracking-[0.2em] text-center font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  placeholder="123456"
                  maxLength={6}
                  required
                />
                <button
                  type="submit"
                  disabled={totpLoading}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-60 hover:bg-slate-800 transition-colors"
                >
                  {totpLoading ? "Verifying..." : "Verify & Enable"}
                </button>
              </form>
            </div>
          )}

          {profile?.twoFactor?.totpEnabled && (
            <form onSubmit={submitDisableTotp} className="mt-5 max-w-md space-y-3">
              <label className="text-sm text-slate-700 font-medium block">
                Enter current authenticator code to disable
              </label>
              <input
                type="text"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 tracking-[0.2em] text-center font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="123456"
                maxLength={6}
                required
              />
              <button
                type="submit"
                disabled={totpLoading}
                className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold disabled:opacity-60 hover:bg-rose-700 transition-colors"
              >
                {totpLoading ? "Disabling..." : "Disable Authenticator"}
              </button>
            </form>
          )}
        </section>
        </div>
    </div>
  );
};

export default Profile;
