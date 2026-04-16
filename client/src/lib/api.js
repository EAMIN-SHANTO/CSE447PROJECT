const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const parseResponse = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "object" && payload?.message ? payload.message : "Request failed";
    throw new Error(message);
  }

  return payload;
};

const request = async (path, { method = "GET", body, token, withCredentials = false } = {}) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: withCredentials ? "include" : "same-origin",
  });

  return parseResponse(response);
};

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  verify2FA: (payload, withCredentials = false) =>
    request("/auth/verify-2fa", { method: "POST", body: payload, withCredentials }),
  refresh: (withCredentials = false) => request("/auth/refresh", { method: "POST", withCredentials }),
  logout: (withCredentials = false) => request("/auth/logout", { method: "POST", withCredentials }),

  getProfile: (token) => request("/profiles/me", { token }),
  updateProfile: (payload, token) => request("/profiles/me", { method: "PATCH", body: payload, token }),
  reportUser: (payload, token) => request("/profiles/report", { method: "POST", body: payload, token }),

  listPosts: () => request("/posts"),
  getPostBySlug: (slug) => request(`/posts/${slug}`),
  createPost: (payload, token) => request("/posts", { method: "POST", body: payload, token }),
  updatePost: (postId, payload, token) => request(`/posts/${postId}`, { method: "PATCH", body: payload, token }),
  deletePost: (postId, token) => request(`/posts/${postId}`, { method: "DELETE", token }),

  listCommentsByPost: (postId) => request(`/comments/post/${postId}`),
  createComment: (payload, token) => request("/comments", { method: "POST", body: payload, token }),

  createBid: (payload, token) => request("/bids", { method: "POST", body: payload, token }),
  listBidsByPost: (postId, token) => request(`/bids/post/${postId}`, { token }),
  acceptBid: (bidId, payload, token) => request(`/bids/${bidId}/accept`, { method: "POST", body: payload, token }),
  getTransaction: (bidId, token) => request(`/bids/${bidId}/transaction`, { token }),
  confirmTransaction: (bidId, payload, token) =>
    request(`/bids/${bidId}/confirm`, { method: "POST", body: payload, token }),

  getAdminStatus: (token) => request("/admin/status", { token }),
  listAdminDisputes: (token) => request("/admin/disputes", { token }),
  resolveAdminDispute: (disputeId, payload, token) =>
    request(`/admin/disputes/${disputeId}`, { method: "PATCH", body: payload, token }),
  listAdminReports: (token) => request("/admin/reports", { token }),
  resolveAdminReport: (reportId, payload, token) =>
    request(`/admin/reports/${reportId}`, { method: "PATCH", body: payload, token }),
};

export { API_BASE };
