import {
  IconBriefcase,
  IconBuilding,
  IconCalendarEvent,
  IconCash,
  IconChartSankey,
  IconFileText,
  IconHome,
  IconListDetails,
  IconNotes,
  IconTimeline,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";

import type { Key } from "./i18n";

export type NavGroup = "Today" | "Your applications" | "People and companies" | "Files and notes" | "Review";

/** Menu headings, in order. */
export const NAV_GROUPS: NavGroup[] = [
  "Today",
  "Your applications",
  "People and companies",
  "Files and notes",
  "Review",
];

/** The heading's translation key for each group. The Today group shares its one item's key:
 * a heading that only repeats the single item's name is suppressed (see Layout). */
export const NAV_GROUP_KEYS: Record<NavGroup, Key> = {
  Today: "nav.label.today",
  "Your applications": "nav.group.applications",
  "People and companies": "nav.group.people",
  "Files and notes": "nav.group.files",
  Review: "nav.group.review",
};

export interface NavItem {
  path: string;
  /** The heading it sits under in the menu. */
  group: NavGroup;
  label: string;
  labelKey: Key;
  icon: Icon;
  /** Roadmap task that builds the page (shown on its placeholder). */
  task: string;
  description: string;
  descriptionKey: Key;
}

// Navigation from docs/prd/tracker.md §7, grouped so the menu reads as a map of the app.
// `label`/`description` are the English strings (used directly by tests); `*Key` localizes them.
export const NAV: NavItem[] = [
  {
    path: "/",
    group: "Today",
    label: "Today",
    labelKey: "nav.label.today",
    icon: IconHome,
    task: "today-page",
    description: "Your move, what's coming up, and who you're waiting on.",
    descriptionKey: "nav.desc.today",
  },
  {
    path: "/roles",
    group: "Your applications",
    label: "Roles",
    labelKey: "nav.label.roles",
    icon: IconListDetails,
    task: "role-decisions",
    description: "Roles you might go for: pitched by a recruiter or spotted, then applied for or passed on.",
    descriptionKey: "nav.desc.roles",
  },
  {
    path: "/applications",
    group: "Your applications",
    label: "Applications",
    labelKey: "nav.label.applications",
    icon: IconBriefcase,
    task: "app-list",
    description: "Every application as a filterable list or a board.",
    descriptionKey: "nav.desc.applications",
  },
  {
    path: "/recruiters",
    group: "People and companies",
    label: "Recruiters",
    labelKey: "nav.label.recruiters",
    icon: IconUsers,
    task: "recruiters",
    description: "Agencies and recruiters, their contact details and the roles they've sent.",
    descriptionKey: "nav.desc.recruiters",
  },
  {
    path: "/companies",
    group: "People and companies",
    label: "Companies",
    labelKey: "nav.label.companies",
    icon: IconBuilding,
    task: "detail-pages",
    description: "Companies, their roles and who you've spoken to.",
    descriptionKey: "nav.desc.companies",
  },
  {
    path: "/interviews",
    group: "Your applications",
    label: "Interviews",
    labelKey: "nav.label.interviews",
    icon: IconCalendarEvent,
    task: "interviews",
    description: "Interviews and coding tasks: schedule, prep and debriefs.",
    descriptionKey: "nav.desc.interviews",
  },
  {
    path: "/offers",
    group: "Your applications",
    label: "Offers",
    labelKey: "nav.label.offers",
    icon: IconCash,
    task: "offers",
    description: "Offers side by side: salary, bonus, equity, pension, day rate and IR35.",
    descriptionKey: "nav.desc.offers",
  },
  {
    path: "/documents",
    group: "Files and notes",
    label: "Documents",
    labelKey: "nav.label.documents",
    icon: IconFileText,
    task: "documents",
    description: "CV and cover-letter versions, and where each was sent.",
    descriptionKey: "nav.desc.documents",
  },
  {
    path: "/notes",
    group: "Files and notes",
    label: "Notes",
    labelKey: "nav.label.notes",
    icon: IconNotes,
    task: "notes",
    description: "Markdown notes on anything, plus general notes.",
    descriptionKey: "nav.desc.notes",
  },
  {
    path: "/insights",
    group: "Review",
    label: "Insights",
    labelKey: "nav.label.insights",
    icon: IconChartSankey,
    task: "sankey",
    description: "Sankey diagram of your funnel, conversion rates and recruiter scorecards.",
    descriptionKey: "nav.desc.insights",
  },
  {
    path: "/timeline",
    group: "Review",
    label: "Timeline",
    labelKey: "nav.label.timeline",
    icon: IconTimeline,
    task: "timeline",
    description:
      "Everything that happened, by day or one row per role: calls, pitches, applications and outcomes.",
    descriptionKey: "nav.desc.timeline",
  },
];
