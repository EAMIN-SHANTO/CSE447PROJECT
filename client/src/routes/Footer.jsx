import { Link } from "react-router-dom";
import iconsBg from "../img/icons.jpg";

const Footer = () => {
  return (
    <footer className="relative mt-auto border-t border-gray-200 bg-white overflow-hidden">
      <div 
        className="absolute inset-x-0 top-0 -bottom-16 z-0 pointer-events-none opacity-[0.25]"
        style={{ 
          backgroundImage: `url(${iconsBg})`, 
          backgroundSize: "100% auto", 
          backgroundRepeat: "no-repeat",
          backgroundPosition: "bottom"
        }}
      />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-white via-white/40 to-transparent" />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          <div className="flex flex-col">
            <Link to="/" className="font-extrabold tracking-tight text-xl text-black hover:opacity-80 transition-opacity w-fit">
              TRADESHIELD
            </Link>
            <p className="mt-3 text-sm text-gray-500 max-w-sm leading-relaxed">
              The premier secure marketplace for students. Listings are encrypted at rest, integrity-checked with MAC, and protected by dual confirmation.
            </p>
          </div>

          <div className="flex flex-col md:items-end justify-start">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">Platform</h4>
            <div className="flex flex-col md:items-end gap-2 text-sm">
              <Link to="/" className="text-gray-500 hover:text-black font-semibold transition-colors">
                Marketplace Feed
              </Link>
              <Link to="/my-listings" className="text-gray-500 hover:text-black font-semibold transition-colors">
                Manage My Listings
              </Link>
              <Link to="/my-bids" className="text-gray-500 hover:text-black font-semibold transition-colors">
                Active Bids
              </Link>
            </div>
          </div>
          
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 font-medium">
            &copy; {new Date().getFullYear()} TradeShield. Secure Peer-to-Peer.
          </p>
          <div className="flex gap-4 text-xs font-medium text-gray-400">
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-gray-600 cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
