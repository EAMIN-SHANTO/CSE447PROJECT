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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
        
        {/* Header & Stats Card */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">Account Center</p>
              <h1 className="text-3xl font-extrabold text-black">My Profile</h1>
              <p className="text-sm text-gray-500 mt-2 max-w-lg">
                Manage your public profile, trust details, and account security settings.
              </p>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-gray-100 bg-gray-50">
              <UserAvatar name={profile?.pseudonym} size="lg" />
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Signed in as</span>
                <span className="text-base font-extrabold text-black mt-0.5">@{profile?.pseudonym || "user"}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {profileStats.map((stat) => (
                <div key={stat.label} className="p-5 md:p-6 flex flex-col">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</p>
                  <p className="text-lg font-extrabold text-black mt-1.5">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {message && (
          <div className="px-6 py-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 text-sm font-bold shadow-sm">
            {message}
          </div>
        )}

        {/* 2-Column Grid for Forms */}
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Profile Form */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold text-black mb-1">Profile Information</h2>
            <p className="text-sm text-gray-500 mb-8">Update how your account appears in the marketplace.</p>

            <form onSubmit={submitProfile} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Pseudonym</label>
                <input
                  value={form.pseudonym}
                  onChange={(event) => setForm((prev) => ({ ...prev, pseudonym: event.target.value }))}
                  className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="Pseudonym"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Contact Info</label>
                  <input
                    value={form.contactInfo}
                    onChange={(event) => setForm((prev) => ({ ...prev, contactInfo: event.target.value }))}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    placeholder="Contact Info"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors w-full sm:w-auto"
                >
                  Update Profile
                </button>
              </div>
            </form>
          </section>

          {/* Report Form */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <h2 className="text-xl font-bold text-black mb-1">Report User</h2>
            <p className="text-sm text-gray-500 mb-8">
              Submit suspicious behavior for admin review.
            </p>

            <form onSubmit={submitReport} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Reported User ID <span className="text-red-500">*</span></label>
                <input
                  value={reportForm.reportedUserId}
                  onChange={(event) =>
                    setReportForm((prev) => ({ ...prev, reportedUserId: event.target.value }))
                  }
                  className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="ID of user to report"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Reason <span className="text-red-500">*</span></label>
                <textarea
                  value={reportForm.reason}
                  onChange={(event) => setReportForm((prev) => ({ ...prev, reason: event.target.value }))}
                  className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 text-sm text-black min-h-[96px] resize-y focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                  placeholder="Detailed reason for report"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Post ID</label>
                  <input
                    value={reportForm.postId}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, postId: event.target.value }))}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-gray-500 mb-2">Bid ID</label>
                  <input
                    value={reportForm.bidId}
                    onChange={(event) => setReportForm((prev) => ({ ...prev, bidId: event.target.value }))}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* 2FA Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <div className="max-w-3xl">
            <h2 className="text-xl font-bold text-black mb-1">Authenticator App 2FA</h2>
            <p className="text-sm text-gray-500 mb-8">
              Keep email OTP as default and optionally add an authenticator app code as an alternative login method.
            </p>

            {!profile?.twoFactor?.totpEnabled && !totpSetupData && (
              <button
                type="button"
                onClick={beginTotpSetup}
                disabled={totpLoading}
                className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-black text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {totpLoading ? "Preparing Setup..." : "Set Up Authenticator"}
              </button>
            )}

            {totpSetupData && (
              <div className="grid md:grid-cols-2 gap-8 items-start bg-gray-50 rounded-xl p-6 md:p-8 border border-gray-100">
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 inline-block shadow-sm">
                    <img
                      src={totpSetupData.qrCodeDataUrl}
                      alt="Authenticator QR"
                      className="w-40 h-40"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Manual Key</p>
                    <code className="block bg-gray-200 px-3 py-2.5 rounded-md text-sm font-mono text-black break-all">
                      {totpSetupData.manualKey}
                    </code>
                  </div>
                </div>

                <form onSubmit={confirmTotpSetup} className="space-y-5 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value)}
                      className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 tracking-[0.2em] text-center font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={totpLoading}
                    className="w-full px-6 py-3 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors disabled:opacity-60"
                  >
                    {totpLoading ? "Verifying..." : "Verify & Enable"}
                  </button>
                </form>
              </div>
            )}

            {profile?.twoFactor?.totpEnabled && (
              <form onSubmit={submitDisableTotp} className="max-w-md space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Enter current authenticator code to disable
                  </label>
                  <input
                    type="text"
                    value={disableCode}
                    onChange={(event) => setDisableCode(event.target.value)}
                    className="w-full border border-gray-300 bg-gray-50 rounded-lg px-4 py-3 tracking-[0.2em] text-center font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors"
                    placeholder="000000"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={totpLoading}
                  className="px-6 py-3 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-60"
                >
                  {totpLoading ? "Disabling..." : "Disable Authenticator"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
