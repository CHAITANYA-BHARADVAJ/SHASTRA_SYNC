"use client";

import { useState, useEffect } from "react";

/**
 * Returns a Date that updates on an interval, so relative timestamps
 * like "2m ago" refresh live without a page reload.
 *
 * @param intervalMs how often to tick (default 30s)
 */
export function useNow(intervalMs: number = 30000): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
