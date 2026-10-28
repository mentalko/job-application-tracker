import { Badge, Button, Group } from "@mantine/core";
import { IconHourglass, IconMailExclamation, IconMailOpened, IconMessageCheck } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";

import { useUpdateApplication } from "../api/hooks";
import { useSetPersonReply } from "../api/peopleHooks";
import { t, useT } from "../i18n";

/** Whole days since `since` (a YYYY-MM-DD in your time zone). */
export function daysWaiting(since: string): number {
  return Math.max(0, dayjs().startOf("day").diff(dayjs(since), "day"));
}

export function waitingLabel(since: string): string {
  const days = daysWaiting(since);
  return days === 0 ? t("shared.waitingSinceToday") : t("shared.waitingDays", { n: days });
}

/** "Replied today", "Replied 3 days ago": how long a reply has sat unread. */
export function repliedLabel(since: string): string {
  const days = daysWaiting(since);
  if (days === 0) return t("shared.repliedToday");
  if (days === 1) return t("shared.repliedYesterday");
  return t("shared.repliedDaysAgo", { n: days });
}

/** The same without the "Replied" prefix, for the "Reply to read · …" badge. */
function repliedShort(since: string): string {
  const days = daysWaiting(since);
  if (days === 0) return t("time.today");
  if (days === 1) return t("time.yesterday");
  return t("time.daysAgo", { n: days });
}

const today = () => dayjs().format("YYYY-MM-DD");

/** What changed: you replied (waiting), they replied (to read), or neither any more. */
export type ReplyChange = { awaiting_reply_since?: string | null; reply_to_read_since?: string | null };

/**
 * Where a conversation stands, and the buttons to move it on:
 * - nothing: **I've replied, waiting** or **They've replied**;
 * - waiting to hear back: **Heard back** or **They've replied** (when you'll read it later);
 * - a reply to read: **Read it**.
 */
function ReplyButtons({
  since,
  toRead,
  pending,
  onChange,
  compact,
  who,
}: {
  since: string | null | undefined;
  toRead: string | null | undefined;
  pending: boolean;
  onChange: (change: ReplyChange) => void;
  compact?: boolean;
  /** Who it's about, for screen readers when several sit in one list. */
  who?: string;
}) {
  const size = compact ? "compact-xs" : "xs";
  const t = useT();
  const [pressed, setPressed] = useState<"waiting" | "read" | null>(null);
  const change = (which: "waiting" | "read", body: ReplyChange) => {
    setPressed(which);
    onChange(body);
  };
  const spinning = (which: "waiting" | "read") => pending && pressed === which;
  const theyReplied = (
    <Button
      size={size}
      variant="light"
      color="orange"
      leftSection={<IconMailExclamation size={14} />}
      loading={spinning("read")}
      onClick={() => change("read", { reply_to_read_since: today() })}
      aria-label={who ? t("shared.theyRepliedAria", { who }) : undefined}
      title={t("shared.theyRepliedTitle")}
    >
      {t("shared.theyReplied")}
    </Button>
  );
  if (toRead) {
    return (
      <Group gap={6} wrap="nowrap">
        {!compact && (
          <Badge color="orange" variant="light" leftSection={<IconMailExclamation size={12} />}>
            {t("shared.replyToReadBadge", { when: repliedShort(toRead) })}
          </Badge>
        )}
        <Button
          size={size}
          variant="light"
          color="teal"
          leftSection={<IconMailOpened size={14} />}
          loading={spinning("read")}
          onClick={() => change("read", { reply_to_read_since: null })}
          aria-label={who ? t("shared.readItAria", { who }) : undefined}
        >
          {t("shared.readIt")}
        </Button>
      </Group>
    );
  }
  if (!since) {
    return (
      <Group gap={6} wrap="nowrap">
        <Button
          size={size}
          variant="light"
          color="grape"
          leftSection={<IconHourglass size={14} />}
          loading={spinning("waiting")}
          onClick={() => change("waiting", { awaiting_reply_since: today() })}
        >
          {t("shared.iveRepliedWaiting")}
        </Button>
        {theyReplied}
      </Group>
    );
  }
  return (
    <Group gap={6} wrap="nowrap">
      {!compact && (
        <Badge color="grape" variant="light" leftSection={<IconHourglass size={12} />}>
          {waitingLabel(since)}
        </Badge>
      )}
      <Button
        size={size}
        variant="light"
        color="teal"
        leftSection={<IconMessageCheck size={14} />}
        loading={spinning("waiting")}
        onClick={() => change("waiting", { awaiting_reply_since: null })}
        aria-label={who ? t("shared.heardBackAria", { who }) : undefined}
      >
        {t("shared.heardBack")}
      </Button>
      {theyReplied}
    </Group>
  );
}

/** Waiting to hear back, or a reply to read, on an application. */
export function ApplicationWaiting({
  id,
  since,
  toRead,
  compact,
  who,
}: {
  id: string;
  since: string | null | undefined;
  toRead?: string | null;
  compact?: boolean;
  who?: string;
}) {
  const update = useUpdateApplication();
  return (
    <ReplyButtons
      since={since}
      toRead={toRead}
      compact={compact}
      who={who}
      pending={update.isPending}
      onChange={(body) => update.mutate({ id, body })}
    />
  );
}

/** The same for a person, for conversations that aren't about one application. */
export function PersonWaiting({
  id,
  since,
  toRead,
  compact,
  who,
}: {
  id: string;
  since: string | null | undefined;
  toRead?: string | null;
  compact?: boolean;
  who?: string;
}) {
  const update = useSetPersonReply();
  return (
    <ReplyButtons
      since={since}
      toRead={toRead}
      compact={compact}
      who={who}
      pending={update.isPending}
      onChange={(body) => update.mutate({ id, body })}
    />
  );
}
