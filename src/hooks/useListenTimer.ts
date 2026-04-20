import { useEffect, useRef, useState } from "react";

/**
 * Tracks total listening time across start/stop sessions.
 * Ticks only while `listening` is true.
 */
export function useListenTimer(listening: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const accumulatedRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (listening) {
      sessionStartRef.current = Date.now();
      const tick = () => {
        const live = sessionStartRef.current
          ? Date.now() - sessionStartRef.current
          : 0;
        setElapsed(accumulatedRef.current + live);
      };
      tick();
      tickRef.current = window.setInterval(tick, 500);
      return () => {
        if (tickRef.current) window.clearInterval(tickRef.current);
        if (sessionStartRef.current) {
          accumulatedRef.current += Date.now() - sessionStartRef.current;
          sessionStartRef.current = null;
        }
        setElapsed(accumulatedRef.current);
      };
    }
  }, [listening]);

  const reset = () => {
    accumulatedRef.current = 0;
    sessionStartRef.current = listening ? Date.now() : null;
    setElapsed(0);
  };

  return { elapsed, reset };
}
