import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw) as Partial<T>;
      // merge to preserve new keys added to `initial` over time
      return typeof initial === "object" && initial !== null && !Array.isArray(initial)
        ? ({ ...(initial as object), ...(parsed as object) } as T)
        : (parsed as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode — ignore */
    }
  }, [key, value]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => setValue(next),
    [],
  );
  return [value, update];
}

export function usePersistentString(
  key: string,
  initial: string,
): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: string) => {
      setValue(v);
      try {
        localStorage.setItem(key, v);
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [value, set];
}
