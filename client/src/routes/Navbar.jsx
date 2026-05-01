import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../context/useAuth";
import viShape from "../img/vishape.svg";

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
            { path: "/inbox", label: "Inbox" },
            { path: "/profile", label: "Profile" },
            ...(["admin", "staff"].includes(profile?.role) ? [{ path: "/admin", label: profile?.role === "admin" ? "Admin" : "Staff" }] : []),
          ]
        : []),
    ],
    [isAuthenticated, profile?.role]
  );

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm" : "bg-white border-b border-gray-200"
      }`}
    >
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.06]"
        style={{ 
          backgroundImage: `url(${viShape})`, 
          backgroundSize: "400px", 
          backgroundRepeat: "repeat",
          backgroundPosition: "center"
        }}
      />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 md:h-20 flex items-center justify-between gap-4">
          <Link to="/" className="font-extrabold tracking-tight text-xl md:text-2xl text-black hover:opacity-80 transition-opacity">
            TRADESHIELD
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {baseLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-bold transition-all ${
                  isActive(item.path) 
                    ? "text-black border-b-2 border-black py-2" 
                    : "text-gray-500 hover:text-black py-2 border-b-2 border-transparent"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-5">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-black transition-colors">
                  Log In
                </Link>
                <Link to="/register" className="px-5 py-2.5 text-sm font-bold bg-black text-white rounded-md hover:bg-gray-900 transition-colors shadow-sm">
                  Register
                </Link>
              </>
            )}
            {isAuthenticated && (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <UserAvatar name={profile?.pseudonym} size="sm" />
                  <div className="flex flex-col leading-none">
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Seller</span>
                     <span className="text-sm text-black font-extrabold">@{profile?.pseudonym}</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden p-2 -mr-2 text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} />
            </svg>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 shadow-xl absolute top-full left-0 w-full max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {isAuthenticated && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <UserAvatar name={profile?.pseudonym} size="sm" />
                <div className="flex flex-col leading-none">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</span>
                   <span className="text-base text-black font-extrabold">@{profile?.pseudonym}</span>
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-1">
              {baseLinks.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block px-4 py-3.5 rounded-lg text-sm font-bold transition-colors ${
                    isActive(item.path) ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="pt-6 border-t border-gray-100 flex flex-col gap-3">
              {!isAuthenticated && (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3.5 border border-gray-200 rounded-lg text-sm font-bold text-black hover:bg-gray-50 transition-colors"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-3.5 bg-black text-white rounded-lg text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm"
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
                  className="w-full text-center px-4 py-3.5 border border-red-200 rounded-lg text-sm font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
