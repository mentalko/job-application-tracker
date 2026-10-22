import { Badge, Button, Group, Modal, Stack, Text, Textarea, Tooltip } from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { useState } from "react";

import { useSaveInterview, type Interview } from "../api/interviewHooks";
import { formatDateTime } from "../utils/time";

const PICKER = "YYYY-MM-DD HH:mm:ss";

/** "Rescheduled" (or "Rescheduled ×2") on a round that moved, with the time it moved from. */
export function RescheduledBadge({
  interview,
  size = "sm",
}: {
  interview: Pick<Interview, "rescheduled_count" | "rescheduled_from">;
  size?: "xs" | "sm";
}) {
  const n = interview.rescheduled_count;
  if (!n) return null;
  const badge = (
    <Badge size={size} variant="light" color="yellow">
      Rescheduled{n > 1 ? ` ×${n}` : ""}
    </Badge>
  );
  if (!interview.rescheduled_from) return badge;
  return (
    <Tooltip label={`Moved from ${formatDateTime(interview.rescheduled_from)}`} withArrow>
      {badge}
    </Tooltip>
  );
}

/**
 * Move a booked round to a new time, and say why if you like (it goes on the application's
 * timeline). Its end moves with it, so it lasts as long as before.
 */
export function RescheduleModal({ interview, onClose }: { interview: Interview; onClose: () => void }) {
  const save = useSaveInterview();
  const [when, setWhen] = useState<string | null>(
    interview.starts_at ? dayjs(interview.starts_at).format(PICKER) : null,
  );
  const [reason, setReason] = useState("");
  // To the minute: a change of seconds or fractions alone is no move.
  const moved = when !== null && !dayjs(when).isSame(dayjs(interview.starts_at), "minute");
  const submit = () => {
    if (!when) return;
    const startsAt = dayjs(when);
    const length = interview.ends_at ? dayjs(interview.ends_at).diff(dayjs(interview.starts_at)) : null;
    save.mutate(
      {
        id: interview.id,
        body: {
          starts_at: startsAt.toISOString(),
          ...(length !== null ? { ends_at: startsAt.add(length, "ms").toISOString() } : {}),
          reschedule_reason: reason.trim() || null,
        },
      },
      { onSuccess: onClose },
    );
  };
  return (
    <Modal
      opened
      onClose={onClose}
      title={`Reschedule ${interview.label}`}
      // While saving, nothing closes it: if the save fails, what you typed is still here.
      closeOnEscape={!save.isPending}
      closeOnClickOutside={!save.isPending}
      withCloseButton={!save.isPending}
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {interview.company_name} · {interview.role_title}
          {interview.starts_at ? ` · was ${formatDateTime(interview.starts_at)}` : ""}
        </Text>
        <DateTimePicker label="New time" value={when} onChange={setWhen} data-autofocus />
        <Textarea
          label="Why? (optional)"
          placeholder="They had a clash, you asked to move it…"
          maxLength={500}
          autosize
          minRows={2}
          value={reason}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setReason(value);
          }}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!moved} loading={save.isPending}>
            Reschedule
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
