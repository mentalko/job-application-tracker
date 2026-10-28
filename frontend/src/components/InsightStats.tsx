import { Badge, Box, Card, Group, Loader, Progress, Stack, Table, Text, Title, Tooltip } from "@mantine/core";
import dayjs from "dayjs";

import { useActivity, type Stats, type Week } from "../api/insightHooks";
import { t, useT, type Key } from "../i18n";

const ROUTE_KEYS: Record<string, Key> = {
  direct: "insights.routeDirect",
  agency: "insights.routeAgency",
  referral: "insights.routeReferral",
};

const percent = (x: number) => `${Math.round(100 * x)}%`;

function days(d: number | null | undefined) {
  if (d == null) return "—";
  if (d < 1) return t("insights.underADay");
  return t("insights.medianDays", { n: d, days: d % 1 === 0 ? d : d.toFixed(1) });
}

/** Per stage: how many got there, how many went on, and how long they usually stayed. */
export function StageTable({ stats }: { stats: Stats }) {
  const t = useT();
  const rows = stats.stages.filter((s) => s.reached > 0);
  return (
    <Card withBorder>
      <Title order={4}>{t("insights.stageByStage")}</Title>
      <Text size="sm" c="dimmed" mb="sm">
        {t("insights.movedOnNote")}
      </Text>
      <Table.ScrollContainer minWidth={560}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("insights.colStage")}</Table.Th>
              <Table.Th>{t("insights.colReached")}</Table.Th>
              <Table.Th>{t("insights.colMovedOn")}</Table.Th>
              <Table.Th w={180}>{t("insights.colConversion")}</Table.Th>
              <Table.Th>{t("insights.colMedianTime")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((s) => (
              <Table.Tr key={s.id}>
                <Table.Td>
                  <Badge variant="light" color={s.color}>
                    {s.name}
                  </Badge>
                </Table.Td>
                <Table.Td>{s.reached}</Table.Td>
                <Table.Td>{s.conversion == null ? "—" : s.moved_on}</Table.Td>
                <Table.Td>
                  {s.conversion == null ? (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  ) : (
                    <Group gap="xs" wrap="nowrap">
                      <Progress value={100 * s.conversion} color={s.color} w={90} aria-hidden />
                      <Text size="sm">{percent(s.conversion)}</Text>
                    </Group>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{days(s.median_days)}</Text>
                  {s.stays > 0 && (
                    <Text size="xs" c="dimmed">
                      {t("insights.fromStays", { n: s.stays })}
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}

/** Direct vs recruiter vs referral: what share of each route got to each stage. */
export function RouteTable({ stats }: { stats: Stats }) {
  const t = useT();
  // Stages past the first that aren't closed: the ones that mean progress.
  const stages = stats.stages.filter((s) => s.kind !== "closed" && s.kind !== "unknown").slice(1);
  return (
    <Card withBorder>
      <Title order={4}>{t("insights.directVsRecruiter")}</Title>
      <Text size="sm" c="dimmed" mb="sm">
        {t("insights.routeShareNote")}
      </Text>
      {stats.routes.length < 2 ? (
        <Text size="sm" c="dimmed">
          {t("insights.routeNothingYet")}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={480}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t("insights.route")}</Table.Th>
                <Table.Th>{t("insights.applications")}</Table.Th>
                {stages.map((s) => (
                  <Table.Th key={s.id}>{s.name}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {stats.routes.map((r) => (
                <Table.Tr key={r.route}>
                  <Table.Td>{ROUTE_KEYS[r.route] ? t(ROUTE_KEYS[r.route]!) : r.route}</Table.Td>
                  <Table.Td>{r.applications}</Table.Td>
                  {stages.map((s) => {
                    const n = r.reached[s.id] ?? 0;
                    return (
                      <Table.Td key={s.id}>
                        <Text size="sm" span fw={n ? 600 : undefined} c={n ? undefined : "dimmed"}>
                          {percent(n / r.applications)}
                        </Text>{" "}
                        <Text size="xs" c="dimmed" span>
                          ({n})
                        </Text>
                      </Table.Td>
                    );
                  })}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}

const SERIES: {
  key: keyof Omit<Week, "start">;
  labelKey: Key;
  countKey: Key;
  color: string;
}[] = [
  { key: "added", labelKey: "insights.seriesAdded", countKey: "insights.countAdded", color: "gray" },
  { key: "applied", labelKey: "insights.seriesApplied", countKey: "insights.countApplied", color: "blue" },
  { key: "moves", labelKey: "insights.seriesMoves", countKey: "insights.countMoves", color: "teal" },
  {
    key: "interviews",
    labelKey: "insights.seriesInterviews",
    countKey: "insights.countInterviews",
    color: "violet",
  },
  { key: "calls", labelKey: "insights.seriesCalls", countKey: "insights.countCalls", color: "orange" },
  {
    key: "pitched",
    labelKey: "insights.seriesPitched",
    countKey: "insights.countPitched",
    color: "grape",
  },
];

const WEEKS = 12;
const BAR_HEIGHT = 120;

/** The Monday `WEEKS - 1` weeks before this week's, as YYYY-MM-DD in local time. */
export function activityStart(now = dayjs()) {
  const monday = now.startOf("day").subtract((now.day() + 6) % 7, "day");
  return monday.subtract(WEEKS - 1, "week").format("YYYY-MM-DD");
}

/** Twelve weeks of activity as grouped bars. */
export function WeeklyActivity() {
  const t = useT();
  const start = activityStart();
  // The server works out local midnights itself, so weeks with a clock change come out right.
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { data: weeks, isLoading } = useActivity(start, WEEKS, tz);
  const max = Math.max(1, ...(weeks ?? []).flatMap((w) => SERIES.map((s) => w[s.key])));
  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Title order={4}>{t("insights.weeklyActivity")}</Title>
        <Group gap="md">
          {SERIES.map((s) => (
            <Group key={s.key} gap={6}>
              <Box w={10} h={10} bg={`${s.color}.6`} style={{ borderRadius: 2 }} />
              <Text size="xs">{t(s.labelKey)}</Text>
            </Group>
          ))}
        </Group>
      </Group>
      {isLoading || !weeks ? (
        <Loader />
      ) : (
        <Stack gap={4}>
          <Group
            gap={0}
            align="flex-end"
            wrap="nowrap"
            h={BAR_HEIGHT}
            role="list"
            aria-label={t("insights.weeklyActivity")}
          >
            {weeks.map((w) => {
              const label = t("insights.weekOf", {
                date: dayjs(w.start).format("D MMM"),
                counts: SERIES.map((s) => t(s.countKey, { n: w[s.key] })).join(", "),
              });
              return (
                <Tooltip key={w.start} label={label} withinPortal>
                  <Group
                    gap={1}
                    align="flex-end"
                    wrap="nowrap"
                    justify="center"
                    h="100%"
                    style={{ flex: 1 }}
                    role="listitem"
                    aria-label={label}
                  >
                    {SERIES.map((s) => (
                      <Box
                        key={s.key}
                        w="18%"
                        maw={12}
                        h={`${(100 * w[s.key]) / max}%`}
                        mih={w[s.key] ? 2 : 0}
                        bg={`${s.color}.6`}
                        style={{ borderRadius: "2px 2px 0 0" }}
                      />
                    ))}
                  </Group>
                </Tooltip>
              );
            })}
          </Group>
          <Group gap={0} wrap="nowrap">
            {weeks.map((w, i) => (
              <Text key={w.start} size="xs" c="dimmed" ta="center" style={{ flex: 1 }}>
                {(WEEKS - 1 - i) % 2 === 0 ? dayjs(w.start).format("D MMM") : ""}
              </Text>
            ))}
          </Group>
        </Stack>
      )}
    </Card>
  );
}
