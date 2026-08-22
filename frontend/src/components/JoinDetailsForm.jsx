import { useState } from 'react';
import { MEETING_API } from '../api/axios';
import { UserRound, Mail, Loader2, ArrowRight, Sparkles } from 'lucide-react';

const GLASS = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)' };

/**
 * Shown to non-host participants before they enter the waiting room.
 * Styled to match Meet's black/white pre-join lobby.
 * Collects their name & email and registers them against the meeting.
 */
export default function JoinDetailsForm({ meeting, currentUser, onJoined }) {
  const [name, setName] = useState(currentUser?.full_name || currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email to join.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await MEETING_API.joinAsParticipant(meeting.id, {
        name: name.trim(),
        email: email.trim(),
      });
      const updated = res.data?.data?.meeting || res.data?.meeting;
      onJoined(updated || meeting, { name: name.trim(), email: email.trim() });
    } catch (err) {
      setError(
        err.response?.data?.message || err.response?.data?.detail || 'Failed to join meeting'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full">
      <div className="rounded-3xl border border-white/10 shadow-xl p-8" style={GLASS}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 border border-white/15 mb-5">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-black text-white">Join "{meeting.title}"</h2>
        <p className="text-sm text-white/50 mt-1.5">
          Enter your details so the host knows who's joining.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 text-sm font-semibold rounded-2xl bg-white/10 text-white border border-white/15">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/50 mb-1.5">
              Your Name
            </label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/50 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/15 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-black bg-white hover:bg-white/90 shadow-lg transition-all hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
