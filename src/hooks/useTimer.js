import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Timestamp-based countdown timer hook.
 * Uses refs to avoid stale closure issues with the interval callback.
 *
 * @param {Object} options
 * @param {Function} options.onComplete - Called when the timer reaches zero
 * @returns {{ secondsLeft: number, running: boolean, setRunning: Function, loadDuration: Function }}
 */
export function useTimer({ onComplete } = {}) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);

  const targetEndRef = useRef(null);
  const intervalRef = useRef(null);
  const secondsLeftRef = useRef(0);
  const onCompleteRef = useRef(onComplete);

  // Keep refs in sync to avoid stale closures
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // ── Timestamp-based countdown loop ──
  useEffect(() => {
    if (running) {
      targetEndRef.current = Date.now() + secondsLeftRef.current * 1000;

      const tick = () => {
        const remaining = Math.round(
          (targetEndRef.current - Date.now()) / 1000
        );
        if (remaining <= 0) {
          setSecondsLeft(0);
          setRunning(false);
          clearInterval(intervalRef.current);
          onCompleteRef.current?.();
        } else {
          setSecondsLeft(remaining);
        }
      };

      intervalRef.current = setInterval(tick, 1000);
      tick();
    }

    return () => clearInterval(intervalRef.current);
  }, [running]);

  /**
   * Set the timer to a new duration (in seconds) and pause it.
   * Used when switching phases or resetting.
   */
  const loadDuration = useCallback((secs) => {
    clearInterval(intervalRef.current);
    setSecondsLeft(secs);
    secondsLeftRef.current = secs;
    setRunning(false);
  }, []);

  /**
   * Stop the timer without resetting the remaining time.
   */
  const stop = useCallback(() => {
    clearInterval(intervalRef.current);
    setRunning(false);
  }, []);

  return { secondsLeft, running, setRunning, loadDuration, stop };
}
