import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../redux/slices/uiSlice';
import { useAuth } from '../context/AuthContext';
import { getInitials, stringToColor } from '../utils/helpers';
import { Video, LogOut, ChevronDown, Menu, Shield } from 'lucide-react';

export default function Navbar({ onMenuClick }) {
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSidebarToggle = () => {
    if (onMenuClick) onMenuClick();
    else dispatch(toggleSidebar());
  };

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

        {/* Left: Hamburger + Brand */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSidebarToggle}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/dashboard" className="group flex items-center gap-3">
            {/* Logo icon */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl shadow-lg group-hover:scale-105 transition-transform duration-300"
              style={{ background: 'linear-gradient(135deg, #059669, #0891b2, #2563eb)' }}>
              <Video className="w-5 h-5 text-white" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-indigo-900 animate-pulse" />
            </div>
            {/* Brand text */}
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
        </div>

        {/* Right: User profile */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 backdrop-blur transition-all duration-200 group"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-md ring-2 ring-white/20"
              style={{ backgroundColor: stringToColor(user?.email || 'User') }}
            >
              {getInitials(user?.full_name || user?.username || 'User')}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-extrabold text-white max-w-[120px] truncate leading-tight">
                {user?.full_name || user?.username || 'User'}
              </span>
              <span className="text-[10px] font-semibold text-indigo-200 max-w-[120px] truncate">
                {user?.email || 'Active Member'}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-indigo-200 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-3xl overflow-hidden shadow-2xl border border-indigo-200/20 animate-modal-pop z-50"
              style={{ background: 'linear-gradient(160deg,#1e1b4b,#312e81)' }}
            >
              {/* Profile header inside dropdown */}
              <div className="px-5 py-4 relative overflow-hidden border-b border-white/10">
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-purple-400/20 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center gap-3 relative z-10">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-lg ring-2 ring-white/20"
                    style={{ backgroundColor: stringToColor(user?.email || 'User') }}
                  >
                    {getInitials(user?.full_name || user?.username || 'User')}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-white truncate max-w-[150px]">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-[11px] text-indigo-200 truncate max-w-[150px] mt-0.5">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  Active Member
                </div>
              </div>

              {/* Sign Out */}
              <div className="p-3">
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm font-bold text-white rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
                  style={{ background: 'linear-gradient(90deg,#ef4444,#f43f5e)', boxShadow: '0 4px 16px rgba(239,68,68,0.35)' }}
                >
                  <LogOut className="w-4 h-4 text-white" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
