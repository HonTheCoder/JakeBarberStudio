import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel"];

/**
 * useIdleTimer
 *
 * Logs the user out after `timeoutMinutes` of inactivity.
 * Pass 0 (or null / undefined) to disable the timer entirely ("Never" setting).
 *
 * @param {number|null} timeoutMinutes  - value from settings.sessionTimeout
 * @param {() => void}  onTimeout       - callback to call when the timer fires (e.g. logout)
 */
const useIdleTimer = (timeoutMinutes, onTimeout) => {
  const timerRef    = useRef(null);
  const onTimeoutRef = useRef(onTimeout);

  // Keep the callback ref current without re-running the effect
  useEffect(() => { onTimeoutRef.current = onTimeout; }, [onTimeout]);

  useEffect(() => {
    const minutes = Number(timeoutMinutes);

    // 0 means "Never" — do nothing
    if (!minutes || minutes <= 0) return;

    const ms = minutes * 60 * 1000;

    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onTimeoutRef.current?.();
      }, ms);
    };

    // Start the timer and register activity listeners
    reset();
    ACTIVITY_EVENTS.forEach(evt =>
      window.addEventListener(evt, reset, { passive: true })
    );

    return () => {
      clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(evt =>
        window.removeEventListener(evt, reset)
      );
    };
  }, [timeoutMinutes]); // re-run if the configured timeout changes
};

export default useIdleTimer;