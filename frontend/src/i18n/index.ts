/** Minimal dependency-free i18n: flat dictionaries, `{name}` interpolation and `|`-separated
 * plural forms (picked by the numeric `n` var — three forms for Russian, two for English).
 * English strings are the source of truth; `ru` must mirror every key of `en` (compile-checked).
 * Components call useT() so they re-render on a language switch; plain helpers call t() directly. */

import { useSyncExternalStore } from "react";
import dayjs from "dayjs";
import "dayjs/locale/ru";

import { en, ru, type Key } from "./dictionaries";

export type { Key };
export type Lang = "en" | "ru";
export type Vars = Record<string, string | number>;

const STORAGE_KEY = "jat.lang";

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ru") return stored;
  } catch {
    // localStorage can be unavailable (private mode); fall through to the browser language.
  }
  return typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

let current: Lang = initialLang();

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The active language. Changing it re-renders every component that called useT(). */
export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang) {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Best effort; the language still applies for this session.
  }
  document.documentElement.lang = lang;
  dayjs.locale(lang);
  notify();
}

function notify() {
  for (const listener of listeners) listener();
}

function pluralIndex(n: number, forms: number): number {
  if (forms < 2) return 0;
  if (forms === 2) return n === 1 ? 0 : 1;
  // Russian: one (1, 21, 31…), few (2–4…), many (0, 5–20…).
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 > 10 && mod100 < 20) return 2;
  if (mod10 === 1) return 0;
  if (mod10 >= 2 && mod10 <= 4) return 1;
  return 2;
}

function fill(template: string, vars: Vars | undefined): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Translate `key`, interpolating `{name}` vars. A value with `|`-separated forms is a plural:
 * the form is chosen by the numeric `n` var. */
export function t(key: Key, vars?: Vars): string {
  const template = current === "ru" ? ru[key] : en[key];
  if (vars && typeof vars.n === "number" && template.includes("|")) {
    const forms = template.split("|");
    return fill(forms[pluralIndex(vars.n, forms.length)]!, vars);
  }
  return fill(template, vars);
}

export type TFunc = typeof t;

/** Subscribes the component to language changes and returns the translation function. */
export function useT(): TFunc {
  useSyncExternalStore(subscribe, getLang, getLang);
  return t;
}

document.documentElement.lang = current;
dayjs.locale(current);
