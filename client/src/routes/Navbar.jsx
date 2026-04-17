import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";

const Navbar = () => {
  const { pathname } = useLocation();
  const { isAuthenticated, profile, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const baseLinks = useMemo(
    () => [
      { path: "/", label: "Feed" },
      ...(isAuthenticated
        ? [
            { path: "/posts/new", label: "Create" },
            { path: "/my-listings", label: "My Listings" },
            { path: "/my-bids", label: "My Bids" },
            { path: "/profile", label: "Profile" },
            ...(profile?.role === "admin" ? [{ path: "/admin", label: "Admin" }] : []),
          ]
        : []),
    ],
    [isAuthenticated, profile?.role]
  );

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? "bg-white/95 backdrop-blur border-b border-slate-200" : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-20 flex items-center justify-between gap-4">
          <Link to="/" className="font-black tracking-tight text-2xl text-slate-900">
            BRACU TradeShield
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {baseLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(item.path) ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg">
                  Log In
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                  Register
                </Link>
              </>
            )}
            {isAuthenticated && (
              <>
                <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-slate-200 bg-slate-50">
                  <UserAvatar name={profile?.pseudonym} size="sm" />
                  <span className="text-sm text-slate-700 pr-1 font-medium">@{profile?.pseudonym}</span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden p-2 rounded-lg border border-slate-300 text-slate-700"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2">
          {isAuthenticated && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
              <UserAvatar name={profile?.pseudonym} size="sm" />
              <p className="text-sm font-medium text-slate-700">@{profile?.pseudonym}</p>
            </div>
          )}

          {baseLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-semibold ${
                isActive(item.path) ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {!isAuthenticated && (
            <>
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Log In
              </Link>
              <Link
                to="/register"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600"
              >
                Register
              </Link>
            </>
          )}

          {isAuthenticated && (
            <button
              type="button"
              onClick={async () => {
                await logout();
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600"
            >
              Logout
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
