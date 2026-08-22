import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, LogIn, Plus, Sparkles, CheckCircle2, Zap, Star } from 'lucide-react';
import CreateMeetingModal from '../components/CreateMeetingModal';
import JoinMeetingModal from '../components/JoinMeetingModal';

export default function Dashboard() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">

      {/* ─── Full-page gradient background ─── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #0f0c29 0%, #1a1560 30%, #1e3a5f 60%, #0d2137 100%)',
        }}
      />

      {/* Ambient orbs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-32 right-16 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ─── Content ─── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Hero Banner */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-2xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.55) 0%, rgba(124,58,237,0.55) 50%, rgba(30,58,95,0.75) 100%)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-indigo-400/10 blur-xl pointer-events-none" />
          <div className="absolute top-4 right-4 opacity-10">
            <Star className="w-16 h-16 text-white" />
          </div>

          <div className="relative z-10">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300 uppercase tracking-wider mb-5">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              AI Assisted Workspace
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Welcome back,{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg,#a5b4fc,#f0abfc,#fda4af)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {user?.full_name || user?.username || 'User'}
              </span>
              !
            </h1>
            <p className="mt-3 text-indigo-100/80 text-base sm:text-lg max-w-2xl leading-relaxed">
              Collaborate smarter with instant video room generation and automated AI meeting summaries.
            </p>

            {/* Stats row */}
            <div className="mt-6 flex flex-wrap gap-4">
              {[
                { label: 'AI Powered', value: '100%' },
                { label: 'AI Summaries', value: 'Instant' },
                { label: 'Meeting Rooms', value: '∞' },
              ].map((s) => (
                <div key={s.label} className="flex flex-col px-4 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
                  <span className="text-lg font-black text-white">{s.value}</span>
                  <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Action Cards ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Create Meeting Card */}
          <div
            onClick={() => setIsCreateOpen(true)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl p-8 border border-white/10 hover:border-indigo-400/40 shadow-xl hover:shadow-indigo-500/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            style={{
              background: 'linear-gradient(135deg, rgba(55,48,163,0.6) 0%, rgba(79,70,229,0.5) 50%, rgba(99,102,241,0.35) 100%)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/10 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-tr-full pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="p-4 rounded-2xl shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}
                >
                  <Video className="w-8 h-8 text-white" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-indigo-200 bg-indigo-500/20 px-3.5 py-1.5 rounded-full border border-indigo-400/30">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  New Meeting
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                Create Meeting
              </h2>
              <p className="mt-2 text-sm text-indigo-200/80 leading-relaxed">
                Launch an instant video room or schedule a future session with automated AI meeting summaries.
              </p>

              <div className="mt-8 pt-5 border-t border-white/10 flex items-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:shadow-indigo-500/40 hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Meeting
                </button>
              </div>
            </div>
          </div>

          {/* Join Meeting Card */}
          <div
            onClick={() => setIsJoinOpen(true)}
            className="group relative cursor-pointer overflow-hidden rounded-3xl p-8 border border-white/10 hover:border-emerald-400/40 shadow-xl hover:shadow-emerald-500/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            style={{
              background: 'linear-gradient(135deg, rgba(6,78,59,0.6) 0%, rgba(16,185,129,0.3) 50%, rgba(20,184,166,0.25) 100%)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-400/10 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-tr-full pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="p-4 rounded-2xl shadow-xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300"
                  style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}
                >
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-200 bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-400/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                  Active Room
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                Join Meeting
              </h2>
              <p className="mt-2 text-sm text-emerald-100/70 leading-relaxed">
                Join an existing session instantly using a Meeting Code or URL, or pick from your active room list.
              </p>

              <div className="mt-8 pt-5 border-t border-white/10 flex items-center">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:shadow-emerald-500/40 hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(90deg,#059669,#0d9488)' }}
                >
                  <LogIn className="w-4 h-4" />
                  Join Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateMeetingModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <JoinMeetingModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
    </div>
  );
}
