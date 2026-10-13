import dayjs from "dayjs";
import { useEffect, useState } from "react";

const localDay = () => dayjs().format("YYYY-MM-DD");

/** The time now (ms since the epoch), updated every minute. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** Your local date, updated when the clock passes midnight (so an open tab rolls over). */
export function useToday() {
  const [today, setToday] = useState(localDay);
  useEffect(() => {
    const timer = setInterval(() => setToday(localDay()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return today;
}
