import { ActionIcon, Button, Group, Menu, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBellRinging, IconGhost2, IconZzz } from "@tabler/icons-react";
import dayjs from "dayjs";

import type { ApplicationRow } from "../api/client";
import { useMoveApplication, useUpdateApplication, useWorkflow } from "../api/hooks";
import { useT, type Key } from "../i18n";

const inDays = (n: number) => dayjs().add(n, "day").format("YYYY-MM-DD");

const FOLLOW_UP: { labelKey: Key; days: number }[] = [
  { labelKey: "applications.followUpTomorrow", days: 1 },
  { labelKey: "applications.followUpIn3Days", days: 3 },
  { labelKey: "applications.followUpNextWeek", days: 7 },
];
const SNOOZE: { labelKey: Key; days: number }[] = [
  { labelKey: "applications.snooze3Days", days: 3 },
  { labelKey: "applications.snooze1Week", days: 7 },
  { labelKey: "applications.snooze2Weeks", days: 14 },
];

/**
 * One-click chasing on Today (PRD FR18): set a follow-up date, snooze, or give up and
 * mark it Ghosted. Every move is on the timeline and can be undone from the application.
 */
export function ChaseActions({ row }: { row: ApplicationRow }) {
  const t = useT();
  const update = useUpdateApplication();
  const move = useMoveApplication();
  const { data: workflow } = useWorkflow();
  const ghosted = workflow?.stages.find((s) => s.id === "ghosted");
  // Only offer Ghosted where the workflow allows that move (always, with any-to-any moves).
  const canGhost =
    !!ghosted &&
    row.stage !== ghosted.id &&
    (workflow?.transitions === "any" ||
      !!workflow?.stages.find((s) => s.id === row.stage)?.allowed_next.includes(ghosted.id));
  const busy = update.isPending || move.isPending;

  const set = (body: { follow_up_on?: string; snoozed_until?: string }, message: string) =>
    update.mutate(
      { id: row.id, body },
      { onSuccess: () => notifications.show({ message: `${row.company_name}: ${message}` }) },
    );

  return (
    <Group gap={2} wrap="nowrap">
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Tooltip label={t("applications.followUpTooltip")}>
            <ActionIcon
              variant="subtle"
              color="blue"
              loading={update.isPending}
              disabled={busy}
              aria-label={t("applications.followUpAria", { name: row.company_name })}
            >
              <IconBellRinging size={16} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{t("applications.remindFollowUp")}</Menu.Label>
          {FOLLOW_UP.map((o) => (
            <Menu.Item
              key={o.days}
              onClick={() =>
                set(
                  { follow_up_on: inDays(o.days) },
                  t("applications.toastFollowUp", { when: t(o.labelKey).toLowerCase() }),
                )
              }
            >
              {t(o.labelKey)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      <Menu position="bottom-end" withinPortal>
        <Menu.Target>
          <Tooltip label={t("applications.snoozeTooltip")}>
            <ActionIcon
              variant="subtle"
              color="gray"
              disabled={busy}
              aria-label={t("applications.snoozeAria", { name: row.company_name })}
            >
              <IconZzz size={16} />
            </ActionIcon>
          </Tooltip>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>{t("applications.snoozeFor")}</Menu.Label>
          {SNOOZE.map((o) => (
            <Menu.Item
              key={o.days}
              onClick={() =>
                set(
                  { snoozed_until: inDays(o.days) },
                  t("applications.toastSnoozed", { when: t(o.labelKey) }),
                )
              }
            >
              {t(o.labelKey)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
      {ghosted && canGhost && (
        <Tooltip label={t("applications.markAsTooltip", { stage: ghosted.name })}>
          <Button
            size="compact-xs"
            variant="subtle"
            color="gray"
            leftSection={<IconGhost2 size={14} />}
            loading={move.isPending}
            disabled={busy}
            aria-label={t("applications.markStageAria", { company: row.company_name, stage: ghosted.name })}
            onClick={() => {
              if (
                !window.confirm(
                  t("applications.markStageConfirm", { company: row.company_name, stage: ghosted.name }),
                )
              )
                return;
              move.mutate(
                { id: row.id, to_stage: ghosted.id, stageName: ghosted.name, note: "No reply" },
                {
                  onSuccess: () =>
                    notifications.show({
                      message: t("applications.markedStage", {
                        company: row.company_name,
                        stage: ghosted.name,
                      }),
                    }),
                },
              );
            }}
          >
            {ghosted.name}
          </Button>
        </Tooltip>
      )}
    </Group>
  );
}
