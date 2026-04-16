import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const footerLinks = {
    Learn: [
      { label: 'Get Started', path: '/get-started' },
      { label: 'Interactive Learning', path: '/interactive-learning' },
      { label: 'Take Quiz', path: '/quiz' },
      { label: 'Resources', path: '/resources' }
    ],
    Community: [
      { label: 'Forums', path: '/forums' },
      { label: 'Events', path: '/events' },
      { label: 'Mentorship', path: '/mentorship' },
      { label: 'Blog', path: '/blog' }
    ],
    Company: [
      { label: 'About Us', path: '/about' },
      { label: 'Contact', path: '/contact' },
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' }
    ],
    Connect: [
      { label: 'Twitter', path: 'https://twitter.com' },
      { label: 'LinkedIn', path: 'https://linkedin.com' },
      { label: 'GitHub', path: 'https://github.com' },
      { label: 'Discord', path: 'https://discord.com' }
    ]
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-3 group mb-6">
              <div className="relative">
                <img 
                  src="" 
                  alt="logo" 
                  className="h-14 w-14 brightness-200"
                />
              </div>
              <span className="text-2xl font-bold text-white">
                footer
              </span>
            </Link>
            <p className="text-gray-400 mb-6">
              Empowering women in cybersecurity through education, 
              community, and practical experience.
            </p>
            {/* Newsletter */}
            <div>
              <h4 className="font-medium text-white mb-3">Stay Updated</h4>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  className="bg-gray-800 rounded-lg px-4 py-2 text-sm flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="col-span-1">
              <h3 className="font-semibold text-white mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link 
                      to={link.path}
                      className="text-gray-400 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-400">
              © {new Date().getFullYear()} x. All rights reserved.
            </div>
            <div className="flex gap-6">
              {/* Social Icons */}
              {[
                { icon: "twitter", path: "https://twitter.com" },
                { icon: "linkedin", path: "https://linkedin.com" },
                { icon: "github", path: "https://github.com" },
                { icon: "discord", path: "https://discord.com" }
              ].map((social) => (
                <a
                  key={social.icon}
                  href={social.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">{social.icon}</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    {/* You can add specific SVG paths for each social icon */}
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22C6.486 22 2 17.514 2 12S6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 