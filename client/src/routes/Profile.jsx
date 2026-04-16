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
    </div>
  );
};

export default Profile;
