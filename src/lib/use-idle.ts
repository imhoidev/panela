import { useEffect, useState, useRef } from "react";

export function useIdle(timeoutMs: number = 300000): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function reset() {
      setIdle(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), timeoutMs);
    }

    const events = ["mousedown", "mousemove", "keydown", "touchstart", "wheel", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);

  return idle;
}
