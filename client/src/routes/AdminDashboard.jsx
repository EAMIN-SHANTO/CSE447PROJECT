import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("disputes");
  const [status, setStatus] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statusData, disputeData, reportData] = await Promise.all([
        api.getAdminStatus(token),
        api.listAdminDisputes(token),
        api.listAdminReports(token),
      ]);

      setStatus(statusData);
      setDisputes(disputeData.disputes || []);
      setReports(reportData.reports || []);
    } catch (requestError) {
      setError(requestError.message || "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      load();
    }
  }, [token, load]);

  const handleResolveDispute = async (disputeId, action) => {
    try {
      const note = window.prompt("Resolution note (optional)", "") || "";
      await api.resolveAdminDispute(disputeId, { action, note }, token);
      setMessage(`Dispute updated with action: ${action}`);
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to resolve dispute");
    }
  };

  const handleResolveReport = async (reportId, nextStatus) => {
    try {
      const adminNote = window.prompt("Admin note (optional)", "") || "";
      await api.resolveAdminReport(reportId, { status: nextStatus, adminNote }, token);
      setMessage(`Report marked as ${nextStatus}`);
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to resolve report");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading admin dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <section className="rounded-2xl bg-slate-900 text-white p-6">
        <h1 className="text-3xl font-black tracking-tight">Admin Dashboard</h1>
        <p className="text-slate-300 mt-1">Moderate disputes and reports with secure RBAC.</p>

        {status?.metrics && (
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 text-sm">
            <div className="bg-white/10 rounded-xl p-3">Users: {status.metrics.users}</div>
            <div className="bg-white/10 rounded-xl p-3">Admins: {status.metrics.admins}</div>
            <div className="bg-white/10 rounded-xl p-3">Posts: {status.metrics.posts}</div>
            <div className="bg-white/10 rounded-xl p-3">Sessions: {status.metrics.activeSessions}</div>
            <div className="bg-white/10 rounded-xl p-3">Open Disputes: {status.metrics.openDisputes}</div>
            <div className="bg-white/10 rounded-xl p-3">Open Reports: {status.metrics.openReports}</div>
          </div>
        )}
      </section>

      {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm">{message}</div>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("disputes")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "disputes" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Disputes
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "reports" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Reports
        </button>
      </div>

      {activeTab === "disputes" && (
        <section className="space-y-3">
          {disputes.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-slate-600">No open disputes.</div>
          )}

          {disputes.map((dispute) => (
            <article key={dispute.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Dispute {dispute.id}</h2>
                  <p className="text-sm text-slate-600">Reason: {dispute.reason}</p>
                  <p className="text-sm text-slate-600">Seller: @{dispute.seller?.pseudonym}</p>
                  <p className="text-sm text-slate-600">Buyer: @{dispute.buyer?.pseudonym}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">{dispute.status}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleResolveDispute(dispute.id, "complete-trade")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  Complete Trade
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveDispute(dispute.id, "cancel-trade")}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                >
                  Cancel Trade
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveDispute(dispute.id, "keep-disputed")}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold"
                >
                  Keep Disputed
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === "reports" && (
        <section className="space-y-3">
          {reports.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-slate-600">No reports found.</div>
          )}

          {reports.map((report) => (
            <article key={report._id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Report {report._id}</h2>
                  <p className="text-sm text-slate-600">Reporter: @{report.reporter?.pseudonym}</p>
                  <p className="text-sm text-slate-600">Reported User: @{report.reportedUser?.pseudonym}</p>
                  <p className="text-sm text-slate-600">Reason: {report.reason}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{report.status}</span>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleResolveReport(report._id, "reviewed")}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold"
                >
                  Mark Reviewed
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveReport(report._id, "resolved")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={() => handleResolveReport(report._id, "dismissed")}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
