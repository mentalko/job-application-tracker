/** Merges the per-area dictionaries into one. English is the source of truth; the `Key` type
 * is the union of every key, so `t("…")` is checked against all of them at compile time. */

import * as applications from "./strings/applications";
import * as insights from "./strings/insights";
import * as library from "./strings/library";
import * as people from "./strings/people";
import * as plans from "./strings/plans";
import * as shared from "./strings/shared";
import * as shell from "./strings/shell";
import * as today from "./strings/today";

export const en = {
  ...shell.en,
  ...today.en,
  ...shared.en,
  ...applications.en,
  ...people.en,
  ...plans.en,
  ...library.en,
  ...insights.en,
};

export const ru: Record<keyof typeof en, string> = {
  ...shell.ru,
  ...today.ru,
  ...shared.ru,
  ...applications.ru,
  ...people.ru,
  ...plans.ru,
  ...library.ru,
  ...insights.ru,
};

export type Key = keyof typeof en;
