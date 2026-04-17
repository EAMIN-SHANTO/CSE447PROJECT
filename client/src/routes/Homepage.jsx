import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";
import bg1 from "../img/bg1.webp";
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

  const openCount = visiblePosts.filter((post) => !post.market?.isLocked).length;
  const lockedCount = visiblePosts.filter((post) => post.market?.isLocked).length;

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-blue-50/50 via-white to-white">
      <div className="relative max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                Discover Listings Across Campus
              </h1>
              <p className="text-slate-600 mt-3 max-w-xl">
                Browse trusted student offers, compare active bids, and close deals with a structured transaction flow.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowLocked((prev) => !prev)}
                  className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    showLocked
                      ? "bg-blue-700 border-blue-700 text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {showLocked ? "Hide Locked Listings" : "Show Locked Listings"}
                </button>
                {isAuthenticated && (
                  <Link
                    to="/posts/new"
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Create Listing
                  </Link>
                )}
                {!isAuthenticated && (
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-xl bg-blue-900 text-white text-sm font-semibold hover:bg-blue-950 transition-colors"
                  >
                    Register with BRACU Email
                  </Link>
                )}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
                  <p className="text-2xl font-black text-slate-900">{visiblePosts.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Open</p>
                  <p className="text-2xl font-black text-slate-900">{openCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Locked</p>
                  <p className="text-2xl font-black text-slate-900">{lockedCount}</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[250px]">
              <img
                src={bg1}
                alt="Campus marketplace"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-slate-900/30 via-slate-900/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/35 to-transparent" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
          <div className="grid md:grid-cols-[1fr_auto_auto] gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, description, category, seller"
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 bg-white"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="bidding-soon">Sort: Bidding Ends Soon</option>
              <option value="title-asc">Sort: Title A-Z</option>
              <option value="title-desc">Sort: Title Z-A</option>
            </select>
            <div className="text-sm flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-slate-700 font-semibold border border-slate-200">
              {visiblePosts.length} results
            </div>
          </div>
        </section>

        {loading && <div className="text-center text-slate-600 py-8">Loading listings...</div>}
        {error && <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</div>}

        <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {!loading && visiblePosts.length === 0 && (
            <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-600">
              No listings available.
            </div>
          )}

          {paginatedPosts.map((post) => (
            <article
              key={post._id}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all h-full flex flex-col"
            >
              {post.img && (
                <div className="relative">
                  <img
                    src={post.img}
                    alt={post.title}
                    className="h-48 w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-white/95 text-slate-700 font-semibold border border-slate-200">
                      {post.category}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-3">
                  <h2 className="text-lg font-semibold text-slate-900 leading-tight">{post.title}</h2>
                  <div className="flex flex-wrap gap-1 justify-end">
                    <CryptoStatusBadge label="Encrypted" />
                    <CryptoStatusBadge label={post.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
                    {post.market?.isLocked && <CryptoStatusBadge label="Locked" />}
                  </div>
                </div>

                {!post.img && (
                  <div className="mt-2">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                      {post.category}
                    </span>
                  </div>
                )}

                <p className="text-sm text-slate-600 mt-2 line-clamp-2 min-h-10">{post.desc}</p>

                <div className="mt-4 text-xs text-slate-500 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <UserAvatar name={post.seller?.pseudonym} size="xs" />
                    <p>
                      Seller: <span className="font-semibold text-slate-700">@{post.seller?.pseudonym}</span>
                      {" · "}
                      <span className="font-semibold text-amber-600">
                        ★ {Number(post.seller?.trust?.ratingAverage ?? 5).toFixed(1)} ({Number(post.seller?.trust?.ratingCount || 0)})
                      </span>
                    </p>
                  </div>
                  <p>
                    Status: <span className="font-semibold text-slate-700">{post.market?.status}</span>
                  </p>
                  <p>
                    Bidding Ends:{" "}
                    <span className="font-semibold text-slate-700">
                      {new Date(post.market?.biddingEndsAt).toLocaleString()}
                    </span>
                  </p>
                </div>

                <div className="mt-auto pt-5">
                  <Link
                    to={`/posts/${post.slug}`}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 text-white text-sm font-semibold py-2.5 hover:bg-blue-800 transition-colors"
                  >
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
              className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm disabled:opacity-50"
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
              className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Homepage;
