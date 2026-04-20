import { useEffect, useMemo, useRef } from "react";

export interface AudioMeterApi {
  /** Subscribe for 60fps level updates in [0, 1]. Returns unsubscribe. */
  attach: (cb: (level: number) => void) => () => void;
  /** Peek current level without subscribing. */
  peek: () => number;
}

/**
 * Opens a mic stream, runs it through an AnalyserNode, and emits the
 * normalized RMS level at requestAnimationFrame cadence.
 *
 * The hook returns an imperative API (subscribe-style) so consumers can
 * drive DOM updates directly — we deliberately bypass React state to
 * avoid 60 renders/second.
 */
export function useAudioMeter(enabled: boolean): AudioMeterApi {
  const levelRef = useRef(0);
  const subsRef = useRef<Set<(level: number) => void>>(new Set());
  const api = useMemo<AudioMeterApi>(
    () => ({
      attach: (cb) => {
        subsRef.current.add(cb);
        return () => {
          subsRef.current.delete(cb);
        };
      },
      peek: () => levelRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let rafId: number | null = null;

    const notify = (v: number) => {
      levelRef.current = v;
      subsRef.current.forEach((cb) => cb(v));
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const AudioCtor: typeof AudioContext =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctx = new AudioCtor();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);
        const buffer = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            const v = (buffer[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buffer.length);
          // Perceptual compression — soft speech still moves the bars.
          const normalized = Math.min(1, Math.pow(rms * 2.2, 0.7));
          notify(normalized);
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        // Mic denied or not present — silently no-op. The transcription
        // path will surface its own error toast if SR also fails.
      }
    })();

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
      notify(0);
    };
  }, [enabled]);

  return api;
}
