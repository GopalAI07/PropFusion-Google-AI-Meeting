import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/**
 * Handles everything needed for a live meeting room:
 * - camera/mic capture
 * - WebSocket signaling (/ws/meeting/{meetingId})
 * - a WebRTC mesh so the host and every participant can see/hear each other
 * - local mic recording, so the session audio can be uploaded for transcription
 * - live mic/camera state broadcast, so everyone's tile shows correct icons
 * - host moderation: mute/unmute a participant's mic or camera, or remove them
 */
export default function useMeetingRoom(meetingId, currentUserId, options = {}) {
  const { onRemoved } = options;

  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: MediaStream }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connectionState, setConnectionState] = useState('connecting'); // connecting | connected | error
  const [mediaError, setMediaError] = useState(null);
  // { userId: { micOn: bool, camOn: bool } } — other participants' reported state
  const [participants, setParticipants] = useState({});
  // Host has forcibly muted/disabled this device — local toggle is locked until host unblocks
  const [micBlockedByHost, setMicBlockedByHost] = useState(false);
  const [camBlockedByHost, setCamBlockedByHost] = useState(false);

  const wsRef = useRef(null);
  const peersRef = useRef({}); // { userId: RTCPeerConnection }
  const localStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const micOnRef = useRef(true);
  const camOnRef = useRef(true);

  const buildWsUrl = useCallback(() => {
    const token = localStorage.getItem('access_token');

    // If VITE_WS_BASE_URL is set (e.g. wss://your-backend.onrender.com), use it —
    // this is required whenever the frontend and backend are on different hosts,
    // like Vercel (frontend) + Render (backend). Falls back to same-origin
    // (window.location.host), which works for local dev via the Vite proxy.
    const configuredBase = import.meta.env.VITE_WS_BASE_URL;
    let base;
    if (configuredBase) {
      base = configuredBase.replace(/\/$/, '');
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      base = `${protocol}//${window.location.host}`;
    }

    return `${base}/ws/meeting/${meetingId}?token=${encodeURIComponent(token || '')}`;
  }, [meetingId]);

  const sendSignal = useCallback((type, data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  const broadcastOwnState = useCallback(() => {
    sendSignal('participant_state', { mic_on: micOnRef.current, cam_on: camOnRef.current });
  }, [sendSignal]);

  const createPeerConnection = useCallback((peerUserId) => {
    if (peersRef.current[peerUserId]) return peersRef.current[peerUserId];

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('webrtc_ice_candidate', {
          target_user_id: peerUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerUserId]: event.streams[0] }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peerUserId];
          return next;
        });
      }
    };

    peersRef.current[peerUserId] = pc;
    return pc;
  }, [sendSignal]);

  const closePeer = useCallback((peerUserId) => {
    const pc = peersRef.current[peerUserId];
    if (pc) {
      pc.close();
      delete peersRef.current[peerUserId];
    }
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerUserId];
      return next;
    });
    setParticipants((prev) => {
      const next = { ...prev };
      delete next[peerUserId];
      return next;
    });
  }, []);

  const initiateCallTo = useCallback(async (peerUserId) => {
    const pc = createPeerConnection(peerUserId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal('webrtc_offer', { target_user_id: peerUserId, sdp: offer });
    } catch (err) {
      console.error('Failed to create offer for', peerUserId, err);
    }
  }, [createPeerConnection, sendSignal]);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      // 1. Get camera/mic
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        try {
          // Fallback: audio only if camera isn't available/permitted
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setCamOn(false);
          camOnRef.current = false;
        } catch (err2) {
          setMediaError('Could not access camera or microphone. Please check permissions.');
          stream = null;
        }
      }

      if (cancelled) {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        return;
      }

      if (stream) {
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Start recording the local mic audio for later transcription
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const audioOnlyStream = new MediaStream(audioTracks);
            const recorder = new MediaRecorder(audioOnlyStream);
            recorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            recorder.start(1000);
            recorderRef.current = recorder;
          } catch (err) {
            console.warn('MediaRecorder not available:', err);
          }
        }
      }

      // 2. Open signaling WebSocket
      const ws = new WebSocket(buildWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        ws.send(JSON.stringify({ type: 'get_room_users', data: {} }));
        broadcastOwnState();
      };

      ws.onerror = () => setConnectionState('error');
      ws.onclose = () => setConnectionState('closed');

      ws.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        const { type, data } = msg;

        if (type === 'room_users') {
          // I'm the newcomer — call everyone already in the room
          (data.users || []).forEach((peerUserId) => {
            if (peerUserId !== currentUserId) initiateCallTo(peerUserId);
          });
        } else if (type === 'webrtc_offer' && data.from_user_id) {
          const pc = createPeerConnection(data.from_user_id);
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal('webrtc_answer', { target_user_id: data.from_user_id, sdp: answer });
        } else if (type === 'webrtc_answer' && data.from_user_id) {
          const pc = peersRef.current[data.from_user_id];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        } else if (type === 'webrtc_ice_candidate' && data.from_user_id) {
          const pc = peersRef.current[data.from_user_id];
          if (pc && data.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (err) {
              console.warn('Failed to add ICE candidate:', err);
            }
          }
        } else if (type === 'user_left' && data.user_id) {
          closePeer(data.user_id);
        } else if (type === 'user_joined' && data.user_id) {
          // Let the newcomer know our current mic/cam state right away
          broadcastOwnState();
        } else if (type === 'participant_state' && data.user_id) {
          setParticipants((prev) => ({
            ...prev,
            [data.user_id]: { micOn: !!data.mic_on, camOn: !!data.cam_on },
          }));
        } else if (type === 'moderation') {
          const action = data.action;
          if (action === 'mute_mic') {
            localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
            micOnRef.current = false;
            setMicOn(false);
            setMicBlockedByHost(true);
            broadcastOwnState();
          } else if (action === 'unmute_mic') {
            setMicBlockedByHost(false);
            localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
            micOnRef.current = true;
            setMicOn(true);
            broadcastOwnState();
          } else if (action === 'mute_camera') {
            localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
            camOnRef.current = false;
            setCamOn(false);
            setCamBlockedByHost(true);
            broadcastOwnState();
          } else if (action === 'unmute_camera') {
            setCamBlockedByHost(false);
            localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = true));
            camOnRef.current = true;
            setCamOn(true);
            broadcastOwnState();
          }
        } else if (type === 'removed') {
          onRemoved?.(data?.reason || 'You were removed from the meeting by the host.');
        }
      };
    }

    setup();

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      Object.keys(peersRef.current).forEach((peerId) => {
        peersRef.current[peerId].close();
      });
      peersRef.current = {};
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, currentUserId]);

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current || micBlockedByHost) return;
    const tracks = localStreamRef.current.getAudioTracks();
    const newState = !micOnRef.current;
    tracks.forEach((t) => (t.enabled = newState));
    micOnRef.current = newState;
    setMicOn(newState);
    broadcastOwnState();
  }, [micBlockedByHost, broadcastOwnState]);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current || camBlockedByHost) return;
    const tracks = localStreamRef.current.getVideoTracks();
    if (tracks.length === 0) return; // no camera available
    const newState = !camOnRef.current;
    tracks.forEach((t) => (t.enabled = newState));
    camOnRef.current = newState;
    setCamOn(newState);
    broadcastOwnState();
  }, [camBlockedByHost, broadcastOwnState]);

  /** Host-only: mute/unmute or remove a participant. No-op if not sent by the host (server enforces this too). */
  const hostModerate = useCallback((targetUserId, action) => {
    sendSignal('host_moderate', { target_user_id: targetUserId, action });
  }, [sendSignal]);

  /** Stop recording and return the captured audio as a File, ready to upload. */
  const stopRecordingAndGetFile = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        recordedChunksRef.current = [];
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        resolve(new File([blob], `meeting-${meetingId}.webm`, { type: 'audio/webm' }));
      };
      recorder.stop();
    });
  }, [meetingId]);

  return {
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
  };
}
