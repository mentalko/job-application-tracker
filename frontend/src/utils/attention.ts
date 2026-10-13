import dayjs from "dayjs";

import type { ApplicationDetail } from "../api/client";
import type { WorkflowStage } from "../api/hooks";
import type { Interview } from "../api/interviewHooks";
import type { Offer } from "../api/offerHooks";
import type { Todo } from "../api/todoHooks";

/**
 * What an application needs, and how long ago things happened, for its "At a glance" card.
 * The rules follow Next actions (src/jat/api/next_actions.py), so the two agree.
 */

export type Tone = "red" | "orange" | "blue" | "gray";

export interface GlanceItem {
  key: string;
  label: string;
  when: string; // "for 12 days", "overdue by 2 days", "in 3 days"
  tone: Tone;
}

export interface KeyDate {
  label: string;
  day: string; // YYYY-MM-DD
  value: string; // "12 Sep 2026"
  ago: string; // "3 weeks ago"
}

export interface Glance {
  open: boolean; // active and not archived: only then does anything need doing
  attention: GlanceItem[];
  comingUp: GlanceItem[];
  dates: KeyDate[];
}

export interface GlanceInput {
  app: ApplicationDetail;
  stage: WorkflowStage | undefined;
  interviews: Interview[];
  offers: Offer[];
  todos: Todo[];
  today: string; // YYYY-MM-DD, your local day
  now: number; // ms since the epoch
}

const CONTACT_KINDS = new Set(["call", "email", "message"]);

/** The local calendar day of a timestamp or date. */
const dayOf = (value: string) => dayjs(value).format("YYYY-MM-DD");

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return dayjs(to).diff(dayjs(from), "day");
}

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** "today", "yesterday", "5 days ago", "3 weeks ago", "2 months ago". */
export function since(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return `${plural(Math.floor(days / 30), "month")} ago`;
}

/** "today", "tomorrow", "in 5 days", "in 3 weeks". */
export function until(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 60) return `in ${Math.floor(days / 7)} weeks`;
  return `in ${plural(Math.floor(days / 30), "month")}`;
}

/** A due date against today: "due today", "overdue by 3 days", "in 2 days". */
function due(on: string, today: string): { when: string; overdue: boolean } {
  const days = daysBetween(today, on);
  if (days < 0) return { when: `overdue by ${plural(-days, "day")}`, overdue: true };
  if (days === 0) return { when: "due today", overdue: false };
  return { when: until(days), overdue: false };
}

/** "for 12 days" (or "since today"). */
function lasting(fromDay: string, today: string): string {
  const days = daysBetween(fromDay, today);
  return days <= 0 ? "since today" : `for ${plural(days, "day")}`;
}

function formatDay(day: string) {
  return dayjs(day).format("D MMM YYYY");
}

export function glance({ app, stage, interviews, offers, todos, today, now }: GlanceInput): Glance {
  const open = app.stage_kind === "active" && !app.archived;
  const attention: GlanceItem[] = [];
  const comingUp: GlanceItem[] = [];

  if (open) {
    if (app.reply_to_read_since) {
      attention.push({
        key: "to-read",
        label: "They've replied: read it",
        when: lasting(app.reply_to_read_since, today),
        tone: "red",
      });
    }

    for (const todo of todos) {
      if (todo.done_at) continue;
      if (!todo.due_on) {
        attention.push({
          key: `todo-${todo.id}`,
          label: `To-do: ${todo.text}`,
          when: "no date",
          tone: "blue",
        });
        continue;
      }
      const d = due(todo.due_on, today);
      const item = { key: `todo-${todo.id}`, label: `To-do: ${todo.text}`, when: d.when };
      if (todo.due_on <= today) attention.push({ ...item, tone: d.overdue ? "red" : "orange" });
      else comingUp.push({ ...item, tone: "gray" });
    }

    // The newest offer counts; a pending one with a reply date needs an answer.
    const offer = [...offers].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (offer?.status === "pending" && offer.respond_by) {
      const d = due(offer.respond_by, today);
      const item = {
        key: "offer",
        label: `Reply to the offer by ${formatDay(offer.respond_by)}`,
        when: d.when,
      };
      if (daysBetween(today, offer.respond_by) <= 14)
        attention.push({ ...item, tone: d.overdue ? "red" : "orange" });
      else comingUp.push({ ...item, tone: "gray" });
    }

    for (const round of interviews) {
      if (round.status !== "scheduled") continue;
      const at = round.starts_at ?? round.deadline_at;
      if (!at) {
        comingUp.push({
          key: `round-${round.id}`,
          label: `${round.label}: not booked yet`,
          when: "no date",
          tone: "gray",
        });
      } else if (Date.parse(at) < now) {
        attention.push({
          key: `round-${round.id}`,
          label: `How did ${round.label} go?`,
          when: since(daysBetween(dayOf(at), today)),
          tone: "orange",
        });
      } else {
        comingUp.push({
          key: `round-${round.id}`,
          label: round.label,
          when: `${until(daysBetween(today, dayOf(at)))} · ${dayjs(at).format("D MMM, HH:mm")}`,
          tone: "blue",
        });
      }
    }

    const snoozed = app.snoozed_until !== null && app.snoozed_until > today;
    const followUpDue =
      app.follow_up_on !== null && app.follow_up_on <= today && !app.reply_to_read_since && !snoozed;
    if (followUpDue && app.follow_up_on) {
      const d = due(app.follow_up_on, today);
      attention.push({
        key: "follow-up",
        label: "Follow up",
        when: d.when,
        tone: d.overdue ? "red" : "orange",
      });
    } else if (app.follow_up_on && app.follow_up_on > today) {
      comingUp.push({
        key: "follow-up",
        label: `Follow up on ${formatDay(app.follow_up_on)}`,
        when: until(daysBetween(today, app.follow_up_on)),
        tone: "gray",
      });
    }

    if (app.stale && !followUpDue) {
      const limit = stage?.stale_after_days;
      attention.push({
        key: "stale",
        label: limit
          ? `Gone quiet (${stage?.name ?? app.stage_name} goes quiet after ${plural(limit, "day")})`
          : "Gone quiet",
        when: `no activity for ${plural(app.days_since_activity, "day")}`,
        tone: "red",
      });
    }

    if (app.awaiting_reply_since && !followUpDue) {
      attention.push({
        key: "waiting",
        label: "Waiting to hear back",
        when: lasting(app.awaiting_reply_since, today),
        tone: "gray",
      });
    }

    if (snoozed && app.snoozed_until) {
      comingUp.push({
        key: "snoozed",
        label: `Snoozed until ${formatDay(app.snoozed_until)}`,
        when: until(daysBetween(today, app.snoozed_until)),
        tone: "gray",
      });
    }
  }

  // Key dates, oldest first.
  const dates: KeyDate[] = [];
  const at = (label: string, day: string) =>
    dates.push({ label, day, value: formatDay(day), ago: since(daysBetween(day, today)) });
  const added = app.events.find((e) => e.kind === "stage_change" && e.from_stage === null);
  at("Added", dayOf(added?.occurred_at ?? app.created_at));
  if (app.applied_on) at("Applied", app.applied_on);
  const enteredStage = app.events
    .filter((e) => e.kind === "stage_change" && e.to_stage === app.stage && Date.parse(e.occurred_at) <= now)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  if (enteredStage) at(`Moved to ${app.stage_name}`, dayOf(enteredStage.occurred_at));
  const contact = app.events
    .filter((e) => CONTACT_KINDS.has(e.kind) && Date.parse(e.occurred_at) <= now)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  if (contact) at(`Last ${contact.kind === "call" ? "call" : contact.kind}`, dayOf(contact.occurred_at));
  const lastRound = interviews
    .filter((r) => r.status === "done" && (r.starts_at ?? r.deadline_at))
    .map((r) => (r.starts_at ?? r.deadline_at) as string)
    .sort()
    .pop();
  if (lastRound) at("Last interview", dayOf(lastRound));
  at("Last activity", dayOf(app.last_activity_at));
  dates.sort((a, b) => a.day.localeCompare(b.day)); // stable: same-day dates keep this order

  return { open, attention, comingUp, dates };
}
