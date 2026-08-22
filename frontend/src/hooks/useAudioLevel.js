import { useEffect, useRef, useState } from 'react';

/**
 * Measures the live volume of a MediaStream's audio track using the Web
 * Audio API, so the UI can show a small "speaking" waveform for whoever is
 * currently talking. Returns a normalized level between 0 (silence) and 1
 * (loud), updated continuously via requestAnimationFrame.
 */
export default function useAudioLevel(stream) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const audioTracks = stream?.getAudioTracks?.() || [];
    if (!stream || audioTracks.length === 0) {
      setLevel(0);
      return undefined;
    }

    let cancelled = false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    const audioCtx = new AudioContextClass();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;

    let source;
    try {
      source = audioCtx.createMediaStreamSource(new MediaStream(audioTracks));
      source.connect(analyser);
    } catch (err) {
      return undefined;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      if (cancelled) return;
      analyser.getByteTimeDomainData(data);
      let sumSquares = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sumSquares += v * v;
      }
      const rms = Math.sqrt(sumSquares / data.length);
      setLevel(Math.min(1, rms * 4));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        source.disconnect();
        analyser.disconnect();
      } catch (err) {
        // ignore
      }
      audioCtx.close().catch(() => {});
    };
  }, [stream]);

  return level;
}
