import { useEffect, useState } from "react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const MyBids = () => {
  const { token, profile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const posts = await api.listPosts();

        const bidResponses = await Promise.all(
          (posts || []).map(async (post) => {
            try {
              const bidData = await api.listBidsByPost(post._id, token);
              return (bidData.bids || []).map((bid) => ({ post, bid }));
            } catch {
              return [];
            }
          })
        );

        const flat = bidResponses.flat().filter(({ bid }) => bid?.bidder?.pseudonym === profile?.pseudonym);
        setEntries(flat);
      } catch (requestError) {
        setError(requestError.message || "Failed to load bids");
      } finally {
        setLoading(false);
      }
    };

    if (token && profile?.pseudonym) {
      load();
    } else {
      setEntries([]);
      setLoading(false);
    }
  }, [token, profile?.pseudonym]);

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = entries.filter(({ post, bid }) => {
      if (!normalized) {
        return true;
      }

      const haystack = [post?.title, bid?.seller?.pseudonym, bid?.status, bid?.offerAmount]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.bid.createdAt).getTime() - new Date(b.bid.createdAt).getTime();
      }

      if (sortBy === "amount-desc") {
        return Number(b.bid.offerAmount || 0) - Number(a.bid.offerAmount || 0);
      }

      if (sortBy === "amount-asc") {
        return Number(a.bid.offerAmount || 0) - Number(b.bid.offerAmount || 0);
      }

      if (sortBy === "status") {
        return String(a.bid.status || "").localeCompare(String(b.bid.status || ""));
      }

      return new Date(b.bid.createdAt).getTime() - new Date(a.bid.createdAt).getTime();
    });
  }, [entries, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, page, pageSize, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, sortBy]);

  if (loading) {
    return <div className="p-8 text-center text-slate-600">Loading my bids...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">My Bids</h1>

      {error && <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search my bids"
          className="border border-slate-300 rounded-xl p-2.5 text-sm"
        />
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="border border-slate-300 rounded-xl p-2.5 text-sm"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="amount-desc">Sort: Amount High-Low</option>
          <option value="amount-asc">Sort: Amount Low-High</option>
          <option value="status">Sort: Status</option>
        </select>
        <div className="text-sm text-slate-600 flex items-center">Results: {filteredEntries.length}</div>
      </div>

      <div className="grid gap-4">
        {filteredEntries.length === 0 && (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-slate-600">No bids found.</div>
        )}

        {paginatedEntries.map(({ post, bid }) => (
          <article key={bid._id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{post.title}</h2>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <UserAvatar name={bid.seller?.pseudonym} size="xs" />
                  <p>Seller @{bid.seller?.pseudonym}</p>
                </div>
                <p className="text-sm text-slate-700 mt-1">Offer: BDT {bid.offerAmount}</p>
                <p className="text-sm text-slate-700">Status: {bid.status}</p>
              </div>
              <div className="flex gap-2">
                <CryptoStatusBadge label="Encrypted" />
                <CryptoStatusBadge label={bid.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={`/posts/${post.slug}`} className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                View Listing
              </Link>
              {["accepted", "disputed", "completed"].includes(bid.status) && (
                <Link
                  to={`/transactions/${bid._id}`}
                  className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold"
                >
                  Transaction
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      {filteredEntries.length > 0 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-slate-700">
            Page {Math.min(page, totalPages)} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MyBids;
