import { Button, Group, Modal, Stack, Text, Textarea } from "@mantine/core";
import { useState } from "react";

import { useSaveInterview, type Interview } from "../api/interviewHooks";
import { useSaveMeeting, type Meeting } from "../api/meetingHooks";

type Field = { key: string; label: string; placeholder: string; initial: string | null };

/**
 * Marking something as done (or as not having happened), with somewhere to say how it went.
 * The status only changes when you save; the notes can stay empty.
 */
function OutcomeNotesModal({
  title,
  subtitle,
  fields,
  confirm,
  loading,
  onSave,
  onClose,
}: {
  title: string;
  subtitle: string;
  fields: Field[];
  confirm: string;
  loading: boolean;
  onSave: (values: Record<string, string | null>) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.initial ?? ""])));
  return (
    <Modal opened onClose={onClose} title={title} size="lg">
      <Stack>
        <Text size="sm" c="dimmed">
          {subtitle}
        </Text>
        {fields.map((f, i) => (
          <Textarea
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            autosize
            minRows={3}
            data-autofocus={i === 0 || undefined}
            value={values[f.key]}
            onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.currentTarget.value }))}
          />
        ))}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={loading}
            onClick={() =>
              onSave(
                Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim() ? v.trim() : null])),
              )
            }
          >
            {confirm}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** An interview round's Done and Didn't happen, each asking how it went (the debrief) first. */
export function InterviewOutcome({ interview }: { interview: Interview }) {
  const save = useSaveInterview();
  const [marking, setMarking] = useState<"done" | "cancelled" | null>(null);
  const where = `${interview.company_name} · ${interview.role_title}`;
  return (
    <Group gap={4} wrap="nowrap">
      <Button
        size="compact-xs"
        variant="light"
        color="teal"
        aria-label={`Done: ${interview.label}`}
        onClick={() => setMarking("done")}
      >
        Done
      </Button>
      <Button
        size="compact-xs"
        variant="subtle"
        color="gray"
        aria-label={`Didn't happen: ${interview.label}`}
        onClick={() => setMarking("cancelled")}
      >
        Didn't happen
      </Button>
      {marking && (
        <OutcomeNotesModal
          title={marking === "done" ? `How did ${interview.label} go?` : `${interview.label} didn't happen`}
          subtitle={where}
          fields={
            marking === "done"
              ? [
                  {
                    key: "debrief",
                    label: "Debrief",
                    placeholder: "How it went, who you met, what's next",
                    initial: interview.debrief,
                  },
                  {
                    key: "questions",
                    label: "Questions asked",
                    placeholder: "So you can prepare for the next one",
                    initial: interview.questions,
                  },
                ]
              : [
                  {
                    key: "debrief",
                    label: "What happened?",
                    placeholder: "They rescheduled, you withdrew, nobody turned up…",
                    initial: interview.debrief,
                  },
                ]
          }
          confirm={marking === "done" ? "Mark as done" : "Mark as didn't happen"}
          loading={save.isPending}
          onClose={() => setMarking(null)}
          onSave={(notes) =>
            save.mutate(
              { id: interview.id, body: { status: marking, ...notes } },
              { onSuccess: () => setMarking(null) },
            )
          }
        />
      )}
    </Group>
  );
}

/** A call's Didn't happen, asking what happened (its notes) first. */
export function MeetingDidntHappen({ meeting }: { meeting: Meeting }) {
  const save = useSaveMeeting();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="compact-xs"
        variant="subtle"
        color="gray"
        aria-label={`Didn't happen: ${meeting.label}`}
        onClick={() => setOpen(true)}
      >
        Didn't happen
      </Button>
      {open && (
        <OutcomeNotesModal
          title={`${meeting.label} didn't happen`}
          subtitle="The call stays on its person's page, marked as not having happened."
          fields={[
            {
              key: "notes",
              label: "What happened?",
              placeholder: "They cancelled, it moved to next week…",
              initial: meeting.notes,
            },
          ]}
          confirm="Mark as didn't happen"
          loading={save.isPending}
          onClose={() => setOpen(false)}
          onSave={(notes) =>
            save.mutate(
              { id: meeting.id, body: { status: "cancelled", ...notes } },
              { onSuccess: () => setOpen(false) },
            )
          }
        />
      )}
    </>
  );
}
