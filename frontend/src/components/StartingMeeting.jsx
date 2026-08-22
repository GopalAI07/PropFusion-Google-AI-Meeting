import { useState, useEffect, useRef } from 'react';
import { MEETING_API } from '../api/axios';
import { formatDate } from '../utils/helpers';
import { Clock, Loader2, Play, AlertTriangle, X, Calendar, Users } from 'lucide-react';

const GLASS = { background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(14px)' };

/**
 * Waiting room shown while a scheduled meeting hasn't started yet.
 * Styled like Google Meet's pre-join lobby: black backdrop, white pill CTA.
 * - Host: sees a "Start Meeting" button. Starting before the scheduled time
 *   is blocked with a popup, both client-side (instant) and server-side (authoritative).
 * - Participant: sees a waiting spinner and polls until the host starts the meeting.
 */
export default function StartingMeeting({ meeting, isHost, onStarted }) {
  const [starting, setStarting] = useState(false);
  const [blockedPopup, setBlockedPopup] = useState(null); // string | null
  const [now, setNow] = useState(new Date());
  const pollRef = useRef(null);

  // Live clock so the "time remaining" ticks
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for the host having started the meeting
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await MEETING_API.getJoinInfo(meeting.id);
        const latest = res.data?.data?.meeting || res.data?.meeting;
        if (latest?.status === 'in_progress') {
          onStarted(latest);
        } else if (latest?.status === 'completed' || latest?.status === 'cancelled') {
          onStarted(latest);
        }
      } catch (err) {
        // silently ignore transient poll errors
      }
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [meeting.id, onStarted]);

  const scheduledAt = meeting.scheduled_at ? new Date(meeting.scheduled_at) : null;
  const isBeforeScheduledTime = scheduledAt ? now < scheduledAt : false;

  const msRemaining = scheduledAt ? scheduledAt.getTime() - now.getTime() : 0;
  const remainingLabel = (() => {
    if (!isBeforeScheduledTime || msRemaining <= 0) return null;
    const totalSeconds = Math.floor(msRemaining / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  })();

  const handleHostStart = async () => {
    // Client-side guard for instant feedback
    if (isBeforeScheduledTime) {
      setBlockedPopup(
        `You can't start this meeting yet. It's scheduled for ${formatDate(meeting.scheduled_at, {
          hour: '2-digit',
          minute: '2-digit',
        })}. Please wait until the scheduled time.`
      );
      return;
    }

    try {
      setStarting(true);
      const res = await MEETING_API.updateStatus(meeting.id, 'in_progress');
      const updated = res.data?.data?.meeting || res.data?.meeting;
      onStarted(updated || { ...meeting, status: 'in_progress' });
    } catch (err) {
      // Server-side restriction is authoritative — show the same popup if it fires
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        'You cannot start this meeting yet.';
      setBlockedPopup(message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div
        className="rounded-3xl border border-white/10 shadow-xl p-8 sm:p-10 text-center"
        style={GLASS}
      >
        <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-white/10 border border-white/15 mb-6">
          {isHost ? (
            <Play className="w-9 h-9 text-white ml-1" />
          ) : (
            <Loader2 className="w-9 h-9 text-white animate-spin" />
          )}
        </div>

        <h2 className="text-2xl font-black text-white">{meeting.title}</h2>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-sm text-white/60">
            <Calendar className="w-4 h-4" />
            {formatDate(meeting.scheduled_at || meeting.created_at, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {meeting.participant_count > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-white/60">
              <Users className="w-4 h-4" />
              {meeting.participant_count} invited
            </span>
          )}
        </div>

        <div className="mt-8">
          {isHost ? (
            <>
              <p className="text-white/70 text-sm mb-5">
                {isBeforeScheduledTime
                  ? `You're the host. This meeting can be started in ${remainingLabel}.`
                  : "You're the host. Start the meeting whenever you're ready."}
              </p>
              <button
                onClick={handleHostStart}
                disabled={starting}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm text-black bg-white hover:bg-white/90 shadow-lg transition-all hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
              >
                {starting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Meeting
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <p className="text-white/70 text-sm mb-2">
                Waiting for the host to start the meeting...
              </p>
              {remainingLabel && (
                <p className="text-white/40 text-xs flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Scheduled to begin in {remainingLabel}
                </p>
              )}
              <div className="flex items-center justify-center gap-2 mt-6">
                <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Restriction popup — host tried to start before scheduled time */}
      {blockedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden text-gray-900">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-black text-white">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-sm">Can't Start Yet</h3>
              </div>
              <button
                onClick={() => setBlockedPopup(null)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium text-gray-700">{blockedPopup}</p>
              <button
                onClick={() => setBlockedPopup(null)}
                className="mt-5 w-full py-2.5 rounded-full font-bold text-sm text-white bg-black hover:bg-gray-900 shadow-lg transition-all hover:scale-[1.02]"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
