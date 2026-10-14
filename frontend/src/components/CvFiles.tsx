import { Anchor, Button, Card, Group, Modal, Select, Stack, Text, TextInput, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileCv } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useAdoptCvFile, useCvFiles, useDocuments, type CvFile } from "../api/documentHooks";

const NOT_A_CV = "jat.notACv";

function readDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOT_A_CV) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

const kb = (size: number) =>
  size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1048576).toFixed(1)} MB`;
const stem = (name: string) => name.replace(/\.[^.]+$/, "").slice(0, 100);

/** Make a file a version: of an existing document, or a new one. */
function MakeVersionModal({ file, onClose }: { file: CvFile; onClose: () => void }) {
  const { data: documents } = useDocuments();
  const adopt = useAdoptCvFile();
  const cvs = (documents ?? []).filter((d) => d.kind === "cv");
  const [documentId, setDocumentId] = useState<string | null>(cvs[0]?.id ?? "new");
  const [name, setName] = useState("CV");
  const [label, setLabel] = useState(stem(file.name));
  const isNew = documentId === "new";
  const ready = label.trim() && (!isNew || name.trim());
  const save = () =>
    adopt.mutate(
      isNew
        ? { sha256: file.sha256, document_name: name.trim(), kind: "cv", label: label.trim() }
        : { sha256: file.sha256, document_id: documentId, kind: "cv", label: label.trim() },
      {
        onSuccess: (r) => {
          notifications.show({
            message: `${label.trim()} is a version now, recorded as sent with ${r.recorded} application${r.recorded === 1 ? "" : "s"}.`,
          });
          onClose();
        },
      },
    );
  return (
    <Modal opened onClose={onClose} title={`Make ${file.name} a CV version`}>
      <Stack>
        <Select
          label="Add it to"
          data={[...cvs.map((d) => ({ value: d.id, label: d.name })), { value: "new", label: "A new CV…" }]}
          value={documentId}
          onChange={setDocumentId}
          allowDeselect={false}
        />
        {isNew && (
          <TextInput
            label="Name of the new CV"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
        )}
        <TextInput
          label="Version"
          description="What sets it apart, e.g. v3 (fintech)"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
        />
        <Text size="sm" c="dimmed">
          It's recorded as sent with the {file.applications.length} application
          {file.applications.length === 1 ? "" : "s"} it's attached to. The file stays on them too.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!ready} loading={adopt.isPending}>
            Make it a version
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function CvFileRow({ file, onDismiss }: { file: CvFile; onDismiss: () => void }) {
  const adopt = useAdoptCvFile();
  const [making, setMaking] = useState(false);
  const missing = file.applications.filter((a) => !a.has_it);
  return (
    <Group justify="space-between" wrap="wrap" gap="xs" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" fw={600}>
          {file.name}{" "}
          <Text span size="xs" c="dimmed" fw={400}>
            {kb(file.size)}
          </Text>
        </Text>
        <Text size="xs" c="dimmed">
          {file.version
            ? `This is ${file.version.document_name} · ${file.version.label}, not yet recorded on `
            : `On ${file.applications.length} application${file.applications.length === 1 ? "" : "s"}: `}
          {(file.version ? missing : file.applications).map((a, i) => (
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
        {file.version ? (
          <Button
            size="compact-sm"
            variant="light"
            loading={adopt.isPending}
            onClick={() =>
              adopt.mutate(
                { sha256: file.sha256, kind: "cv" },
                {
                  onSuccess: (r) =>
                    notifications.show({
                      message: `Recorded as sent with ${r.recorded} more application${r.recorded === 1 ? "" : "s"}.`,
                    }),
                },
              )
            }
          >
            Record as sent
          </Button>
        ) : (
          <Button size="compact-sm" variant="light" onClick={() => setMaking(true)}>
            Make it a version
          </Button>
        )}
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          onClick={onDismiss}
          aria-label={`${file.name} is not a CV`}
        >
          Not a CV
        </Button>
      </Group>
      {making && <MakeVersionModal file={file} onClose={() => setMaking(false)} />}
    </Group>
  );
}

/** The CV files on your applications that aren't recorded as versions yet; nothing when there are none. */
export function CvFilesCard() {
  const { data: files } = useCvFiles();
  const [dismissed, setDismissed] = useState(readDismissed);
  const shown = (files ?? []).filter((f) => !dismissed.has(f.sha256));
  if (!shown.length) return null;
  const dismiss = (sha: string) => {
    const next = new Set(dismissed).add(sha);
    setDismissed(next);
    try {
      localStorage.setItem(NOT_A_CV, JSON.stringify([...next]));
    } catch {
      // No storage (a private window): hidden until the page reloads.
    }
  };
  return (
    <Card withBorder>
      <Group gap="xs" mb={4}>
        <IconFileCv size={18} />
        <Title order={4}>CV files on your applications</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Files you attached to applications that look like a CV (named like one, or the same file on several).
        Make each a version so Insights can compare how they do; the same file counts as the same version.
      </Text>
      <Stack gap="sm">
        {shown.map((f) => (
          <CvFileRow key={f.sha256} file={f} onDismiss={() => dismiss(f.sha256)} />
        ))}
      </Stack>
    </Card>
  );
}

/** How many CV files are waiting to be made versions (for a nudge elsewhere). */
export function useCvFilesToSort() {
  const { data: files } = useCvFiles();
  const dismissed = readDismissed();
  return (files ?? []).filter((f) => !dismissed.has(f.sha256)).length;
}
