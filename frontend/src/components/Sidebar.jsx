import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar, selectSidebarOpen } from '../redux/slices/uiSlice';
import { LayoutDashboard, Video, Sparkles, Zap } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Meetings',  path: '/meetings',  icon: Video },
];

export default function Sidebar() {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectSidebarOpen);

  const handleNavClick = () => {
    if (window.innerWidth < 1024) dispatch(toggleSidebar());
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      <aside
        className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 35%, #1e3a5f 70%, #0f2d5c 100%)',
          borderRight: '1px solid rgba(99,102,241,0.25)',
          boxShadow: '4px 0 32px rgba(99,102,241,0.15)',
        }}
      >
        {/* Decorative glows inside sidebar */}
        <div className="absolute top-10 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-40 left-0 w-24 h-24 bg-indigo-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-col h-full py-6">

          {/* Section label */}
          <div className="px-5 mb-4 flex items-center gap-2">
            <Zap className="w-3 h-3 text-indigo-300" />
            <span className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-[0.18em]">
              Navigation
            </span>
            <div className="flex-1 h-px bg-indigo-500/30" />
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-lg shadow-indigo-900/40 border border-white/25 backdrop-blur-md'
                      : 'bg-indigo-700/40 text-indigo-200 hover:bg-sky-500/40 hover:text-white border border-transparent hover:border-sky-400/30'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active left bar */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-300 to-purple-300" />
                    )}
                    <item.icon
                      className={`w-5 h-5 transition-all duration-200 group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'
                      }`}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-white shadow-sm shadow-white/50" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* AI Banner card at bottom */}
          <div className="px-4 mt-auto">
            <div
              className="p-4 rounded-2xl relative overflow-hidden border border-amber-400/25 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #4338ca 0%, #6d28d9 50%, #7c3aed 100%)' }}
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-amber-400/10 rounded-full blur-lg pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse fill-amber-300" />
                  <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                    AI Assistant Active
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100 font-medium leading-relaxed">
                  Capture meeting audio and generate AI summaries automatically.
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-300 font-semibold">Live & Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
