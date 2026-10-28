import {
  Autocomplete,
  Button,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { useForm } from "@mantine/form";
import dayjs from "dayjs";

import { useContacts } from "../api/hooks";
import {
  KIND_OPTIONS,
  useInterviewTitles,
  useSaveInterview,
  type Interview,
  type InterviewKind,
} from "../api/interviewHooks";
import { t, useT } from "../i18n";

type Status = "scheduled" | "done" | "cancelled";
type Format = "video" | "phone" | "onsite" | "take_home";

interface Values {
  round: number | string;
  title: string;
  kind: NonNullable<InterviewKind>;
  status: Status;
  startsAt: string | null;
  deadlineAt: string | null;
  format: Format | null;
  location: string;
  meetingUrl: string;
  interviewerIds: string[];
  prep: string;
  debrief: string;
  questions: string;
  taskInstructions: string;
  taskRepoUrl: string;
}

const PICKER = "YYYY-MM-DD HH:mm:ss";
const toPicker = (iso: string | null | undefined) => (iso ? dayjs(iso).format(PICKER) : null);
const toIso = (local: string | null) => (local ? dayjs(local).toISOString() : null);
const blank = (s: string) => s.trim() || null;
const isLink = (v: string) => (!v || /^https?:\/\//.test(v) ? null : t("plans.linkInvalid"));

function fromInterview(interview: Interview | null, nextRound: number): Values {
  return {
    round: interview?.round ?? nextRound,
    title: interview?.title ?? "",
    kind: (interview?.kind as Values["kind"]) ?? "technical",
    status: (interview?.status as Status) ?? "scheduled",
    startsAt: toPicker(interview?.starts_at),
    deadlineAt: toPicker(interview?.deadline_at),
    format: (interview?.format as Format | null) ?? null,
    location: interview?.location ?? "",
    meetingUrl: interview?.meeting_url ?? "",
    interviewerIds: interview?.interviewer_ids ?? [],
    prep: interview?.prep ?? "",
    debrief: interview?.debrief ?? "",
    questions: interview?.questions ?? "",
    taskInstructions: interview?.task_instructions ?? "",
    taskRepoUrl: interview?.task_repo_url ?? "",
  };
}

/**
 * Add or edit an interview round: which round it is, what it is in your own words
 * ("Engineering manager chat"), when, who with, and prep and debrief notes.
 * Mount it with a `key` per interview so the form starts fresh for each.
 */
export function InterviewFormModal({
  opened,
  onClose,
  applicationId,
  interview,
  nextRound,
}: {
  opened: boolean;
  onClose: () => void;
  applicationId: string;
  interview: Interview | null;
  nextRound: number;
}) {
  const { data: titles } = useInterviewTitles();
  const { data: contacts } = useContacts();
  const save = useSaveInterview();
  const t = useT();
  const form = useForm<Values>({
    initialValues: fromInterview(interview, nextRound),
    validate: {
      round: (v) => (Number(v) >= 1 && Number(v) <= 99 ? null : t("plans.roundRange")),
      meetingUrl: isLink,
      taskRepoUrl: isLink,
    },
  });
  const isTask = form.values.kind === "coding_task" || form.values.format === "take_home";

  const submit = form.onSubmit((v) => {
    const body = {
      round: Number(v.round),
      title: blank(v.title),
      kind: v.kind,
      status: v.status,
      starts_at: toIso(v.startsAt),
      deadline_at: isTask ? toIso(v.deadlineAt) : null, // only tasks have a due date
      format: v.format,
      location: blank(v.location),
      meeting_url: blank(v.meetingUrl),
      interviewer_ids: v.interviewerIds,
      prep: blank(v.prep),
      debrief: blank(v.debrief),
      questions: blank(v.questions),
      task_instructions: blank(v.taskInstructions),
      task_repo_url: blank(v.taskRepoUrl),
    };
    save.mutate(interview ? { id: interview.id, body } : { applicationId, body }, { onSuccess: onClose });
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={interview ? t("plans.editNamed", { name: interview.label }) : t("plans.addInterviewRound")}
      size="lg"
    >
      <form onSubmit={submit}>
        <Stack>
          <Group align="flex-start" wrap="nowrap">
            <NumberInput label={t("plans.round")} min={1} max={99} w={90} {...form.getInputProps("round")} />
            <Autocomplete
              label={t("plans.whatIsIt")}
              placeholder={t("plans.whatIsItPlaceholder")}
              data={titles ?? []}
              style={{ flex: 1 }}
              data-autofocus
              {...form.getInputProps("title")}
            />
          </Group>
          <Group grow align="flex-start">
            <Select
              label={t("plans.typeLabel")}
              data={KIND_OPTIONS}
              allowDeselect={false}
              {...form.getInputProps("kind")}
            />
            <Select
              label={t("plans.format")}
              placeholder={t("plans.notSet")}
              clearable
              data={[
                { value: "video", label: t("plans.videoCall") },
                { value: "phone", label: t("plans.phone") },
                { value: "onsite", label: t("plans.inPerson") },
                { value: "take_home", label: t("plans.takeHome") },
              ]}
              {...form.getInputProps("format")}
            />
          </Group>
          <SegmentedControl
            aria-label={t("plans.statusLabel")}
            data={[
              { value: "scheduled", label: t("plans.roundComingUp") },
              { value: "done", label: t("plans.done") },
              { value: "cancelled", label: t("plans.cancelled") },
            ]}
            {...form.getInputProps("status")}
          />
          <Group grow align="flex-start">
            <DateTimePicker
              label={t("plans.when")}
              placeholder={t("plans.notBookedYet")}
              clearable
              {...form.getInputProps("startsAt")}
            />
            {isTask && (
              <DateTimePicker
                label={t("plans.due")}
                placeholder={t("plans.noDeadline")}
                clearable
                {...form.getInputProps("deadlineAt")}
              />
            )}
          </Group>
          <Group grow align="flex-start">
            <TextInput
              label={t("plans.meetingLink")}
              placeholder="https://…"
              {...form.getInputProps("meetingUrl")}
            />
            <TextInput
              label={t("plans.location")}
              placeholder={t("plans.officeFloor")}
              {...form.getInputProps("location")}
            />
          </Group>
          <MultiSelect
            label={t("plans.interviewers")}
            placeholder={t("plans.pickPeople")}
            searchable
            data={(contacts ?? []).map((c) => ({ value: c.id, label: c.name }))}
            {...form.getInputProps("interviewerIds")}
          />
          {isTask && (
            <>
              <Textarea
                label={t("plans.taskInstructions")}
                autosize
                minRows={2}
                {...form.getInputProps("taskInstructions")}
              />
              <TextInput
                label={t("plans.repoLink")}
                placeholder="https://…"
                {...form.getInputProps("taskRepoUrl")}
              />
            </>
          )}
          <Textarea
            label={t("plans.prep")}
            placeholder={t("plans.prepPlaceholder")}
            autosize
            minRows={2}
            {...form.getInputProps("prep")}
          />
          <Textarea
            label={t("plans.debrief")}
            placeholder={t("plans.debriefPlaceholder")}
            autosize
            minRows={2}
            {...form.getInputProps("debrief")}
          />
          <Textarea
            label={t("plans.questionsAsked")}
            autosize
            minRows={2}
            {...form.getInputProps("questions")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("shared.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {interview ? t("plans.save") : t("plans.addRound")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
