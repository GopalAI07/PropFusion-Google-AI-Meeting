import { Link } from 'react-router-dom';
import { Video, UserCircle2 } from 'lucide-react';

/**
 * Navbar for the public Login / Register pages.
 * Mirrors the main app Navbar (same gradient bar, logo lockup, shadow/border)
 * for brand continuity, but since no one is signed in yet, the right-hand
 * "user profile" slot shows a generic placeholder instead of real account data.
 */
export default function AuthNavbar() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center border-b shadow-lg"
      style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 40%, #1e3a5f 80%, #0f2d5c 100%)',
        borderColor: 'rgba(99,102,241,0.3)',
        boxShadow: '0 4px 24px rgba(49,46,129,0.5)',
      }}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">

        {/* Left: Brand */}
        <Link to="/login" className="group flex items-center gap-3">
          <div
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2, #2563eb)' }}
          >
            <Video className="w-5 h-5 text-white" />
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-indigo-900 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg text-white leading-tight tracking-tight">
              AI{' '}
              <span
                className="font-black"
                style={{ background: 'linear-gradient(90deg,#6ee7b7,#67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Meeting Hub
              </span>
            </span>
            <span className="text-[9px] font-extrabold tracking-[0.2em] uppercase text-emerald-300">
              AI-Powered Collaboration
            </span>
          </div>
        </Link>

        {/* Right: User profile placeholder (not signed in yet) */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md ring-2 ring-white/20"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)' }}
          >
            <UserCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-extrabold text-white leading-tight">
              User's Profile
            </span>
            <span className="text-[10px] font-semibold text-indigo-200">
              Not signed in
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
