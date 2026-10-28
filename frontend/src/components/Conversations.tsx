import {
  Anchor,
  Badge,
  Card,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useState } from "react";

import {
  useConversations,
  type ConversationAgency,
  type ConversationPerson,
  type Conversations,
} from "../api/insightHooks";
import { t, useT } from "../i18n";
import { PersonName } from "./GhostMark";
import { formatDate } from "../utils/time";
import { SankeyChart } from "./SankeyChart";

type Tally = Conversations["total"];

const percent = (rate: number | null | undefined) => (rate == null ? "—" : `${Math.round(rate * 100)}%`);

function days(n: number | null | undefined) {
  if (n == null) return "—";
  if (n < 1) return t("library.sameDay");
  return t("library.nDays", { n, num: n % 1 === 0 ? n : n.toFixed(1) });
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="xl" fw={700}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Paper>
  );
}

/** Where applied roles went, as small badges. */
function Outcomes({ t: tally }: { t: Tally }) {
  const t = useT();
  const parts: [number, string, string][] = [
    [tally.in_progress, t("library.outcomeInProgress", { n: tally.in_progress }), "cyan"],
    [tally.offers, t("library.outcomeOffer", { n: tally.offers }), "green"],
    [tally.closed, t("library.outcomeClosed", { n: tally.closed }), "red"],
    [tally.ghosted, t("library.outcomeGhosted", { n: tally.ghosted }), "dark"],
  ];
  const shown = parts.filter(([n]) => n > 0);
  if (!shown.length) return <Text size="sm">—</Text>;
  return (
    <Group gap={4}>
      {shown.map(([, label, color]) => (
        <Badge key={label} size="sm" variant="light" color={color}>
          {label}
        </Badge>
      ))}
    </Group>
  );
}

type View = "people" | "agencies";

function WhoTable({ data }: { data: Conversations }) {
  const t = useT();
  const [view, setView] = useState<View>("people");
  const rows: (ConversationPerson | ConversationAgency)[] = view === "people" ? data.people : data.agencies;
  return (
    <Card withBorder>
      <Group justify="space-between" wrap="wrap" mb="sm">
        <div>
          <Title order={4}>{t("library.whoYouTalkTo")}</Title>
          <Text size="sm" c="dimmed">
            {t("library.whoYouTalkToHint")}
          </Text>
        </div>
        <SegmentedControl
          aria-label={t("library.conversationsBy")}
          size="xs"
          value={view}
          onChange={(v) => setView(v as View)}
          data={[
            { value: "people", label: t("library.people") },
            { value: "agencies", label: t("library.agencies") },
          ]}
        />
      </Group>
      {!rows.length ? (
        <Text size="sm" c="dimmed">
          {view === "people" ? t("library.noCallsEmpty") : t("library.noAgenciesEmpty")}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{view === "people" ? t("library.colPerson") : t("library.colAgency")}</Table.Th>
                <Table.Th ta="right">{t("library.colCalls")}</Table.Th>
                <Table.Th>{t("library.colLastCall")}</Table.Th>
                <Table.Th ta="right">{t("library.colPitched")}</Table.Th>
                <Table.Th ta="right">{t("library.colApplied")}</Table.Th>
                <Table.Th ta="right">{t("library.colPassed")}</Table.Th>
                <Table.Th ta="right">{t("library.colDeciding")}</Table.Th>
                <Table.Th ta="right">{t("library.colApplyRate")}</Table.Th>
                <Table.Th ta="right">{t("library.colInterviews")}</Table.Th>
                <Table.Th>{t("library.colApplications")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>
                    {"people" in r ? (
                      <>
                        <Anchor component={Link} to={`/agencies/${r.id}`} size="sm" fw={600}>
                          {r.name}
                        </Anchor>
                        <Text size="xs" c="dimmed">
                          {t("library.nPeople", { n: r.people })}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Group gap={6} wrap="nowrap">
                          <Anchor component={Link} to={`/people/${r.id}`} size="sm" fw={600}>
                            <PersonName id={r.id} name={r.name} />
                          </Anchor>
                          {r.closed_as && (
                            <Badge
                              size="xs"
                              variant="light"
                              color={r.closed_as === "ghosted" ? "dark" : "gray"}
                            >
                              {r.closed_as === "ghosted"
                                ? t("library.ghostedBadge")
                                : t("library.notInterested")}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {r.agency_name ?? r.company_name ?? t("library.independent")}
                        </Text>
                      </>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">{r.calls_held}</Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {r.last_call ? formatDate(dayjs(r.last_call).format("YYYY-MM-DD")) : "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">{r.pitched}</Table.Td>
                  <Table.Td ta="right">{r.applied}</Table.Td>
                  <Table.Td ta="right">{r.passed}</Table.Td>
                  <Table.Td ta="right">{r.deciding}</Table.Td>
                  <Table.Td ta="right">{percent(r.apply_rate)}</Table.Td>
                  <Table.Td ta="right">{r.interviewed}</Table.Td>
                  <Table.Td>
                    <Outcomes t={r} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}

function PassReasons({ data }: { data: Conversations }) {
  const t = useT();
  if (!data.pass_reasons.length) return null;
  return (
    <Card withBorder>
      <Title order={4}>{t("library.whyYouPassed")}</Title>
      <Text size="sm" c="dimmed" mb="sm">
        {t("library.whyYouPassedHint")}
      </Text>
      <Stack gap="xs">
        {data.pass_reasons.map((r) => (
          <div key={r.role_id}>
            <Group gap={6} wrap="wrap">
              <Anchor component={Link} to={`/roles/${r.role_id}`} size="sm" fw={600}>
                {r.role_title}
              </Anchor>
              <Text size="sm" c="dimmed">
                {r.company_name}
                {r.person_name ? t("library.fromPerson", { name: r.person_name }) : ""}
                {r.decided_on ? ` · ${formatDate(r.decided_on)}` : ""}
              </Text>
            </Group>
            <Text size="sm" style={{ overflowWrap: "anywhere" }}>
              {r.reason}
            </Text>
          </div>
        ))}
      </Stack>
    </Card>
  );
}

/**
 * Recruiter conversations: what happens before an application. Calls with people, the roles
 * they pitched, which you applied for or passed on, and how the applications went.
 */
export function ConversationsSection({ since }: { since?: string }) {
  const t = useT();
  const { data, isLoading, isError } = useConversations(since);
  if (isLoading) return <Loader />;
  if (isError || !data) return <Text c="red">{t("library.conversationsLoadError")}</Text>;
  const total = data.total;
  return (
    <Stack>
      <Card withBorder>
        <Title order={4}>{t("library.conversationsTitle")}</Title>
        <Text size="sm" c="dimmed" mb="md">
          {t("library.conversationsHint")}
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          <Stat
            label={t("library.statCallsHeld")}
            value={total.calls_held}
            hint={total.calls_booked ? t("library.bookedAhead", { n: total.calls_booked }) : undefined}
          />
          <Stat label={t("library.people")} value={data.people_talked_to} hint={t("library.hintTalked")} />
          <Stat label={t("library.statRolesPitched")} value={total.pitched} />
          <Stat
            label={t("library.colApplied")}
            value={total.applied}
            hint={t("library.pctOfRolesDecided", { pct: percent(total.apply_rate) })}
          />
          <Stat label={t("library.colPassed")} value={total.passed} />
          <Stat label={t("library.statStillDeciding")} value={total.deciding} />
          <Stat label={t("library.colInterviews")} value={total.interviewed} hint={t("library.hintGotOne")} />
          <Stat label={t("library.statOffers")} value={total.offers} hint={t("library.hintFromPitched")} />
          <Stat
            label={t("library.statTimeToDecide")}
            value={days(total.median_decide_days)}
            hint={t("library.hintMedian")}
          />
          <Stat label={t("library.ghostedBadge")} value={total.ghosted} hint={t("library.hintFromPitches")} />
        </SimpleGrid>
        <Title order={5} mt="lg" mb={4}>
          {t("library.wherePitchedGo")}
        </Title>
        {total.pitched ? (
          <SankeyChart flow={data.flow} unit="role" />
        ) : (
          <Text size="sm" c="dimmed">
            {t("library.noRolesPitched")}
            <b>{t("library.addRolesFromCall")}</b>
            {t("library.noRolesPitchedTail")}
          </Text>
        )}
      </Card>
      <WhoTable data={data} />
      <PassReasons data={data} />
    </Stack>
  );
}
