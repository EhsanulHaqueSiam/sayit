import { useCallback, useRef, useState } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  kind?: "info" | "ok" | "err";
  action?: ToastAction;
}

interface PushOptions {
  /** milliseconds before auto-dismiss. Defaults vary by kind. */
  ttl?: number;
  /** optional action button rendered in the toast. */
  action?: ToastAction;
}

/** Sensible defaults — errors linger long enough to read, infos flash. */
const DEFAULT_TTL: Record<NonNullable<Toast["kind"]>, number> = {
  info: 1600,
  ok: 1800,
  err: 6400,
};

let seq = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (
      message: string,
      kind: Toast["kind"] = "info",
      options: number | PushOptions = {},
    ) => {
      const opts: PushOptions =
        typeof options === "number" ? { ttl: options } : options;
      const id = seq++;
      const ttl = opts.ttl ?? DEFAULT_TTL[kind];
      const toast: Toast = { id, message, kind, action: opts.action };
      setToasts((t) => [...t, toast]);
      const timer = window.setTimeout(() => dismiss(id), ttl);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  return { toasts, push, dismiss };
}
