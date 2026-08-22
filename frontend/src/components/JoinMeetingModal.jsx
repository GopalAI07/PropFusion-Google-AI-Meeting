import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEETING_API } from '../api/axios';
import { X, LogIn, Video, Loader2, ArrowRight, Calendar, Sparkles } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function JoinMeetingModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [meetingInput, setMeetingInput] = useState('');
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [fetchingRecent, setFetchingRecent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchUpcomingMeetings();
    }
  }, [isOpen]);

  const fetchUpcomingMeetings = async () => {
    try {
      setFetchingRecent(true);
      const res = await MEETING_API.getRecent(5);
      const data = res.data;
      if (Array.isArray(data)) {
        setRecentMeetings(data);
      } else if (Array.isArray(data?.meetings)) {
        setRecentMeetings(data.meetings);
      } else if (Array.isArray(data?.data)) {
        setRecentMeetings(data.data);
      }
    } catch (err) {
      console.warn('Failed to load recent meetings:', err);
    } finally {
      setFetchingRecent(false);
    }
  };

  if (!isOpen) return null;

  const handleJoin = async (e) => {
    if (e) e.preventDefault();

    let targetInput = meetingInput.trim();
    if (!targetInput) {
      setError('Please enter a Meeting ID, Meeting Code, or Link');
      return;
    }

    if (targetInput.includes('/meetings/')) {
      const parts = targetInput.split('/meetings/');
      targetInput = parts[parts.length - 1].split('?')[0].split('#')[0].replace(/\/room$/, '');
    } else if (targetInput.startsWith('http://') || targetInput.startsWith('https://')) {
      window.open(targetInput, '_blank');
      onClose();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Meeting codes look like "abc-defg-hij"; meeting IDs are UUIDs. Try ID first, fall back to code.
      let meetingId = targetInput;
      try {
        const res = await MEETING_API.getJoinInfo(targetInput);
        const data = res.data?.data || res.data;
        meetingId = data?.meeting?.id || targetInput;
      } catch {
        const res = await MEETING_API.getJoinInfoByCode(targetInput);
        const data = res.data?.data || res.data;
        meetingId = data?.meeting?.id;
        if (!meetingId) throw new Error('not found');
      }

      onClose();
      navigate(`/meetings/${meetingId}/room`);
    } catch (err) {
      console.error('Failed to join meeting:', err);
      setError('Meeting not found with that ID, code, or link. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickJoin = (meetingId) => {
    onClose();
    navigate(`/meetings/${meetingId}/room`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md transition-opacity">
      {/* Ambient glowing circles */}
      <div className="absolute w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-emerald-200 overflow-hidden animate-modal-pop z-10 text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header styling in light green theme */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-200 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl ring-1 ring-white/30 shadow-lg">
              <LogIn className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Join Active Meeting
                <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
              </h2>
              <p className="text-xs text-emerald-100 mt-0.5">
                Enter your room ID or select an active session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition-all relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-6 space-y-6 bg-emerald-50/30">
          <form onSubmit={handleJoin} className="space-y-4">
            {error && (
              <div className="p-3.5 text-sm font-semibold rounded-2xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-black mb-2">
                Meeting Code, ID, or URL Link <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center group">
                <input
                  type="text"
                  value={meetingInput}
                  onChange={(e) => setMeetingInput(e.target.value)}
                  placeholder="Paste Meeting Code or Link (e.g. abc-defg-hij)"
                  className="w-full pl-4 pr-14 py-3.5 text-sm font-semibold rounded-2xl border border-emerald-300 bg-white text-black placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading || !meetingInput.trim()}
                  className="absolute right-2 p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-md shadow-emerald-600/30"
                  title="Join Room"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold text-black hover:bg-emerald-100 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !meetingInput.trim()}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-extrabold text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Join Session
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Join List */}
          <div className="pt-5 border-t border-emerald-200">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-black mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              Quick Join Recent Sessions
            </h3>

            {fetchingRecent ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : recentMeetings.length === 0 ? (
              <p className="text-xs text-gray-600 py-2">
                No recent or scheduled sessions found.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recentMeetings.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => handleQuickJoin(m.id)}
                    className="group flex items-center justify-between p-3.5 rounded-2xl bg-white hover:bg-emerald-100/80 border border-emerald-200 hover:border-emerald-400 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shadow-xs group-hover:scale-110 transition-transform">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-black truncate group-hover:text-emerald-700 transition-colors">
                          {m.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(m.created_at || m.scheduled_at)}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Join <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
