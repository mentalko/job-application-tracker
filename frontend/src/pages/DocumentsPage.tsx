import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";

import { CvFilesCard } from "../components/CvFiles";
import {
  KIND_LABEL,
  useAddVersion,
  useCreateDocument,
  useDeleteDocument,
  useDeleteVersion,
  useDocument,
  useDocuments,
  type DocumentItem,
  type DocumentVersion,
} from "../api/documentHooks";
import { humanSize } from "../components/Attachments";
import { useT } from "../i18n";
import { formatDate } from "../utils/time";

type Kind = "cv" | "cover_letter" | "other";

function NewDocumentModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const create = useCreateDocument();
  const form = useForm({
    initialValues: { kind: "cv" as Kind, name: "" },
    validate: { name: (v) => (v.trim() ? null : t("library.nameRequired")) },
  });
  return (
    <Modal opened onClose={onClose} title={t("library.newDocument")}>
      <form
        onSubmit={form.onSubmit((v) =>
          create.mutate({ kind: v.kind, name: v.name.trim() }, { onSuccess: onClose }),
        )}
      >
        <Stack>
          <SegmentedControl
            aria-label={t("library.kindAria")}
            data={[
              { value: "cv", label: t("library.kindCvSingular") },
              { value: "cover_letter", label: t("library.kindCoverLetterSingular") },
              { value: "other", label: t("library.kindOtherSingular") },
            ]}
            {...form.getInputProps("kind")}
          />
          <TextInput
            label={t("library.nameLabel")}
            placeholder={t("library.namePlaceholder")}
            data-autofocus
            {...form.getInputProps("name")}
          />
          <Group justify="flex-end">
            <Button type="submit" loading={create.isPending}>
              {t("library.create")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function AddVersionModal({ doc, onClose }: { doc: DocumentItem; onClose: () => void }) {
  const t = useT();
  const add = useAddVersion(doc.id);
  const [file, setFile] = useState<File | null>(null);
  const form = useForm({
    initialValues: { label: `v${doc.versions.length + 1}`, notes: "" },
    validate: { label: (v) => (v.trim() ? null : t("library.versionRequired")) },
  });
  return (
    <Modal opened onClose={onClose} title={t("library.newVersionOf", { name: doc.name })}>
      <form
        onSubmit={form.onSubmit((v) =>
          add.mutate({ label: v.label.trim(), notes: v.notes.trim(), file }, { onSuccess: onClose }),
        )}
      >
        <Stack>
          <TextInput label={t("library.labelLabel")} data-autofocus {...form.getInputProps("label")} />
          <TextInput
            label={t("library.whatChanged")}
            placeholder={t("library.whatChangedPlaceholder")}
            {...form.getInputProps("notes")}
          />
          <Group>
            <FileButton onChange={setFile} accept=".pdf,.doc,.docx,.odt,.md,.txt">
              {(props) => (
                <Button {...props} variant="default" leftSection={<IconUpload size={14} />}>
                  {file ? t("library.changeFile") : t("library.chooseFile")}
                </Button>
              )}
            </FileButton>
            <Text size="sm" c="dimmed">
              {file ? `${file.name} (${humanSize(file.size)})` : t("library.optionalHint")}
            </Text>
          </Group>
          <Group justify="flex-end">
            <Button type="submit" loading={add.isPending}>
              {t("library.addVersion")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function VersionRow({ version }: { version: DocumentVersion }) {
  const t = useT();
  const remove = useDeleteVersion();
  return (
    <Group justify="space-between" wrap="nowrap">
      <div style={{ minWidth: 0 }}>
        <Group gap={6} wrap="nowrap">
          <Text size="sm" fw={600}>
            {version.label}
          </Text>
          {version.used_in > 0 && (
            <Badge size="xs" variant="light">
              {t("library.sentTimes", { n: version.used_in })}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {formatDate(dayjs(version.created_at).format("YYYY-MM-DD"))}
          {version.notes ? ` · ${version.notes}` : ""}
        </Text>
        {version.file && (
          <Anchor
            href={version.file.url}
            target={version.file.inline ? "_blank" : undefined}
            download={version.file.inline ? undefined : version.file.original_name}
            rel="noreferrer noopener"
            size="xs"
          >
            {version.file.original_name} ({humanSize(version.file.size)})
          </Anchor>
        )}
      </div>
      <Tooltip label={version.used_in ? t("library.sentWithApps") : t("library.deleteVersion")}>
        <ActionIcon
          variant="subtle"
          color="gray"
          disabled={version.used_in > 0}
          loading={remove.isPending}
          onClick={() =>
            window.confirm(t("library.confirmDeleteVersion", { name: version.label })) &&
            remove.mutate(version.id)
          }
          aria-label={t("library.deleteAria", { name: version.label })}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

function WhereUsed({ id }: { id: string }) {
  const t = useT();
  const { data } = useDocument(id);
  if (!data) return <Loader size="xs" />;
  if (!data.used_in.length) {
    return (
      <Text size="sm" c="dimmed">
        {t("library.notSentYet")}
      </Text>
    );
  }
  return (
    <Stack gap={4}>
      {data.used_in.map((u) => (
        <Text key={u.link_id} size="sm">
          <Anchor component={Link} to={`/applications/${u.application_id}`} size="sm">
            {u.company_name} · {u.role_title}
          </Anchor>{" "}
          <Text span size="xs" c="dimmed">
            {u.version_label}
            {u.sent_on ? ` · ${formatDate(u.sent_on)}` : ""} · {u.stage_name}
          </Text>
        </Text>
      ))}
    </Stack>
  );
}

function DocumentCard({ doc }: { doc: DocumentItem }) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [showUsage, setShowUsage] = useState(false);
  const remove = useDeleteDocument();
  const sent = doc.versions.reduce((n, v) => n + v.used_in, 0);
  const Chevron = showUsage ? IconChevronDown : IconChevronRight;
  return (
    <Card withBorder>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs">
            <IconFileText size={20} stroke={1.6} />
            <Title order={4}>{doc.name}</Title>
            <Badge variant="light" color="gray">
              {KIND_LABEL[doc.kind] ?? doc.kind}
            </Badge>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={() => setAdding(true)}
            >
              {t("library.newVersion")}
            </Button>
            <Tooltip label={sent ? t("library.sentWithApps") : t("library.deleteDocument")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                disabled={sent > 0}
                onClick={() =>
                  window.confirm(t("library.confirmDeleteDocument", { name: doc.name })) &&
                  remove.mutate(doc.id)
                }
                aria-label={t("library.deleteAria", { name: doc.name })}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
        {doc.versions.map((v) => (
          <VersionRow key={v.id} version={v} />
        ))}
        {!doc.versions.length && (
          <Text size="sm" c="dimmed">
            {t("library.noVersionsYet")}
          </Text>
        )}
        <UnstyledButton onClick={() => setShowUsage((s) => !s)} aria-expanded={showUsage}>
          <Group gap={4}>
            <Chevron size={14} />
            <Text size="sm" fw={500}>
              {t("library.whereUsed", { n: sent })}
            </Text>
          </Group>
        </UnstyledButton>
        {showUsage && <WhereUsed id={doc.id} />}
      </Stack>
      {adding && <AddVersionModal doc={doc} onClose={() => setAdding(false)} />}
    </Card>
  );
}

/** CVs and cover letters, with every version and where each was sent (PRD FR14). */
export function DocumentsPage() {
  const t = useT();
  const { data: documents, isLoading } = useDocuments();
  const [creating, setCreating] = useState(false);
  return (
    <Stack maw={900}>
      <Group justify="space-between">
        <Group gap="sm">
          <IconFileText size={26} stroke={1.6} />
          <Title order={2}>{t("library.documents")}</Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          {t("library.newDocument")}
        </Button>
      </Group>
      <CvFilesCard />
      {isLoading || !documents ? (
        <Loader />
      ) : documents.length ? (
        documents.map((doc) => <DocumentCard key={doc.id} doc={doc} />)
      ) : (
        <Card withBorder p="xl">
          <Text ta="center" c="dimmed">
            {t("library.emptyPage")}
          </Text>
        </Card>
      )}
      {creating && <NewDocumentModal onClose={() => setCreating(false)} />}
    </Stack>
  );
}
