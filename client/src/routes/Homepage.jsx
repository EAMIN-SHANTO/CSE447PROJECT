import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CryptoStatusBadge from "../components/CryptoStatusBadge";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";
import bg1 from "../img/bg1.webp";
import linePattern from "../img/lineprattern.png";
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
    <div className="min-h-screen bg-white font-sans text-gray-900">
      
      <div className="relative bg-black text-white w-full border-b border-gray-800 overflow-hidden">
        
        {/* Left-Side Line Pattern Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none flex justify-start">
          <div className="relative w-full md:w-1/2 h-full">
            <img
              src={linePattern}
              alt=""
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/50 to-black" />
          </div>
        </div>

        {/* Right-Side Hero Image */}
        <div className="absolute inset-0 z-0 pointer-events-none flex justify-end">
          <div className="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img
              src={bg1}
              alt="Campus Marketplace"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-40" />
          </div>
        </div>

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight drop-shadow-md">
              TradeShield Marketplace
            </h1>
            <p className="mt-5 text-lg text-gray-300 drop-shadow">
              The premier platform for student-to-student commerce. Secure, verified, and strictly peer-to-peer.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              {isAuthenticated ? (
                <Link
                  to="/posts/new"
                  className="px-6 py-3 bg-white text-black text-sm font-bold rounded shadow-lg hover:bg-gray-100 hover:scale-[1.02] transition-all"
                >
                  List an Item
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="px-6 py-3 bg-white text-black text-sm font-bold rounded hover:bg-gray-100 transition-colors"
                >
                  Sign Up to Sell
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-10">
          
          <aside className="w-full lg:w-64 shrink-0">
            <div className="sticky top-6 space-y-8">
              
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Search</h3>
                <div className="relative">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search items..."
                    className="w-full bg-gray-50 border border-gray-200 text-sm rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Sort By</h3>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-sm rounded-md py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="oldest">Oldest First</option>
                  <option value="bidding-soon">Ending Soon</option>
                  <option value="title-asc">Title: A to Z</option>
                  <option value="title-desc">Title: Z to A</option>
                </select>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Availability</h3>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={showLocked}
                      onChange={() => setShowLocked((prev) => !prev)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded border border-gray-300 bg-white peer-checked:bg-black peer-checked:border-black transition-colors" />
                    <svg className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-black transition-colors">
                    Include Locked Listings
                  </span>
                </label>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Market Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Total Listings</span>
                    <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{visiblePosts.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Open & Active</span>
                    <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{openCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Locked Deals</span>
                    <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{lockedCount}</span>
                  </div>
                </div>
              </div>

            </div>
          </aside>

          <main className="flex-1 min-w-0">
            
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Current Listings</h2>
              <span className="text-sm font-medium text-gray-500">{visiblePosts.length} Results</span>
            </div>

            {loading && (
              <div className="py-20 flex justify-center">
                <div className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Catalog...</div>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-md text-sm font-medium mb-8">
                {error}
              </div>
            )}

            {!loading && visiblePosts.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-500 font-medium text-lg">No items match your criteria.</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query.</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-10 sm:gap-x-6">
              {paginatedPosts.map((post) => (
                <Link key={post._id} to={`/posts/${post.slug}`} className="group flex flex-col cursor-pointer">
                  
                  <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden mb-4 border border-gray-200">
                    {post.img ? (
                      <img
                        src={post.img}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-300 transform -rotate-45">No Image</span>
                      </div>
                    )}
                    
                    <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
                      <span className="bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                        {post.category}
                      </span>
                      {post.market?.isLocked && (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col flex-1">
                    <div className="flex flex-wrap gap-1 mb-2">
                      <CryptoStatusBadge label="Encrypted" />
                      <CryptoStatusBadge label={post.crypto?.integrity === "verified" ? "Verified" : "Tamper Alert"} />
                    </div>
                    
                    <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-1 group-hover:underline decoration-2 underline-offset-2">
                      {post.title}
                    </h3>
                    
                    <div className="text-xs text-gray-500 mb-3 line-clamp-1">
                      {post.desc}
                    </div>

                    <div className="mt-auto flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-900">@{post.seller?.pseudonym}</span>
                        <span className="text-[10px] font-bold text-amber-500">★ {Number(post.seller?.trust?.ratingAverage ?? 5).toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500 uppercase tracking-wider">Ends</span>
                        <span className="font-semibold text-gray-900">{new Date(post.market?.biddingEndsAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {visiblePosts.length > 0 && (
              <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-500">
                  Showing page {Math.min(page, totalPages)} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            
          </main>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
