import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '../redux/slices/uiSlice';
import { MEETING_API } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StartingMeeting from '../components/StartingMeeting';
import StartedMeeting from '../components/StartedMeeting';
import JoinDetailsForm from '../components/JoinDetailsForm';
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Video } from 'lucide-react';

const BG_GRADIENT = 'linear-gradient(135deg, #0f0c29 0%, #1a1560 30%, #1e3a5f 60%, #0d2137 100%)';
const GLASS = { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(14px)' };

/**
 * Normal (non-immersive) page shell used for every state BEFORE the call is
 * actually live — loading, errors, "meeting ended", the join-details form,
 * and the "waiting for host" lobby. This keeps the regular app chrome
 * (Navbar + Sidebar) exactly like every other page, so it does not take
 * over the whole screen.
 */
function PreCallShell({ children }) {
  const dispatch = useDispatch();
  return (
    <div className="min-h-screen" style={{ background: BG_GRADIENT }}>
      <Navbar onMenuClick={() => dispatch(toggleSidebar())} />
      <Sidebar />
      <main className="pt-16 transition-all duration-300 lg:ml-64">
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
          <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute top-32 right-16 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10">{children}</div>
        </div>
      </main>
    </div>
  );
}

/**
 * Full-viewport, edge-to-edge shell — used ONLY once the call is actually
 * live, so the video grid gets the whole screen like Google Meet. No
 * Navbar/Sidebar here on purpose.
 */
function LiveCallShell({ children }) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black flex flex-col">
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 h-14 shrink-0 border-b border-white/10">
        <Link to="/meetings" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold">AI Meeting Hub</span>
        </Link>
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Meetings
        </Link>
      </div>

      <div className="relative z-10 flex-1 min-h-0 w-full flex flex-col px-3 sm:px-5 py-3 sm:py-4">
        {children}
      </div>
    </div>
  );
}

export default function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSubmittedDetails, setHasSubmittedDetails] = useState(false);

  const fetchJoinInfo = useCallback(async () => {
    try {
      setError(null);
      const res = await MEETING_API.getJoinInfo(id);
      const data = res.data?.data || res.data;
      setMeeting(data.meeting);
      setIsHost(Boolean(data.is_host));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          'This meeting could not be found.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJoinInfo();
  }, [fetchJoinInfo]);

  if (loading) {
    return (
      <PreCallShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-300" />
        </div>
      </PreCallShell>
    );
  }

  if (error || !meeting) {
    return (
      <PreCallShell>
        <div className="max-w-md mx-auto text-center py-16 rounded-3xl border border-red-400/20" style={GLASS}>
          <XCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
          <p className="text-red-300 font-semibold">{error || 'Meeting not found'}</p>
          <Link
            to="/meetings"
            className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105"
            style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Meetings
          </Link>
        </div>
      </PreCallShell>
    );
  }

  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    return (
      <PreCallShell>
        <div className="max-w-md mx-auto text-center py-16 rounded-3xl border border-white/10 shadow-xl" style={GLASS}>
          <CheckCircle2 className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
          <p className="text-white font-bold text-lg">
            {meeting.status === 'completed' ? 'This meeting has ended' : 'This meeting was cancelled'}
          </p>
          <p className="text-indigo-200/60 text-sm mt-1">{meeting.title}</p>
          <Link
            to={`/meetings/${meeting.id}`}
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:scale-105"
            style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)' }}
          >
            View Meeting Details
          </Link>
        </div>
      </PreCallShell>
    );
  }

  // Non-host: must fill in name/email before entering the (waiting or live) room
  if (!isHost && !hasSubmittedDetails) {
    return (
      <PreCallShell>
        <JoinDetailsForm
          meeting={meeting}
          currentUser={user}
          onJoined={(updated) => {
            if (updated) setMeeting(updated);
            setHasSubmittedDetails(true);
          }}
        />
      </PreCallShell>
    );
  }

  // Call is actually live — take over the whole screen
  if (meeting.status === 'in_progress') {
    return (
      <LiveCallShell>
        <StartedMeeting
          meeting={meeting}
          isHost={isHost}
          currentUser={user}
          onEnded={(updated) => setMeeting(updated)}
        />
      </LiveCallShell>
    );
  }

  // Scheduled but not started yet — normal page, waiting for the host
  return (
    <PreCallShell>
      <StartingMeeting
        meeting={meeting}
        isHost={isHost}
        onStarted={(updated) => setMeeting(updated)}
      />
    </PreCallShell>
  );
}
