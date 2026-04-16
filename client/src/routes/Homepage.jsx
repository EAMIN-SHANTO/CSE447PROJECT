import React from 'react';
import { Link } from "react-router-dom";

// -- Svg Icon Components (Based on Heroicons style) --

const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.253-.208-2.457-.597-3.587A11.959 11.959 0 0 1 12 2.714Z" />
  </svg>
);

const IconIncognito = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.878 9.878" />
  </svg>
);

const IconHandshake = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
);

const IconKey = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </svg>
);

const IconUserGroup = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
);


const Homepage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0c10] text-slate-300 font-sans">
      {/* Hero Section */}
      <section className="relative pt-28 pb-24 overflow-hidden border-b border-slate-800/50">
        {/* Subtle Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v2h2v-4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v2h2v-4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            {/* Main Heading */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-950/30 text-teal-400 text-xs font-medium tracking-wider mb-2">
                <IconKey />
                SECURE UNIVERSITY PROTOCOL
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-white leading-tight">
                Peer-to-Peer Trading
                <span className="block text-slate-400">
                  With Absolute Cryptographic Trust.
                </span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
                A verified campus-only marketplace eliminating social media scams through custom RSA/ECC encryption and offline verification.
              </p>
            </div>

            {/* CTA Buttons - Removed Heavy Glows */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pt-6">
              <Link 
                to="/marketplace" 
                className="px-8 py-3.5 bg-teal-600 text-white rounded font-semibold text-base hover:bg-teal-500 transition-colors duration-200"
              >
                Access Marketplace
              </Link>
              <Link 
                to="/register" 
                className="px-8 py-3.5 bg-transparent text-slate-200 border border-slate-700 rounded font-semibold text-base hover:border-slate-500 hover:bg-slate-800/30 transition-all duration-200"
              >
                Initialize Secure Profile
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-[#0d1015]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-teal-500 mb-2">System Integrity</h2>
            <p className="text-4xl font-bold text-white tracking-tight">Built on Zero-Trust Principles</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 - Icons replaced, glows removed */}
            <div className="bg-[#0a0c10] border border-slate-800 rounded-lg p-8 hover:border-slate-700 transition-colors duration-300">
              <div className="text-teal-500 mb-6">
                <IconIncognito />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Crypt anonymity</h3>
              <p className="text-slate-400 leading-relaxed text-sm font-normal">
                User identities are obfuscated publically. Your true credentials remain encrypted in storage and are only revealed during the finalized offline handshake.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#0a0c10] border border-slate-800 rounded-lg p-8 hover:border-slate-700 transition-colors duration-300">
              <div className="text-teal-500 mb-6">
                <IconShield />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Verified Integrity</h3>
              <p className="text-slate-400 leading-relaxed text-sm font-normal">
                Every listing is signed using custom Message Authentication Codes (CBC-MAC). The system mathematically ensures data has not been tampered with.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#0a0c10] border border-slate-800 rounded-lg p-8 hover:border-slate-700 transition-colors duration-300">
              <div className="text-teal-500 mb-6">
                <IconHandshake />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Secure Handover</h3>
              <p className="text-slate-400 leading-relaxed text-sm font-normal">
                Transactions lock automatically. Final exchange requires a dual-factor offline code verification to prevent standard marketplace "no-show" or "payment reversal" scams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Re-styled for professional look */}
      <section className="py-24 relative border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20 max-w-xl mx-auto">
            <h2 className="text-4xl font-bold text-white tracking-tight mb-4">The Protocol</h2>
            <p className="text-lg text-slate-400 font-normal">A simplified workflow backed by complex mathematical proof.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            
            <div className="relative space-y-4 border-l-2 border-slate-800 pl-8 pt-2">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[#0a0c10] border-2 border-teal-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white tracking-tight">1. Authenticate & Key Gen</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-normal">Register with university email. 2FA is mandatory. The system generates and secures your unique RSA/ECC key pairs from scratch.</p>
            </div>

            <div className="relative space-y-4 border-l-2 border-slate-800 pl-8 pt-2">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[#0a0c10] border-2 border-slate-700 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white tracking-tight">2. List & Bid</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-normal">Create listings anonymously. Others submit encrypted bids. All critical data is automatically encrypted before database insertion.</p>
            </div>

            <div className="relative space-y-4 border-l-2 border-teal-900 pl-8 pt-2">
                <div className="absolute -left-[11px] top-0 w-5 h-5 bg-[#0a0c10] border-2 border-teal-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-white tracking-tight">3. Verify & Exchange</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-normal">Upon timer expiry, meet offline. Use the generated Verification Code to unlock the transaction and finalize the trade safely.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Professional gradient, no glow */}
      <section className="py-20 mt-auto border-t border-slate-800/50 bg-[#0d1015]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 border border-slate-800 p-10 rounded-xl bg-[#0a0c10]">
            <div className="text-center md:text-left flex-1 space-y-2">
                <div className="text-teal-500 mb-3 flex justify-center md:justify-start">
                    <IconUserGroup />
                </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Ready to trade securely?
              </h2>
              <p className="text-base text-slate-400 max-w-md font-normal">
                Initialize your secure profile today and join the trusted campus student marketplace community.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link 
                to="/register" 
                className="inline-block px-8 py-3.5 bg-teal-600 text-white rounded font-semibold text-base hover:bg-teal-500 transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Homepage;