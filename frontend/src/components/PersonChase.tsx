import { ActionIcon, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconGhost2, IconRefresh, IconSend, IconThumbDown, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { Contact } from "../api/client";
import { useSetPersonReply } from "../api/peopleHooks";
import { formatDate } from "../utils/time";

const CLOSED: Record<string, string> = { ghosted: "Ghosted", not_interested: "Not interested" };

export const closedLabel = (closedAs: string) => CLOSED[closedAs] ?? closedAs;

const today = () => dayjs().format("YYYY-MM-DD");

/** Where the conversation stood, so an Undo can put it back exactly. */
const before = (c: Contact) => ({
  awaiting_reply_since: c.awaiting_reply_since ?? null,
  reply_to_read_since: c.reply_to_read_since ?? null,
  chased_on: c.chased_on ?? null,
  closed_as: c.closed_as ?? null,
  closed_on: c.closed_on ?? null,
});

/**
 * Chase someone, or stop expecting anything from them, as small labelled buttons (`compact` in
 * lists): **Chased** (you sent a nudge; you're
 * waiting again from today), **Ghosted** or **Not interested** (they leave Next actions). Each
 * says what it did, with an Undo.
 */
export function PersonChase({ contact, compact }: { contact: Contact; compact?: boolean }) {
  const update = useSetPersonReply();
  const act = (body: Parameters<typeof update.mutate>[0]["body"], message: string) => {
    const was = before(contact);
    update.mutate(
      { id: contact.id, body },
      {
        onSuccess: () => {
          const id = notifications.show({
            autoClose: 8000, // long enough to reach Undo from the keyboard
            message: (
              <Group justify="space-between" wrap="nowrap" gap="xs">
                <Text size="sm">{message}</Text>
                <Button
                  size="compact-xs"
                  variant="light"
                  onClick={() => {
                    notifications.hide(id);
                    update.mutate({ id: contact.id, body: was });
                  }}
                >
                  Undo
                </Button>
              </Group>
            ),
          });
        },
      },
    );
  };
  const size = compact ? "compact-xs" : "xs";
  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label="You nudged them: waiting again from today">
        <Button
          size={size}
          variant="light"
          color="blue"
          leftSection={<IconSend size={14} />}
          disabled={update.isPending}
          onClick={() => act({ chased_on: today() }, `Chased ${contact.name}`)}
          aria-label={`Chased: ${contact.name}`}
        >
          Chased
        </Button>
      </Tooltip>
      <Tooltip label="No reply: stop waiting on them">
        <Button
          size={size}
          variant="subtle"
          color="gray"
          leftSection={<IconGhost2 size={14} />}
          disabled={update.isPending}
          onClick={() =>
            act({ closed_as: "ghosted", closed_on: today() }, `${contact.name}: ghosted, off Next actions`)
          }
          aria-label={`Ghosted: ${contact.name}`}
        >
          Ghosted
        </Button>
      </Tooltip>
      <Tooltip label="You're not interested: stop waiting on them">
        <Button
          size={size}
          variant="subtle"
          color="gray"
          leftSection={<IconThumbDown size={14} />}
          disabled={update.isPending}
          onClick={() =>
            act(
              { closed_as: "not_interested", closed_on: today() },
              `${contact.name}: not interested, off Next actions`,
            )
          }
          aria-label={`Not interested: ${contact.name}`}
        >
          Not interested
        </Button>
      </Tooltip>
    </Group>
  );
}

/** "Chased 2 days ago" when the waiting started with a chase, else "Waiting 5 days". */
export function waitingOrChased(person: Contact, waitingLabel: (since: string) => string): string {
  const since = person.awaiting_reply_since!;
  if (person.chased_on && person.chased_on === since) {
    const days = Math.max(0, dayjs().startOf("day").diff(dayjs(since), "day"));
    return days === 0 ? "Chased today" : days === 1 ? "Chased yesterday" : `Chased ${days} days ago`;
  }
  return waitingLabel(since);
}

/** "Ghosted · 5 Oct 2026" with a Reopen button, for someone you've stopped expecting anything from. */
export function PersonClosed({ contact }: { contact: Contact }) {
  const update = useSetPersonReply();
  if (!contact.closed_as) return null;
  return (
    <Group gap={6} wrap="nowrap">
      <Badge color="gray" variant="light" style={{ textTransform: "none" }}>
        {closedLabel(contact.closed_as)}
        {contact.closed_on ? ` · ${formatDate(contact.closed_on)}` : ""}
      </Badge>
      <Tooltip
        label={
          contact.closed_as === "ghosted"
            ? "They were just slow, or got back in touch: take Ghosted off, whenever it was set"
            : "Take Not interested off"
        }
      >
        <Button
          size="xs"
          variant="light"
          color="gray"
          leftSection={<IconRefresh size={14} />}
          loading={update.isPending}
          onClick={() => update.mutate({ id: contact.id, body: { closed_as: null } })}
        >
          {contact.closed_as === "ghosted" ? "Not a ghost" : "Remove Not interested"}
        </Button>
      </Tooltip>
    </Group>
  );
}

/** A small undo on a Ghosted or Not interested chip (the Recruiters tiles). */
export function UndoClosed({ contact }: { contact: Contact }) {
  const update = useSetPersonReply();
  const what = contact.closed_as === "ghosted" ? "Ghosted" : "Not interested";
  return (
    <Tooltip
      label={contact.closed_as === "ghosted" ? "Not a ghost: take Ghosted off" : "Take Not interested off"}
    >
      <ActionIcon
        size={14}
        variant="transparent"
        color="gray"
        aria-label={`Take ${what} off ${contact.name}`}
        loading={update.isPending}
        onClick={(e) => {
          e.preventDefault();
          update.mutate({ id: contact.id, body: { closed_as: null } });
        }}
      >
        <IconX size={11} />
      </ActionIcon>
    </Tooltip>
  );
}
