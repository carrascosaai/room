import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Un aviso que se borra solo a los pocos segundos.
 * `show(valor)` lo enseña; `hide()` lo quita antes de tiempo.
 */
export function useFlash<T = string>(ms = 5000) {
  const [value, setValue] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const show = useCallback(
    (v: T) => {
      if (timer.current) clearTimeout(timer.current);
      setValue(v);
      timer.current = setTimeout(() => setValue(null), ms);
    },
    [ms],
  );
  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setValue(null);
  }, []);
  return [value, show, hide] as const;
}
