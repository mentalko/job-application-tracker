import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getLang, setLang, t, useT } from "./index";

function Probe() {
  const t = useT();
  return <p>{t("time.daysAgo", { n: 5 })}</p>;
}

afterEach(() => setLang("en"));

describe("i18n", () => {
  it("defaults to English and interpolates vars", () => {
    expect(getLang()).toBe("en");
    expect(t("time.daysAgo", { n: 5 })).toBe("5 days ago");
    expect(t("time.today")).toBe("today");
    expect(t("shell.api.version", { version: "1.2", schema: "9" })).toBe("v1.2 · schema 9");
  });

  it("picks the English plural form by n", () => {
    expect(t("time.weeksAgo", { n: 1 })).toBe("1 week ago");
    expect(t("time.weeksAgo", { n: 3 })).toBe("3 weeks ago");
    expect(t("today.sofarPeople", { n: 1 })).toBe("1 person added");
    expect(t("today.sofarPeople", { n: 3 })).toBe("3 people added");
  });

  it("switches to Russian, applies its three plural forms, and re-renders useT components", () => {
    act(() => setLang("ru"));
    expect(getLang()).toBe("ru");
    expect(t("time.daysAgo", { n: 1 })).toBe("1 день назад");
    expect(t("time.daysAgo", { n: 3 })).toBe("3 дня назад");
    expect(t("time.daysAgo", { n: 5 })).toBe("5 дней назад");
    expect(t("time.daysAgo", { n: 21 })).toBe("21 день назад");
    // Plurals continue after the noun, so whole sentences carry the suffix in every form.
    expect(t("today.sofarPeople", { n: 3 })).toBe("3 человека добавлено");

    render(<Probe />);
    expect(screen.getByText("5 дней назад")).toBeInTheDocument();
  });

  it("switching back to English restores the original strings", () => {
    act(() => setLang("ru"));
    act(() => setLang("en"));
    expect(t("time.today")).toBe("today");
  });

  it("leaves unknown {vars} untouched and ignores vars on plain strings", () => {
    expect(t("today.countIn", { n: 2, title: "Today" })).toBe("2 in Today");
    expect(t("time.today", { n: 3 })).toBe("today");
  });
});
