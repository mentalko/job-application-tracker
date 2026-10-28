import { ActionIcon, Badge, Button, Group, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconGhost2, IconRefresh, IconSend, IconThumbDown, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { Contact } from "../api/client";
import { useSetPersonReply } from "../api/peopleHooks";
import { formatDate } from "../utils/time";
import { t, useT } from "../i18n";

export const closedLabel = (closedAs: string) =>
  closedAs === "ghosted"
    ? t("people.ghosted")
    : closedAs === "not_interested"
      ? t("people.notInterested")
      : closedAs;

const today = () => dayjs().format("YYYY-MM-DD");

const takenOff = (c: Contact) =>
  c.closed_as === "ghosted"
    ? t("people.notGhostAnyMore", { name: c.name })
    : t("people.notMarkedNotInterestedAnyMore", { name: c.name });

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
 * waiting again from today), **Ghosted** or **Not interested** (they leave Today). Each
 * says what it did, with an Undo.
 */
function useAct(contact: Contact) {
  const update = useSetPersonReply();
  const t = useT();
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
                  {t("people.undo")}
                </Button>
              </Group>
            ),
          });
        },
      },
    );
  };
  return { act, pending: update.isPending };
}

export function PersonChase({ contact, compact }: { contact: Contact; compact?: boolean }) {
  const { act, pending } = useAct(contact);
  const t = useT();
  const size = compact ? "compact-xs" : "xs";
  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label={t("people.chasedTooltip")}>
        <Button
          size={size}
          variant="light"
          color="blue"
          leftSection={<IconSend size={14} />}
          disabled={pending}
          onClick={() => act({ chased_on: today() }, t("people.chasedNamed", { name: contact.name }))}
          aria-label={t("people.chasedAria", { name: contact.name })}
        >
          {t("people.chased")}
        </Button>
      </Tooltip>
      <Tooltip label={t("people.ghostTooltip")}>
        <Button
          size={size}
          variant="subtle"
          color="gray"
          leftSection={<IconGhost2 size={14} />}
          disabled={pending}
          onClick={() =>
            act(
              { closed_as: "ghosted", closed_on: today() },
              t("people.ghostedOffToday", { name: contact.name }),
            )
          }
          aria-label={t("people.ghostedAria", { name: contact.name })}
        >
          {t("people.ghosted")}
        </Button>
      </Tooltip>
      <Tooltip label={t("people.notInterestedTooltip")}>
        <Button
          size={size}
          variant="subtle"
          color="gray"
          leftSection={<IconThumbDown size={14} />}
          disabled={pending}
          onClick={() =>
            act(
              { closed_as: "not_interested", closed_on: today() },
              t("people.notInterestedOffToday", { name: contact.name }),
            )
          }
          aria-label={t("people.notInterestedAria", { name: contact.name })}
        >
          {t("people.notInterested")}
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
    return days === 0
      ? t("people.chasedToday")
      : days === 1
        ? t("people.chasedYesterday")
        : t("people.chasedDaysAgo", { n: days });
  }
  return waitingLabel(since);
}

/** "Ghosted · 5 Oct 2026" with a button to take it off, for someone you've stopped expecting anything from. */
export function PersonClosed({ contact }: { contact: Contact }) {
  const { act, pending } = useAct(contact);
  const t = useT();
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
            ? t("people.unGhostTooltip")
            : t("people.removeNotInterestedTooltip")
        }
      >
        <Button
          size="xs"
          variant="light"
          color="gray"
          leftSection={<IconRefresh size={14} />}
          loading={pending}
          onClick={() => act({ closed_as: null }, takenOff(contact))}
        >
          {contact.closed_as === "ghosted" ? t("people.notAGhost") : t("people.removeNotInterested")}
        </Button>
      </Tooltip>
    </Group>
  );
}

/** A small undo on a Ghosted or Not interested chip (the Recruiters tiles). */
export function UndoClosed({ contact }: { contact: Contact }) {
  const { act, pending } = useAct(contact);
  const t = useT();
  const what = contact.closed_as === "ghosted" ? t("people.ghosted") : t("people.notInterested");
  return (
    <Tooltip
      label={
        contact.closed_as === "ghosted"
          ? t("people.notAGhostTooltip")
          : t("people.removeNotInterestedTooltip")
      }
    >
      <ActionIcon
        size={20}
        variant="subtle"
        color="gray"
        radius="xl"
        aria-label={t("people.takeOffAria", { what, name: contact.name })}
        loading={pending}
        onClick={() => act({ closed_as: null }, takenOff(contact))}
      >
        <IconX size={12} />
      </ActionIcon>
    </Tooltip>
  );
}
