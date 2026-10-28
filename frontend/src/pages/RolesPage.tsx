import { Button, Card, Group, Loader, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { IconListDetails, IconPlus } from "@tabler/icons-react";
import { useState } from "react";

import { useRoleSummaries, type RoleStatus } from "../api/roleHooks";
import { useT, type Key } from "../i18n";
import { RoleFormModal, RoleLine } from "../components/Roles";

const VIEWS: { value: RoleStatus | "all"; key: Key }[] = [
  { value: "to_decide", key: "plans.viewToDecide" },
  { value: "interested", key: "plans.interested" },
  { value: "applied", key: "plans.viewApplied" },
  { value: "closed", key: "plans.viewClosed" },
  { value: "passed", key: "plans.passed" },
  { value: "all", key: "plans.viewAll" },
];

const EMPTY: Record<RoleStatus | "all", Key> = {
  to_decide: "plans.emptyToDecide",
  interested: "plans.emptyInterested",
  applied: "plans.emptyApplied",
  closed: "plans.emptyClosed",
  passed: "plans.emptyPassed",
  all: "plans.emptyAll",
};

/** Roles before you apply: pitched by a recruiter or spotted, then applied for or passed on. */
export function RolesPage() {
  const t = useT();
  const [view, setView] = useState<RoleStatus | "all">("to_decide");
  const [adding, setAdding] = useState(false);
  const { data: roles, isLoading } = useRoleSummaries(view === "all" ? {} : { status: view });

  return (
    <Stack maw={1000}>
      <Group justify="space-between" align="flex-end">
        <div>
          <Group gap="sm">
            <IconListDetails size={26} stroke={1.6} />
            <Title order={2}>{t("plans.roles")}</Title>
          </Group>
          <Text c="dimmed" size="sm">
            {t("plans.rolesSubtitle")}
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setAdding(true)}>
          {t("plans.addRole")}
        </Button>
      </Group>
      <SegmentedControl
        value={view}
        onChange={(v) => setView(v as RoleStatus | "all")}
        data={VIEWS.map(({ value, key }) => ({ value, label: t(key) }))}
        aria-label={t("plans.showAria")}
        style={{ alignSelf: "flex-start" }}
      />
      {isLoading ? (
        <Loader />
      ) : !roles?.length ? (
        <Card withBorder p="xl">
          <Text c="dimmed" size="sm" ta="center">
            {t(EMPTY[view])}
          </Text>
        </Card>
      ) : (
        <Card withBorder>
          <Stack gap="sm">
            {roles.map((r) => (
              <RoleLine key={r.id} role={r} />
            ))}
          </Stack>
        </Card>
      )}
      {adding && <RoleFormModal opened onClose={() => setAdding(false)} />}
    </Stack>
  );
}
