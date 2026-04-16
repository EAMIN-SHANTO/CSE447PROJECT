import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const Homepage = () => {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLocked, setShowLocked] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const response = await api.listPosts();
        setPosts(response || []);
        setError("");
      } catch (requestError) {
        setError(requestError.message || "Failed to load feed");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const visiblePosts = useMemo(() => {
    const filteredByLock = showLocked ? posts : posts.filter((post) => !post.market?.isLocked);
    const normalized = query.trim().toLowerCase();

    const filtered = filteredByLock.filter((post) => {
      if (!normalized) {
        return true;
      }

      const haystack = [
        post.title,
        post.desc,
        post.category,
        post.seller?.pseudonym,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (sortBy === "title-asc") {
        return String(a.title || "").localeCompare(String(b.title || ""));
      }

      if (sortBy === "title-desc") {
        return String(b.title || "").localeCompare(String(a.title || ""));
      }

      if (sortBy === "bidding-soon") {
        return new Date(a.market?.biddingEndsAt).getTime() - new Date(b.market?.biddingEndsAt).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return sorted;
  }, [posts, query, showLocked, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / pageSize));

  const paginatedPosts = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    return visiblePosts.slice(start, start + pageSize);
  }, [page, pageSize, totalPages, visiblePosts]);

  useEffect(() => {
    setPage(1);
  }, [query, showLocked, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 p-6 md:p-8 text-white">
        <p className="text-xs uppercase tracking-[0.24em] text-teal-200 mb-2">CSE447 Cryptography Project</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Secure Campus Marketplace Feed</h1>
        <p className="text-slate-200 mt-3 max-w-3xl">
          Listings are encrypted at rest, integrity-checked with MAC, and only tradable through controlled bid locking
          plus dual confirmation.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowLocked((prev) => !prev)}
            className="px-4 py-2 rounded-lg bg-white/10 text-white border border-white/25 text-sm font-semibold"
          >
            {showLocked ? "Hide Locked Listings" : "Show Locked Listings"}
          </button>
          {isAuthenticated && (
            <Link to="/posts/new" className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold">
              Create Listing
            </Link>
          )}
          {!isAuthenticated && (
            <Link to="/register" className="px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-semibold">
              Register with BRACU Email
            </Link>
          )}
        </div>

        <div className="mt-4 grid md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, description, category, seller"
            className="px-3 py-2 rounded-lg text-sm text-slate-800"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="px-3 py-2 rounded-lg text-sm text-slate-800"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="bidding-soon">Sort: Bidding Ends Soon</option>
            <option value="title-asc">Sort: Title A-Z</option>
            <option value="title-desc">Sort: Title Z-A</option>
          </select>
          <div className="text-sm flex items-center text-slate-200">
            Results: {visiblePosts.length}
          </div>
        </div>
      </section>

      {loading && <div className="text-center text-slate-600 py-8">Loading encrypted listings...</div>}
      {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

      <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {!loading && visiblePosts.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-600">
            No listings available.
          </div>
        )}

        {paginatedPosts.map((post) => (
          <article key={post._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {post.img && (
              <img
                src={post.img}
                alt={post.title}
                className="h-44 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}

            <div className="p-5">
              <div className="flex justify-between items-start gap-3">
                <h2 className="text-lg font-semibold text-slate-900 leading-tight">{post.title}</h2>
                <div className="flex flex-wrap gap-1 justify-end">
                  <CryptoStatusBadge label="Encrypted" />
                  <CryptoStatusBadge label={post.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
                  {post.market?.isLocked && <CryptoStatusBadge label="Locked" />}
                </div>
              </div>

              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{post.desc}</p>

              <div className="mt-4 text-xs text-slate-500 space-y-1">
                <p>Seller: @{post.seller?.pseudonym}</p>
                <p>Status: {post.market?.status}</p>
                <p>Bidding Ends: {new Date(post.market?.biddingEndsAt).toLocaleString()}</p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">{post.category}</span>
                <Link to={`/posts/${post.slug}`} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                  View Details
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      {visiblePosts.length > 0 && (
        <div className="flex items-center justify-center gap-2">
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

export default Homepage;
