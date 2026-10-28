import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Menu,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconDots, IconPhone, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState, type ReactNode } from "react";

import { PersonName } from "./GhostMark";
import { useApplications, useContacts } from "../api/hooks";
import {
  MEETING_KINDS,
  useDeleteMeeting,
  useMeetings,
  useSaveMeeting,
  type Meeting,
  type MeetingKind,
} from "../api/meetingHooks";
import { Markdown } from "./Markdown";
import { MeetingDidntHappen } from "./OutcomeNotes";
import { RoleFormModal, RoleLine } from "./Roles";
import { useRoleSummaries } from "../api/roleHooks";
import { formatDateTime } from "../utils/time";
import { t, useT, type Key } from "../i18n";

type Status = "scheduled" | "done" | "cancelled";

interface Values {
  contactId: string | null;
  kind: NonNullable<MeetingKind>;
  title: string;
  status: Status;
  startsAt: string | null;
  location: string;
  meetingUrl: string;
  applicationId: string | null;
  agenda: string;
  notes: string;
}

const PICKER = "YYYY-MM-DD HH:mm:ss";
const blank = (s: string) => s.trim() || null;
const isLink = (v: string) => (!v || /^https?:\/\//.test(v) ? null : t("plans.linkInvalid"));

/** Next whole hour, as a sensible default time for a call you're booking. */
const nextHour = () => dayjs().add(1, "hour").startOf("hour").format(PICKER);

function fromMeeting(
  meeting: Meeting | null,
  contactId: string | undefined,
  status: Status | undefined,
): Values {
  return {
    contactId: meeting?.contact_id ?? contactId ?? null,
    kind: (meeting?.kind as NonNullable<MeetingKind> | undefined) ?? "call",
    title: meeting?.title ?? "",
    status: status ?? (meeting?.status as Status) ?? "scheduled",
    startsAt: meeting ? dayjs(meeting.starts_at).format(PICKER) : nextHour(),
    location: meeting?.location ?? "",
    meetingUrl: meeting?.meeting_url ?? "",
    applicationId: meeting?.application_id ?? null,
    agenda: meeting?.agenda ?? "",
    notes: meeting?.notes ?? "",
  };
}

/**
 * Book a call or meeting with someone, or log one you've had. Mount with a `key` per meeting
 * so the form starts fresh. `status` opens it straight at "done" (to say how it went).
 */
export function MeetingFormModal({
  opened,
  onClose,
  meeting,
  contactId,
  status,
}: {
  opened: boolean;
  onClose: () => void;
  meeting: Meeting | null;
  contactId?: string;
  status?: Status;
}) {
  const { data: contacts } = useContacts();
  const { data: apps } = useApplications({});
  const save = useSaveMeeting();
  const t = useT();
  const form = useForm<Values>({
    initialValues: fromMeeting(meeting, contactId, status),
    validate: {
      contactId: (v) => (v ? null : t("plans.whoRequired")),
      startsAt: (v) => (v ? null : t("plans.whenRequired")),
      meetingUrl: isLink,
    },
  });
  const done = form.values.status === "done";

  const submit = form.onSubmit((v) => {
    const body = {
      contact_id: v.contactId!,
      kind: v.kind,
      title: blank(v.title),
      status: v.status,
      starts_at: dayjs(v.startsAt).toISOString(),
      location: blank(v.location),
      meeting_url: blank(v.meetingUrl),
      application_id: v.applicationId,
      agenda: blank(v.agenda),
      notes: blank(v.notes),
    };
    save.mutate(meeting ? { id: meeting.id, body } : { body }, { onSuccess: onClose });
  });

  const title = meeting
    ? status === "done"
      ? t("plans.howDidItGo")
      : t("plans.editNamed", { name: meeting.label })
    : t("plans.bookACall");
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg">
      <form onSubmit={submit}>
        <Stack>
          <Group grow align="flex-start">
            <Select
              label={t("plans.withLabel")}
              placeholder={t("plans.pickPerson")}
              searchable
              data={(contacts ?? []).map((c) => ({ value: c.id, label: c.name }))}
              disabled={!!contactId && !meeting}
              {...form.getInputProps("contactId")}
            />
            <TextInput
              label={t("plans.aboutLabel")}
              placeholder={t("plans.aboutPlaceholder")}
              {...form.getInputProps("title")}
            />
          </Group>
          <Group grow align="flex-start">
            <DateTimePicker
              label={t("plans.when")}
              valueFormat="D MMM YYYY HH:mm"
              {...form.getInputProps("startsAt")}
            />
            <div>
              <Text size="sm" fw={500} mb={4}>
                {t("plans.howLabel")}
              </Text>
              <SegmentedControl
                fullWidth
                aria-label={t("plans.howLabel")}
                data={MEETING_KINDS}
                {...form.getInputProps("kind")}
              />
            </div>
          </Group>
          <div>
            <Text size="sm" fw={500} mb={4}>
              {t("plans.statusLabel")}
            </Text>
            <SegmentedControl
              aria-label={t("plans.statusLabel")}
              data={[
                { value: "scheduled", label: t("plans.statusBooked") },
                { value: "done", label: t("plans.happened") },
                { value: "cancelled", label: t("plans.didntHappen") },
              ]}
              {...form.getInputProps("status")}
            />
          </div>
          {form.values.kind === "in_person" ? (
            <TextInput
              label={t("plans.where")}
              placeholder={t("plans.wherePlaceholder")}
              {...form.getInputProps("location")}
            />
          ) : (
            <TextInput
              label={form.values.kind === "video" ? t("plans.meetingLink") : t("plans.linkOptional")}
              placeholder="https://…"
              {...form.getInputProps("meetingUrl")}
            />
          )}
          <Select
            label={t("plans.aboutApplication")}
            description={t("plans.aboutApplicationHint")}
            placeholder={t("plans.notAboutOne")}
            searchable
            clearable
            data={(apps ?? []).map((a) => ({ value: a.id, label: `${a.company_name} · ${a.role_title}` }))}
            {...form.getInputProps("applicationId")}
          />
          {!done && (
            <Textarea
              label={t("plans.agenda")}
              description={t("plans.agendaHint")}
              autosize
              minRows={2}
              {...form.getInputProps("agenda")}
            />
          )}
          {done && (
            <Textarea
              label={t("plans.howDidItGo")}
              description={t("plans.notesHint")}
              autosize
              minRows={3}
              data-autofocus
              {...form.getInputProps("notes")}
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("shared.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {meeting ? t("plans.save") : done ? t("plans.logCall") : t("plans.bookCall")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

const STATUS_BADGE: Record<string, { key: Key; color: string }> = {
  scheduled: { key: "plans.statusBooked", color: "blue" },
  done: { key: "plans.happened", color: "teal" },
  cancelled: { key: "plans.didntHappen", color: "gray" },
};

/** One call: what, when, who with; `action` sits on the right. */
export function MeetingLine({
  meeting,
  action,
  showWho = true,
}: {
  meeting: Meeting;
  action?: ReactNode;
  showWho?: boolean;
}) {
  const t = useT();
  const where = meeting.agency_name ?? meeting.company_name;
  // The date stays on one line beside the title; buttons get a line of their own underneath.
  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <div style={{ minWidth: 0 }}>
          <Text fw={600} size="sm" truncate="end">
            {meeting.label}
          </Text>
          <Group gap={6}>
            {showWho && (
              <Anchor component={Link} to={`/people/${meeting.contact_id}`} size="xs">
                <PersonName id={meeting.contact_id} name={meeting.contact_name} size={12} />
                {where ? ` · ${where}` : ""}
              </Anchor>
            )}
            {meeting.application_id && (
              <Anchor component={Link} to={`/applications/${meeting.application_id}`} size="xs">
                {meeting.application_company_name} · {meeting.role_title}
              </Anchor>
            )}
            {meeting.meeting_url && meeting.status === "scheduled" && (
              <Anchor href={meeting.meeting_url} target="_blank" rel="noreferrer" size="xs">
                {t("plans.joinLink")}
              </Anchor>
            )}
          </Group>
        </div>
        <Text size="xs" c="dimmed" ta="right" style={{ whiteSpace: "nowrap" }}>
          {formatDateTime(meeting.starts_at)}
        </Text>
      </Group>
      {action && (
        <Group gap={6} wrap="wrap">
          {action}
        </Group>
      )}
    </Stack>
  );
}

/** "Happened" (opens the form to say how it went) and "Didn't happen", for a call whose time has passed. */
export function MeetingOutcome({ meeting }: { meeting: Meeting }) {
  const t = useT();
  const [closing, setClosing] = useState(false);
  return (
    <Group gap={4} wrap="nowrap">
      <Button
        size="compact-xs"
        variant="light"
        color="teal"
        aria-label={t("plans.happenedAria", { name: meeting.label })}
        onClick={() => setClosing(true)}
      >
        {t("plans.happened")}
      </Button>
      <MeetingDidntHappen meeting={meeting} />
      {closing && (
        <MeetingFormModal
          key={meeting.id}
          opened
          onClose={() => setClosing(false)}
          meeting={meeting}
          status="done"
        />
      )}
    </Group>
  );
}

function MeetingMenu({ meeting, onEdit }: { meeting: Meeting; onEdit: () => void }) {
  const del = useDeleteMeeting();
  const t = useT();
  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={t("plans.moreFor", { name: meeting.label })}>
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={onEdit}>{t("shared.edit")}</Menu.Item>
        <Menu.Item color="red" onClick={() => del.mutate(meeting.id)}>
          {t("shared.delete")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

/** A person's calls and meetings: booked ones first, then what happened, with notes. */
export function MeetingsCard({ contactId, name }: { contactId: string; name: string }) {
  const t = useT();
  const { data: meetings } = useMeetings({ contact_id: contactId });
  const [editing, setEditing] = useState<Meeting | "new" | null>(null);
  const [addingRoles, setAddingRoles] = useState<string | null>(null); // the call they came up in
  const { data: roles } = useRoleSummaries({ contact_id: contactId });
  const [now] = useState(() => Date.now()); // when the page opened: good enough to split ahead from past
  const all = meetings ?? [];
  const ahead = all.filter((m) => m.status === "scheduled" && new Date(m.starts_at).getTime() >= now);
  const toClose = all.filter((m) => m.status === "scheduled" && new Date(m.starts_at).getTime() < now);
  const past = all.filter((m) => m.status !== "scheduled").reverse(); // newest first

  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Title order={4}>{t("plans.callsTitle")}</Title>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPhone size={14} />}
          onClick={() => setEditing("new")}
        >
          {t("plans.bookACall")}
        </Button>
      </Group>
      {all.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t("plans.noCalls", { name })}
        </Text>
      ) : (
        <Stack gap="sm">
          {[...ahead, ...toClose].map((m) => (
            <Stack key={m.id} gap={4}>
              <MeetingLine
                meeting={m}
                showWho={false}
                action={
                  <Group gap={4} wrap="nowrap">
                    {toClose.includes(m) && <MeetingOutcome meeting={m} />}
                    <MeetingMenu meeting={m} onEdit={() => setEditing(m)} />
                  </Group>
                }
              />
              {m.agenda && (
                <Text size="sm" component="div" c="dimmed">
                  <Markdown>{m.agenda}</Markdown>
                </Text>
              )}
              {(roles ?? [])
                .filter((r) => r.meeting_id === m.id)
                .map((r) => (
                  <RoleLine key={r.id} role={r} showSource={false} />
                ))}
            </Stack>
          ))}
          {past.map((m) => (
            <Stack key={m.id} gap={4}>
              <MeetingLine
                meeting={m}
                showWho={false}
                action={
                  <Group gap={4} wrap="nowrap">
                    <Badge size="xs" variant="light" color={STATUS_BADGE[m.status]?.color}>
                      {STATUS_BADGE[m.status] ? t(STATUS_BADGE[m.status]!.key) : m.status}
                    </Badge>
                    <MeetingMenu meeting={m} onEdit={() => setEditing(m)} />
                  </Group>
                }
              />
              {m.notes && (
                <Text size="sm" component="div" c="dimmed">
                  <Markdown>{m.notes}</Markdown>
                </Text>
              )}
              {m.status === "done" && (
                <Stack
                  gap={4}
                  pl="sm"
                  style={{ borderLeft: "2px solid var(--mantine-color-default-border)" }}
                >
                  {(roles ?? [])
                    .filter((r) => r.meeting_id === m.id)
                    .map((r) => (
                      <RoleLine key={r.id} role={r} showSource={false} />
                    ))}
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<IconPlus size={12} />}
                    onClick={() => setAddingRoles(m.id)}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {t("plans.addRolesFromCall")}
                  </Button>
                </Stack>
              )}
            </Stack>
          ))}
        </Stack>
      )}
      {addingRoles && (
        <RoleFormModal
          opened
          onClose={() => setAddingRoles(null)}
          contactId={contactId}
          meetingId={addingRoles}
        />
      )}
      {editing && (
        <MeetingFormModal
          key={editing === "new" ? "new" : editing.id}
          opened
          onClose={() => setEditing(null)}
          meeting={editing === "new" ? null : editing}
          contactId={contactId}
        />
      )}
    </Card>
  );
}
