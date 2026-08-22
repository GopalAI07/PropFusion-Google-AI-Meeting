import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MEETING_API, SUMMARY_API } from '../api/axios';
import useMeetingRoom from '../hooks/useMeetingRoom';
import useAudioLevel from '../hooks/useAudioLevel';
import { getInitials, stringToColor } from '../utils/helpers';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, Loader2, Square, AlertTriangle,
  Sparkles, MoreVertical, UserX, Lock, ShieldAlert,
} from 'lucide-react';

const SPEAKING_THRESHOLD = 0.06;

function getParticipantLabel(peerId, meeting) {
  return meeting.participant_emails?.find((e) => e === peerId) || `Participant ${peerId.slice(0, 6)}`;
}

/** Small animated bars that pulse with live mic volume — shown next to a participant's name while they talk. */
function SpeakingWaveform({ level, speaking }) {
  const weights = [0.5, 0.9, 0.65, 1, 0.55];
  return (
    <span className="flex items-end gap-[2px] h-3.5 shrink-0">
      {weights.map((w, i) => (
        <span
          key={i}
          className="w-[2.5px] rounded-full bg-emerald-400 transition-[height] duration-100"
          style={{ height: speaking ? `${Math.max(3, w * level * 14)}px` : '3px', opacity: speaking ? 1 : 0.35 }}
        />
      ))}
    </span>
  );
}

function VideoTile({ stream, label, muted, isLocal, cameraOff, micOff }) {
  const videoRef = useRef(null);
  const level = useAudioLevel(stream);
  const speaking = !micOff && level > SPEAKING_THRESHOLD;

  // Keep the <video> element permanently mounted and just point/unpoint its
  // srcObject — swapping it in/out of the tree (conditional render) was the
  // cause of the camera not reappearing after being turned back on, since a
  // freshly-mounted <video> node never got the stream reattached.
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  const hasVideoTrack = !!stream?.getVideoTracks().some((t) => t.enabled) && !cameraOff;

  return (
    <div
      className={`relative h-full aspect-video shrink-0 rounded-xl border bg-[#111] overflow-hidden flex items-center justify-center transition-shadow ${
        speaking ? 'border-emerald-400/70 shadow-[0_0_0_2px_rgba(52,211,153,0.5)]' : 'border-white/10'
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-150 ${
          hasVideoTrack ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${isLocal ? '-scale-x-100' : ''}`}
      />

      {!hasVideoTrack && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#111]">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/10"
            style={{ background: stringToColor(label) }}
          >
            {getInitials(label)}
          </div>
        </div>
      )}

      {micOff && (
        <span className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white">
          <MicOff className="w-3 h-3 text-black" />
        </span>
      )}

      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/60 max-w-[85%]">
        <span className="text-[11px] font-semibold text-white truncate">{label}</span>
        {!micOff && <SpeakingWaveform level={level} speaking={speaking} />}
      </div>
    </div>
  );
}

/** Right-side "In this meeting" panel: everyone's mic/camera status, host-only moderation menu. */
function ParticipantsPanel({
  selfLabel, isHost, remoteUserIds, meeting,
  localMicOn, localCamOn, participants,
  openMenuId, setOpenMenuId, onModerate,
}) {
  return (
    <div className="w-72 sm:w-80 shrink-0 h-full flex flex-col rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 shrink-0">
        <Users className="w-4 h-4 text-white/70" />
        <p className="text-sm font-bold text-white">In this meeting</p>
        <span className="ml-auto text-xs text-white/40">{remoteUserIds.length + 1}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-white/5">
        {/* Self row */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: stringToColor(selfLabel) }}
          >
            {getInitials(selfLabel)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              You{isHost ? ' (Host)' : ''}
            </p>
          </div>
          <span title={localMicOn ? 'Mic on' : 'Mic off'}>
            {localMicOn ? (
              <Mic className="w-4 h-4 text-emerald-400" />
            ) : (
              <MicOff className="w-4 h-4 text-white/30" />
            )}
          </span>
          <span title={localCamOn ? 'Camera on' : 'Camera off'}>
            {localCamOn ? (
              <Video className="w-4 h-4 text-emerald-400" />
            ) : (
              <VideoOff className="w-4 h-4 text-white/30" />
            )}
          </span>
        </div>

        {/* Everyone else */}
        {remoteUserIds.map((peerId) => {
          const label = getParticipantLabel(peerId, meeting);
          const state = participants[peerId] || { micOn: true, camOn: true };
          const menuOpen = openMenuId === peerId;
          return (
            <div key={peerId} className="relative flex items-center gap-3 px-4 py-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: stringToColor(label) }}
              >
                {getInitials(label)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{label}</p>
              </div>
              <span title={state.micOn ? 'Mic on' : 'Mic off'}>
                {state.micOn ? (
                  <Mic className="w-4 h-4 text-emerald-400" />
                ) : (
                  <MicOff className="w-4 h-4 text-white/30" />
                )}
              </span>
              <span title={state.camOn ? 'Camera on' : 'Camera off'}>
                {state.camOn ? (
                  <Video className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VideoOff className="w-4 h-4 text-white/30" />
                )}
              </span>

              {isHost && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setOpenMenuId(menuOpen ? null : peerId)}
                    className="p-1 rounded-md hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    aria-label="Moderate participant"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-8 z-30 w-52 rounded-xl border border-white/10 bg-[#1c1c1e] shadow-2xl py-1.5">
                        <button
                          onClick={() => { onModerate(peerId, state.micOn ? 'mute_mic' : 'unmute_mic'); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition-colors"
                        >
                          {state.micOn ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          {state.micOn ? 'Block their mic' : 'Unblock their mic'}
                        </button>
                        <button
                          onClick={() => { onModerate(peerId, state.camOn ? 'mute_camera' : 'unmute_camera'); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition-colors"
                        >
                          {state.camOn ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                          {state.camOn ? 'Block their video' : 'Unblock their video'}
                        </button>
                        <button
                          onClick={() => { onModerate(peerId, 'mute_mic'); onModerate(peerId, 'mute_camera'); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Block both
                        </button>
                        <div className="my-1 h-px bg-white/10" />
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${label} from the meeting? They won't be able to rejoin.`)) {
                              onModerate(peerId, 'remove');
                            }
                            setOpenMenuId(null);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Remove from meeting
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Live meeting room shown once the host has started the meeting.
 * Styled after Google Meet: full-bleed black stage with a horizontally
 * scrolling row of tiles (never vertical scroll — new participants just
 * extend the row), a right-side participants panel, and a floating
 * pill-shaped control bar at the bottom.
 * Uses real camera/mic access + WebRTC so the host and participants can see/hear each other.
 * Host gets an "End Meeting" control which also uploads the recorded audio for
 * Gemini-powered transcription + summary, plus per-participant moderation
 * (block mic/camera, remove from the meeting).
 */
export default function StartedMeeting({ meeting, isHost, currentUser, onEnded }) {
  const navigate = useNavigate();
  const [elapsedSec, setElapsedSec] = useState(0);
  const [ending, setEnding] = useState(false);
  const [endStage, setEndStage] = useState(''); // '' | 'uploading' | 'done'
  const [openMenuId, setOpenMenuId] = useState(null);
  const [removedReason, setRemovedReason] = useState(null);
  const [showParticipants, setShowParticipants] = useState(true);

  const handleRemoved = useCallback((reason) => {
    setRemovedReason(reason);
  }, []);

  const {
    localStream,
    remoteStreams,
    micOn,
    camOn,
    connectionState,
    mediaError,
    participants,
    micBlockedByHost,
    camBlockedByHost,
    toggleMic,
    toggleCamera,
    hostModerate,
    stopRecordingAndGetFile,
  } = useMeetingRoom(meeting.id, currentUser?.id, { onRemoved: handleRemoved });

  useEffect(() => {
    const startedAt = meeting.started_at ? new Date(meeting.started_at).getTime() : Date.now();
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [meeting.started_at]);

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  };

  const handleEndMeeting = async () => {
    if (!window.confirm('End this meeting for everyone?')) return;
    try {
      setEnding(true);

      // Stop the local recording and upload it so Gemini can generate the AI meeting summary directly
      setEndStage('uploading');
      const audioFile = await stopRecordingAndGetFile();
      if (audioFile) {
        try {
          await SUMMARY_API.uploadAudio(meeting.id, audioFile);
        } catch (err) {
          console.error('Audio upload failed:', err);
        }
      }

      const res = await MEETING_API.updateStatus(meeting.id, 'completed');
      const updated = res.data?.data?.meeting || res.data?.meeting;
      setEndStage('done');
      onEnded(updated || { ...meeting, status: 'completed' });
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.detail || 'Failed to end meeting');
    } finally {
      setEnding(false);
      setEndStage('');
    }
  };

  const handleLeave = () => {
    navigate(`/meetings/${meeting.id}`);
  };

  if (removedReason) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-sm mx-auto text-center py-12 px-8 rounded-3xl border border-red-400/20 bg-white/[0.04]">
          <UserX className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-white font-bold">You were removed from this meeting</p>
          <p className="text-white/50 text-sm mt-1.5">{removedReason}</p>
          <button
            onClick={() => navigate('/meetings')}
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-full font-bold text-sm text-black bg-white hover:bg-white/90 shadow-lg transition-all hover:scale-105"
          >
            Back to Meetings
          </button>
        </div>
      </div>
    );
  }

  const selfLabel = currentUser?.full_name || currentUser?.username || 'You';
  const remoteUserIds = Object.keys(remoteStreams);
  const tileCount = remoteUserIds.length + 1;

  return (
    <div className="flex flex-col h-full min-h-0 w-full max-w-[1900px] mx-auto">
      {/* Status strip */}
      <div className="flex items-center justify-between gap-4 px-1 pb-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <p className="text-white/90 text-sm font-semibold truncate">{meeting.title}</p>
          <span className="text-white/40 text-sm font-mono">· {formatElapsed(elapsedSec)}</span>
        </div>
        <button
          onClick={() => setShowParticipants((prev) => !prev)}
          className={`hidden sm:flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border shrink-0 transition-colors ${
            showParticipants
              ? 'text-white bg-white/15 border-white/25'
              : 'text-white/60 bg-white/5 border-white/10 hover:bg-white/10 hover:text-white'
          }`}
          aria-pressed={showParticipants}
        >
          <Users className="w-3.5 h-3.5" />
          {tileCount} in room
        </button>
      </div>

      {mediaError && (
        <div className="rounded-xl border border-white/15 bg-white/5 p-3 flex items-start gap-2.5 mb-3 shrink-0">
          <AlertTriangle className="w-4 h-4 text-white shrink-0 mt-0.5" />
          <p className="text-xs text-white/80">{mediaError}</p>
        </div>
      )}

      {connectionState === 'connecting' && (
        <div className="flex items-center gap-2 text-white/50 text-xs px-1 mb-3 shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Connecting to the room...
        </div>
      )}

      {/* Stage + participants panel */}
      <div className="flex-1 min-h-0 flex gap-3">
        {/*
          Video stage: a single row that scrolls HORIZONTALLY as participants
          join, rather than wrapping into more rows (which caused the page to
          need vertical scrolling). Each tile's height fills the available
          space and its width follows from a 16:9 aspect ratio.
        */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden custom-scrollbar">
          <div className="flex h-full gap-3 items-stretch pb-1">
            <div className="relative h-full">
              <VideoTile
                stream={localStream}
                label={`${selfLabel} (You)`}
                muted
                isLocal
                cameraOff={!camOn}
                micOff={!micOn}
              />
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-black uppercase tracking-wide">
                {isHost ? 'Host' : 'You'}
              </span>
            </div>

            {remoteUserIds.map((peerId) => {
              const state = participants[peerId] || { micOn: true, camOn: true };
              return (
                <VideoTile
                  key={peerId}
                  stream={remoteStreams[peerId]}
                  label={getParticipantLabel(peerId, meeting)}
                  muted={false}
                  cameraOff={!state.camOn}
                  micOff={!state.micOn}
                />
              );
            })}

            {remoteUserIds.length === 0 && (
              <div className="h-full aspect-video shrink-0 rounded-xl border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center gap-2 text-center px-4">
                <Sparkles className="w-6 h-6 text-white/30" />
                <p className="text-xs text-white/40">Waiting for others to join...</p>
              </div>
            )}
          </div>
        </div>

        {showParticipants && (
          <ParticipantsPanel
            selfLabel={`${selfLabel} (You)`}
            isHost={isHost}
            remoteUserIds={remoteUserIds}
            meeting={meeting}
            localMicOn={micOn}
            localCamOn={camOn}
            participants={participants}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onModerate={hostModerate}
          />
        )}
      </div>

      {/* Floating control bar */}
      <div className="flex items-center justify-center pt-4 pb-1 shrink-0">
        <div className="inline-flex items-center gap-3 px-4 py-3 rounded-full bg-[#1c1c1e]/95 border border-white/10 shadow-2xl backdrop-blur-md">
          <button
            onClick={toggleMic}
            disabled={micBlockedByHost}
            title={micBlockedByHost ? 'Your mic was blocked by the host' : undefined}
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
              micBlockedByHost
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : micOn
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white hover:bg-white/90 text-black'
            }`}
            aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          >
            {micBlockedByHost ? (
              <Lock className="w-4 h-4" />
            ) : micOn ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={toggleCamera}
            disabled={camBlockedByHost}
            title={camBlockedByHost ? 'Your camera was blocked by the host' : undefined}
            className={`relative w-12 h-12 flex items-center justify-center rounded-full transition-colors ${
              camBlockedByHost
                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                : camOn
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-white hover:bg-white/90 text-black'
            }`}
            aria-label={camOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {camBlockedByHost ? (
              <Lock className="w-4 h-4" />
            ) : camOn ? (
              <Video className="w-5 h-5" />
            ) : (
              <VideoOff className="w-5 h-5" />
            )}
          </button>

          <div className="w-px h-8 bg-white/15 mx-1" />

          {isHost ? (
            <button
              onClick={handleEndMeeting}
              disabled={ending}
              className="inline-flex items-center gap-2 px-6 h-12 rounded-full font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-all disabled:opacity-60"
            >
              {ending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {endStage === 'uploading' ? 'Saving...' : 'Ending...'}
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  End
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleLeave}
              className="inline-flex items-center gap-2 px-6 h-12 rounded-full font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              Leave
            </button>
          )}
        </div>
      </div>

      {isHost && (
        <p className="text-[11px] text-center text-white/30 pt-2 pb-1 shrink-0">
          Your microphone audio is being recorded. When you end the meeting, it's uploaded and
          transcribed automatically, and an AI summary is generated from it.
        </p>
      )}
    </div>
  );
}
