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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-sm">Loading my bids...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 space-y-8">
        
        {/* Header Section */}
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mb-2">Transactions</p>
          <h1 className="text-3xl font-extrabold text-black">My Bids</h1>
          <p className="text-sm text-gray-500 mt-2 max-w-lg">
            Track your active offers, accepted deals, and encrypted transaction history.
          </p>
        </section>

        {error && (
          <div className="px-6 py-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm font-bold shadow-sm">
            {error}
          </div>
        )}

        {/* Filter Bar */}
        <section className="grid md:grid-cols-[1fr_auto_auto] gap-4 items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search my bids..."
            className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors shadow-sm"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="w-full md:w-48 bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-colors shadow-sm appearance-none font-semibold cursor-pointer"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
            <option value="status">Sort: Status</option>
          </select>
          <div className="px-5 py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-600 shadow-sm whitespace-nowrap">
            Results: {filteredEntries.length}
          </div>
        </section>

        {/* Grid of Bids */}
        <div className="space-y-4">
          {filteredEntries.length === 0 && (
            <div className="p-12 bg-white rounded-2xl border border-gray-200 text-gray-500 font-bold text-center">
              No bids found.
            </div>
          )}

          {paginatedEntries.map(({ post, bid }) => {
            let statusColor = "bg-gray-100 text-gray-600 border-gray-200";
            if (bid.status === "completed" || bid.status === "accepted") statusColor = "bg-green-50 text-green-700 border-green-200";
            if (bid.status === "rejected" || bid.status === "disputed") statusColor = "bg-red-50 text-red-700 border-red-200";
            if (bid.status === "pending") statusColor = "bg-yellow-50 text-yellow-700 border-yellow-200";

            return (
              <article key={bid._id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md">
                
                {/* Left side: Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-extrabold text-black truncate">{post.title}</h2>
                    <div className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${statusColor}`}>
                      {bid.status}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                      <UserAvatar name={bid.seller?.pseudonym} size="xs" />
                      <p className="text-xs font-bold text-gray-600">Seller @{bid.seller?.pseudonym}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Offer Amount</p>
                      <p className="text-base font-extrabold text-black">BDT {bid.offerAmount}</p>
                    </div>
                  </div>
                </div>

                {/* Right side: Actions & Badges */}
                <div className="flex flex-col md:items-end gap-4 shrink-0 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                  <div className="flex gap-2">
                    <CryptoStatusBadge label="Encrypted" />
                    <CryptoStatusBadge label={bid.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Link 
                      to={`/posts/${post.slug}`} 
                      className="flex-1 md:flex-none text-center px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 hover:text-black transition-colors"
                    >
                      View Listing
                    </Link>
                    {["accepted", "disputed", "completed"].includes(bid.status) && (
                      <Link
                        to={`/transactions/${bid._id}`}
                        className="flex-1 md:flex-none text-center px-5 py-2.5 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm"
                      >
                        Transaction
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Pagination */}
        {filteredEntries.length > 0 && (
          <div className="flex items-center justify-center gap-4 pt-6">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-black text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-white shadow-sm"
            >
              Previous
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Page {Math.min(page, totalPages)} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-black text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:hover:bg-white shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyBids;
