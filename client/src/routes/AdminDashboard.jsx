import { useCallback, useEffect, useState } from "react";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const AdminDashboard = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("disputes");
  const [status, setStatus] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [statusData, disputeData, reportData, auditData, usersData, postsData] = await Promise.all([
        api.getAdminStatus(token),
        api.listAdminDisputes(token),
        api.listAdminReports(token),
        api.listAdminAuditLogs(token).catch(() => ({ logs: [] })),
        api.listAdminUsers(token),
        api.listPosts(),
      ]);

      setStatus(statusData);
      setDisputes(disputeData.disputes || []);
      setReports(reportData.reports || []);
      setAuditLogs(auditData.logs || []);
      setUsers(usersData.users || []);
      setPosts(postsData || []);
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

  const handleToggleRole = async (userId, currentRole) => {
    try {
      const nextRole = currentRole === "staff" ? "user" : "staff";
      if (!window.confirm(`Are you sure you want to change this user to ${nextRole}?`)) return;
      await api.toggleAdminUserRole(userId, nextRole, token);
      setMessage(`User role successfully changed to ${nextRole}`);
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to update user role");
    }
  };

  const handleToggleBan = async (userId, currentStatus) => {
    try {
      const isBanned = currentStatus !== "banned";
      await api.toggleAdminUserBan(userId, isBanned, token);
      setMessage(`User successfully ${isBanned ? "banned" : "unbanned"}`);
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to update user status");
    }
  };

  const handleRotateKeys = async (userId) => {
    if (!window.confirm("CRITICAL: Are you sure you want to forcibly rotate this user's cryptographic keys? This action will archive their current active keys.")) return;
    try {
      await api.rotateAdminUserKeys({ ownerId: userId, domain: "user-profile", reason: "Admin forced rotation from dashboard" }, token);
      setMessage("Keys successfully rotated for user");
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to rotate keys");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to permanently delete this post?")) return;
    try {
      await api.deletePost(postId, token);
      setMessage("Post successfully deleted");
      await load();
    } catch (requestError) {
      setMessage(requestError.message || "Failed to delete post");
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
        {status?.actor?.role === "admin" && (
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${
              activeTab === "audit" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Audit Logs
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "users" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Users
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            activeTab === "posts" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          Posts
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
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <UserAvatar name={dispute.seller?.pseudonym} size="xs" />
                    <p>Seller: @{dispute.seller?.pseudonym}</p>
                  </div>
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <UserAvatar name={dispute.buyer?.pseudonym} size="xs" />
                    <p>Buyer: @{dispute.buyer?.pseudonym}</p>
                  </div>
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
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <UserAvatar name={report.reporter?.pseudonym} size="xs" />
                    <p>Reporter: @{report.reporter?.pseudonym}</p>
                  </div>
                  <div className="text-sm text-slate-600 flex items-center gap-2">
                    <UserAvatar name={report.reportedUser?.pseudonym} size="xs" />
                    <p>Reported User: @{report.reportedUser?.pseudonym}</p>
                  </div>
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

      {status?.actor?.role === "admin" && activeTab === "audit" && (
        <section className="space-y-3">
          {auditLogs.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-slate-600">No audit logs found.</div>
          )}

          {auditLogs.map((log) => (
            <article key={log._id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <UserAvatar name={log.actor?.pseudonym} size="xs" />
                  <span className="font-semibold text-slate-900">@{log.actor?.pseudonym}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{log.actor?.role}</span>
                </div>
                <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="px-2 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 uppercase">{log.action}</span>
                <span className="text-sm text-slate-700 ml-3">{log.details}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === "users" && (
        <section className="space-y-3">
          {users.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-slate-600">No users found.</div>
          )}

          {users.map((user) => (
            <article key={user._id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <UserAvatar name={user.pseudonym} size="md" />
                  <div>
                    <h2 className="font-semibold text-slate-900">@{user.pseudonym}</h2>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{user.role}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${user.accountStatus === 'banned' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} capitalize`}>
                        {user.accountStatus}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {status?.actor?.role === "admin" && user.role !== "admin" && (
                    <button
                      onClick={() => handleToggleRole(user._id, user.role)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {user.role === "staff" ? "Demote to User" : "Promote to Staff"}
                    </button>
                  )}
                  {user.role !== "admin" && (
                    <button
                      onClick={() => handleToggleBan(user._id, user.accountStatus)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        user.accountStatus === "banned" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"
                      }`}
                    >
                      {user.accountStatus === "banned" ? "Unban User" : "Ban User"}
                    </button>
                  )}
                  {status?.actor?.role === "admin" && user.role !== "admin" && (
                    <button
                      onClick={() => handleRotateKeys(user._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Rotate Keys
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {activeTab === "posts" && (
        <section className="space-y-3">
          {posts.length === 0 && (
            <div className="p-8 bg-white border border-slate-200 rounded-2xl text-slate-600">No posts found.</div>
          )}

          {posts.map((post) => (
            <article key={post._id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {post.img ? (
                    <img src={post.img} alt="" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-100" />
                  )}
                  <div>
                    <h2 className="font-semibold text-slate-900">{post.title || "Untitled Post"}</h2>
                    <p className="text-xs text-slate-500">By @{post.seller?.pseudonym || "unknown"} • Status: {post.market?.status || "open"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeletePost(post._id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Delete Post
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
