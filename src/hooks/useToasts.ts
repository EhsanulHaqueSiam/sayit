import { useCallback, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  kind?: "info" | "ok" | "err";
}

let seq = 1;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback(
    (message: string, kind: Toast["kind"] = "info", ttl = 1600) => {
      const id = seq++;
      setToasts((t) => [...t, { id, message, kind }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, ttl);
    },
    [],
  );

  return { toasts, push };
}
