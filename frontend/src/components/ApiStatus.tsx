import { Group, Text, Tooltip } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";

import { useT } from "../i18n";

interface Health {
  status: string;
  version: string;
  schema: string | null;
  schema_head: string;
  git_repo: boolean;
}

async function fetchHealth(): Promise<Health> {
  const res = await fetch("/api/v1/health");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<Health>;
}

/** A small connection indicator for the navbar footer. */
export function ApiStatus() {
  const t = useT();
  const { data, isError, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  const [color, label, detail] = isPending
    ? ["gray", t("shell.api.checking"), t("shell.api.checkingHint")]
    : isError || !data
      ? [t("shell.api.offline"), t("shell.api.offlineHint")]
      : [
          data.git_repo ? "teal" : "yellow",
          t("shell.api.connected"),
          `${t("shell.api.version", { version: data.version, schema: data.schema ?? "?" })}${data.git_repo ? t("shell.api.backups") : t("shell.api.noGitRepo")}`,
        ];

  return (
    <Tooltip label={detail} position="top-start">
      <Group gap={6} wrap="nowrap" aria-live="polite">
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: `var(--mantine-color-${color}-6)`,
            display: "inline-block",
          }}
        />
        <Text size="xs" c="dimmed">
          {label}
        </Text>
      </Group>
    </Tooltip>
  );
}
