import {
  Anchor,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileCv } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAdoptCvFile, useCvFiles, useDocuments, type CvFile } from "../api/documentHooks";
import { t, useT } from "../i18n";

const NOT_A_CV = "jat.notACv";

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOT_A_CV) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

const kb = (size: number) =>
  size < 1024
    ? t("library.sizeB", { n: size })
    : size < 1024 * 1024
      ? t("library.sizeKb", { n: Math.round(size / 1024) })
      : t("library.sizeMb", { n: (size / 1048576).toFixed(1) });
const stem = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, 100);

/** Make a file a version: of an existing document, or a new one. */
const HREF = { application: "/applications", role: "/roles", contact: "/people" } as const;
const sourcePrefix = (kind: string): string =>
  kind === "role" ? t("library.prefixRole") : kind === "contact" ? t("library.prefixContact") : "";

/** Make a file a version (of an existing CV or a new one), or record the version it already is,
 * on the applications you tick. */
function AdoptModal({ file, onClose }: { file: CvFile; onClose: () => void }) {
  const t = useT();
  const { data: documents } = useDocuments();
  const adopt = useAdoptCvFile();
  const cvs = (documents ?? []).filter((d) => d.kind === "cv");
  const [picked, setDocumentId] = useState<string | null>(null);
  // Your first CV once they've loaded, unless you've picked one.
  const documentId = picked ?? cvs[0]?.id ?? "new";
  const [name, setName] = useState("CV");
  const [label, setLabel] = useState(stem(file.name));
  const missing = file.applications.filter((a) => !a.has_it);
  const [ticked, setTicked] = useState<string[]>(missing.map((a) => a.id));
  const isNew = documentId === "new";
  const recordOnly = file.version !== null;
  const ready = recordOnly ? ticked.length > 0 : label.trim() && (!isNew || name.trim());
  const save = () =>
    adopt.mutate(
      recordOnly
        ? { sha256: file.sha256, kind: "cv", application_ids: ticked }
        : isNew
          ? {
              sha256: file.sha256,
              document_name: name.trim(),
              kind: "cv",
              label: label.trim(),
              application_ids: ticked,
            }
          : {
              sha256: file.sha256,
              document_id: documentId,
              kind: "cv",
              label: label.trim(),
              application_ids: ticked,
            },
      {
        onSuccess: (r) => {
          const apps = t("library.nApplications", { n: r.recorded });
          notifications.show({
            message: recordOnly
              ? t("library.recordedSentToast", { apps })
              : t("library.madeVersionToast", { label: label.trim(), apps }),
          });
          onClose();
        },
      },
    );
  return (
    <Modal
      opened
      onClose={onClose}
      title={
        recordOnly
          ? t("library.recordAsSentTitle", { name: file.version!.document_name, label: file.version!.label })
          : t("library.makeVersionTitle", { name: file.name })
      }
    >
      <Stack>
        {!recordOnly && (
          <>
            <Select
              label={t("library.addTo")}
              data={[
                ...cvs.map((d) => ({ value: d.id, label: d.name })),
                { value: "new", label: t("library.aNewCv") },
              ]}
              value={documentId}
              onChange={setDocumentId}
              allowDeselect={false}
            />
            {isNew && (
              <TextInput
                label={t("library.newCvName")}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
            )}
            <TextInput
              label={t("library.versionLabel")}
              description={t("library.versionHint")}
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
            />
          </>
        )}
        {missing.length ? (
          <Checkbox.Group
            label={t("library.sentWith")}
            description={t("library.sentWithHint")}
            value={ticked}
            onChange={setTicked}
          >
            <Stack gap={6} mt={6}>
              {missing.map((a) => (
                <Checkbox key={a.id} value={a.id} label={`${a.company_name} · ${a.role_title}`} />
              ))}
            </Stack>
          </Checkbox.Group>
        ) : (
          <Text size="sm" c="dimmed">
            {t("library.noAppsForCvModal")}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {t("library.fileStays")}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            {t("library.cancel")}
          </Button>
          <Button onClick={save} disabled={!ready} loading={adopt.isPending}>
            {recordOnly ? t("library.recordAsSent") : t("library.makeVersion")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function CvFileRow({ file, onDismiss }: { file: CvFile; onDismiss: () => void }) {
  const t = useT();
  const [adopting, setAdopting] = useState(false);
  const missing = file.applications.filter((a) => !a.has_it);
  // Applications it's attached to are already in the list of where it counts.
  const elsewhere = file.sources.filter((x) => x.kind !== "application");
  return (
    <Group justify="space-between" wrap="wrap" gap="xs" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" fw={600}>
          {file.name}{" "}
          <Text span size="xs" c="dimmed" fw={400}>
            {kb(file.size)}
          </Text>
        </Text>
        {file.version && (
          <Text size="xs" c="dimmed">
            {t("library.thisIsVersion", { name: file.version.document_name, label: file.version.label })}
          </Text>
        )}
        {elsewhere.length > 0 && (
          <Text size="xs" c="dimmed">
            {elsewhere.map((x, i) => (
              <span key={`${x.kind}:${x.id}`}>
                {i ? " · " : ""}
                {sourcePrefix(x.kind)}
                <Anchor component={Link} to={`${HREF[x.kind]}/${x.id}`} size="xs">
                  {x.name}
                </Anchor>
              </span>
            ))}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {missing.length
            ? file.version
              ? t("library.notRecordedOn", { n: missing.length })
              : t("library.forApplications", { n: missing.length })
            : t("library.noAppsForCv")}
          {missing.map((a, i) => (
            <span key={a.id}>
              {i ? ", " : ""}
              <Anchor component={Link} to={`/applications/${a.id}`} size="xs">
                {a.company_name} · {a.role_title}
              </Anchor>
            </span>
          ))}
        </Text>
      </div>
      <Group gap="xs">
        <Button size="compact-sm" variant="light" onClick={() => setAdopting(true)}>
          {file.version ? t("library.recordAsSent") : t("library.makeVersion")}
        </Button>
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          onClick={onDismiss}
          aria-label={t("library.notCvAria", { name: file.name })}
        >
          {t("library.notACv")}
        </Button>
      </Group>
      {adopting && <AdoptModal file={file} onClose={() => setAdopting(false)} />}
    </Group>
  );
}

/** The CV files you've attached that aren't recorded as versions yet; nothing when there are none. */
export function CvFilesCard() {
  const t = useT();
  const { data: files } = useCvFiles();
  const [dismissed, setDismissed] = useState(readDismissed);
  const shown = (files ?? []).filter((f) => !dismissed.has(f.sha256));
  const hidden = (files ?? []).length - shown.length;
  if (!shown.length && !hidden) return null;
  const remember = (next: Set<string>) => {
    setDismissed(next);
    try {
      localStorage.setItem(NOT_A_CV, JSON.stringify([...next]));
    } catch {
      // No storage (a private window): only until the page reloads.
    }
  };
  const dismiss = (sha: string) => remember(new Set(dismissed).add(sha));
  // Forget the ones that aren't waiting any more, then show the rest again.
  const showHidden = () => remember(new Set());
  return (
    <Card withBorder>
      <Group gap="xs" mb={4}>
        <IconFileCv size={18} />
        <Title order={4}>{t("library.cvFilesTitle")}</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        {t("library.cvFilesHint")}
      </Text>
      <Stack gap="sm">
        {shown.map((f) => (
          <CvFileRow key={f.sha256} file={f} onDismiss={() => dismiss(f.sha256)} />
        ))}
        {hidden > 0 && (
          <Anchor component="button" type="button" size="xs" c="dimmed" ta="left" onClick={showHidden}>
            {t("library.showHidden", { n: hidden })}
          </Anchor>
        )}
      </Stack>
    </Card>
  );
}

/** How many CV files are waiting to be made versions (for a nudge elsewhere). */
export function useCvFilesToSort() {
  const { data: files } = useCvFiles();
  const dismissed = readDismissed();
  return (files ?? []).filter((f) => f.version === null && !dismissed.has(f.sha256)).length;
}
