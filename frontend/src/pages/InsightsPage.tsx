import { Card, Group, Loader, SegmentedControl, Select, Stack, Tabs, Text, Title } from "@mantine/core";
import { IconChartSankey } from "@tabler/icons-react";
import { useState } from "react";

import { useFlow, useStats, type FlowFilters } from "../api/insightHooks";
import { useT, type Key } from "../i18n";
import { ConversationsSection } from "../components/Conversations";
import { DocumentPerformanceSection } from "../components/DocumentPerformance";
import { RouteTable, StageTable, WeeklyActivity } from "../components/InsightStats";
import { ScorecardCard } from "../components/Scorecard";
import { SankeyChart } from "../components/SankeyChart";
import { WholePicture } from "../components/WholePicture";

type Range = "all" | "90" | "30";

const RANGES: { value: Range; labelKey: Key }[] = [
  { value: "all", labelKey: "insights.rangeAll" },
  { value: "90", labelKey: "insights.range90" },
  { value: "30", labelKey: "insights.range30" },
];

const ROUTES: { value: string; labelKey: Key }[] = [
  { value: "any", labelKey: "insights.routeAny" },
  { value: "direct", labelKey: "insights.routeDirect" },
  { value: "agency", labelKey: "insights.routeAgency" },
  { value: "referral", labelKey: "insights.routeReferral" },
];

function sinceFor(range: Range) {
  if (range === "all") return undefined;
  return new Date(Date.now() - Number(range) * 86_400_000).toISOString();
}

type Tab = "whole" | "applications" | "conversations" | "documents";

/**
 * How the search is going (PRD FR19, FR20): the whole picture (every role, from where it came
 * from to where it is now), applications (the Sankey diagram, stage stats,
 * routes, the scorecard), recruiter conversations (calls and the roles people pitch) and CVs and
 * cover letters (version against version), then weekly activity.
 */
export function InsightsPage() {
  const t = useT();
  // `since` is fixed when the range is picked, so the query key doesn't change on every render.
  const [range, setRange] = useState<{ range: Range; since?: string }>({ range: "all" });
  const [route, setRoute] = useState("any");
  const [tab, setTab] = useState<Tab>("whole");
  const filters: FlowFilters = {
    since: range.since,
    route: route === "any" ? undefined : (route as FlowFilters["route"]),
  };
  const { data: flow, isLoading, isError } = useFlow(filters);
  const { data: stats, isError: statsError } = useStats(range.since);

  return (
    <Stack maw={1200}>
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <IconChartSankey size={26} stroke={1.6} />
          <Title order={2}>{t("insights.title")}</Title>
        </Group>
        <SegmentedControl
          aria-label={t("insights.dateRange")}
          size="xs"
          data={RANGES.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
          value={range.range}
          onChange={(value) => setRange({ range: value as Range, since: sinceFor(value as Range) })}
        />
      </Group>
      <Tabs value={tab} onChange={(v) => setTab((v as Tab) ?? "whole")} keepMounted={false}>
        <Tabs.List mb="md">
          <Tabs.Tab value="whole">{t("insights.wholePicture")}</Tabs.Tab>
          <Tabs.Tab value="applications">{t("insights.applications")}</Tabs.Tab>
          <Tabs.Tab value="conversations">{t("insights.tabConversations")}</Tabs.Tab>
          <Tabs.Tab value="documents">{t("insights.tabDocuments")}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="whole">
          <WholePicture since={range.since} />
        </Tabs.Panel>
        <Tabs.Panel value="applications">
          <Stack>
            <Card withBorder>
              <Group justify="space-between" mb="md" wrap="wrap">
                <div>
                  <Title order={4}>{t("insights.whereApplicationsGo")}</Title>
                  <Text size="sm" c="dimmed">
                    {t("insights.flowBlurb", {
                      count: flow ? t("insights.countApplications", { n: flow.applications }) : "…",
                    })}
                  </Text>
                </div>
                <Select
                  aria-label={t("insights.route")}
                  size="xs"
                  w={150}
                  data={ROUTES.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
                  value={route}
                  onChange={(value) => setRoute(value ?? "any")}
                  allowDeselect={false}
                />
              </Group>
              {isLoading ? (
                <Loader />
              ) : isError || !flow ? (
                <Text c="red">{t("insights.flowError")}</Text>
              ) : !flow.links.length ? (
                <Text size="sm" c="dimmed">
                  {flow.applications ? t("insights.flowEmptyNone") : t("insights.flowEmptyFilters")}
                </Text>
              ) : (
                <SankeyChart flow={flow} />
              )}
            </Card>
            {statsError && <Text c="red">{t("insights.statsError")}</Text>}
            {stats && stats.applications > 0 && (
              <>
                <StageTable stats={stats} />
                <RouteTable stats={stats} />
              </>
            )}
            <ScorecardCard since={range.since} />
          </Stack>
        </Tabs.Panel>
        <Tabs.Panel value="conversations">
          <ConversationsSection since={range.since} />
        </Tabs.Panel>
        <Tabs.Panel value="documents">
          <DocumentPerformanceSection since={range.since} />
        </Tabs.Panel>
      </Tabs>
      <WeeklyActivity />
    </Stack>
  );
}
