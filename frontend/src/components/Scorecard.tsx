import { Anchor, Badge, Card, Group, Loader, SegmentedControl, Table, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PersonName } from "./GhostMark";
import { useScorecard, type Score } from "../api/insightHooks";
import { ago } from "../utils/time";
import { t, useT, type Key } from "../i18n";

type View = "recruiters" | "agencies";

const percent = (n: number, of: number) => (of ? `${Math.round((100 * n) / of)}%` : "—");

function firstUpdate(days: number | null | undefined) {
  if (days == null) return "—";
  if (days < 1) return t("plans.sameDay");
  return t("plans.firstUpdateDays", { n: days, display: days % 1 === 0 ? days : days.toFixed(1) });
}

function lastContact(iso: string | null | undefined) {
  if (!iso) return "—";
  // Calendar days, so yesterday evening is "yesterday" this morning.
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return ago(Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000));
}

function Outcomes({ s }: { s: Score }) {
  const t = useT();
  const parts: [number, Key, string][] = [
    [s.active, "plans.outcomeActive", "blue"],
    [s.success, "plans.outcomeAccepted", "green"],
    [s.ghosted, "plans.outcomeGhosted", "dark"],
    [s.closed, "plans.outcomeClosed", "red"],
  ];
  return (
    <Group gap={4}>
      {parts
        .filter(([n]) => n > 0)
        .map(([n, key, color]) => (
          <Badge key={key} size="sm" variant="light" color={color}>
            {t(key, { n })}
          </Badge>
        ))}
    </Group>
  );
}

/** Recruiter and agency scorecard (PRD FR20): who sends roles that go somewhere. */
export function ScorecardCard({ since }: { since?: string }) {
  const t = useT();
  const [view, setView] = useState<View>("recruiters");
  const { data, isLoading, isError } = useScorecard(since);
  const rows = data?.[view] ?? [];
  return (
    <Card withBorder>
      <Group justify="space-between" wrap="wrap" mb="sm">
        <div>
          <Title order={4}>{t("plans.scorecardTitle")}</Title>
          <Text size="sm" c="dimmed">
            {t("plans.scorecardHint")}
          </Text>
        </div>
        <SegmentedControl
          aria-label={t("plans.scorecardByAria")}
          size="xs"
          value={view}
          onChange={(v) => setView(v as View)}
          data={[
            { value: "recruiters", label: t("plans.recruiters") },
            { value: "agencies", label: t("plans.agencies") },
          ]}
        />
      </Group>
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <Text c="red">{t("plans.scorecardError")}</Text>
      ) : !rows.length ? (
        <Text size="sm" c="dimmed">
          {t("plans.scorecardEmpty", {
            who: t(view === "recruiters" ? "plans.wordRecruiters" : "plans.wordAgencies"),
          })}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{view === "recruiters" ? t("plans.colRecruiter") : t("plans.colAgency")}</Table.Th>
                <Table.Th>{t("plans.roles")}</Table.Th>
                <Table.Th>{t("plans.colInterviewed")}</Table.Th>
                <Table.Th>{t("plans.colWhereNow")}</Table.Th>
                <Table.Th>{t("plans.colFirstUpdate")}</Table.Th>
                <Table.Th>{t("plans.colLastContact")}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((s) => {
                const agencyId = view === "agencies" ? s.id : s.agency_id;
                return (
                  <Table.Tr key={s.id}>
                    <Table.Td>
                      {view === "agencies" ? (
                        <Anchor component={Link} to={`/agencies/${s.id}`} size="sm">
                          {s.name}
                        </Anchor>
                      ) : (
                        <>
                          <Text size="sm">
                            <PersonName id={s.id} name={s.name} />
                          </Text>
                          {agencyId && s.agency_name && (
                            <Anchor component={Link} to={`/agencies/${agencyId}`} size="xs" c="dimmed">
                              {s.agency_name}
                            </Anchor>
                          )}
                        </>
                      )}
                    </Table.Td>
                    <Table.Td>{s.roles}</Table.Td>
                    <Table.Td>
                      {s.interviewed}{" "}
                      <Text span size="xs" c="dimmed">
                        ({percent(s.interviewed, s.roles)})
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Outcomes s={s} />
                    </Table.Td>
                    <Table.Td>{firstUpdate(s.median_first_update_days)}</Table.Td>
                    <Table.Td>{lastContact(s.last_contact)}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Card>
  );
}
