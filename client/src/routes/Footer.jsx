import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-3">
        <div>
          <p className="font-bold text-slate-900">CSE447 Secure Campus Marketplace</p>
          <p className="text-sm text-slate-600">Cryptography-first trading for BRACU students.</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-600 hover:text-slate-900 font-medium">
            Feed
          </Link>
          <Link to="/my-listings" className="text-slate-600 hover:text-slate-900 font-medium">
            My Listings
          </Link>
          <Link to="/my-bids" className="text-slate-600 hover:text-slate-900 font-medium">
            My Bids
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;