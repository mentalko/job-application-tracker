import { getLang, t } from "../i18n";

/** "today", "yesterday", "5 days ago", "3 weeks ago" … */
export function ago(days: number): string {
  if (days <= 0) return t("time.today");
  if (days === 1) return t("time.yesterday");
  if (days < 14) return t("time.daysAgo", { n: days });
  if (days < 60) return t("time.weeksAgo", { n: Math.floor(days / 7) });
  return t("time.monthsAgo", { n: Math.floor(days / 30) });
}

// Dates follow the UI language (the browser's locale can differ from it, e.g. a Russian OS).
export function localeTag(): string {
  return getLang() === "ru" ? "ru-RU" : "en-GB";
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(localeTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(localeTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
