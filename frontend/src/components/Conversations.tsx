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
import { PersonName } from "./GhostMark";
import { formatDate } from "../utils/time";
import { SankeyChart } from "./SankeyChart";

type Tally = Conversations["total"];

const percent = (rate: number | null | undefined) => (rate == null ? "—" : `${Math.round(rate * 100)}%`);

function days(n: number | null | undefined) {
  if (n == null) return "—";
  if (n < 1) return "same day";
  return `${n % 1 === 0 ? n : n.toFixed(1)} day${n === 1 ? "" : "s"}`;
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
function Outcomes({ t }: { t: Tally }) {
  const parts: [number, string, string][] = [
    [t.in_progress, "in progress", "cyan"],
    [t.offers, "offer", "green"],
    [t.closed, "closed", "red"],
    [t.ghosted, "ghosted", "dark"],
  ];
  const shown = parts.filter(([n]) => n > 0);
  if (!shown.length) return <Text size="sm">—</Text>;
  return (
    <Group gap={4}>
      {shown.map(([n, label, color]) => (
        <Badge key={label} size="sm" variant="light" color={color}>
          {n} {label}
        </Badge>
      ))}
    </Group>
  );
}

type View = "people" | "agencies";

function WhoTable({ data }: { data: Conversations }) {
  const [view, setView] = useState<View>("people");
  const rows: (ConversationPerson | ConversationAgency)[] = view === "people" ? data.people : data.agencies;
  return (
    <Card withBorder>
      <Group justify="space-between" wrap="wrap" mb="sm">
        <div>
          <Title order={4}>Who you talk to</Title>
          <Text size="sm" c="dimmed">
            Calls held and the roles each one pitched: how many you applied for, passed on or are still
            deciding about, and where the applications went. Apply rate is of the roles you've decided on.
          </Text>
        </div>
        <SegmentedControl
          aria-label="Conversations by"
          size="xs"
          value={view}
          onChange={(v) => setView(v as View)}
          data={[
            { value: "people", label: "People" },
            { value: "agencies", label: "Agencies" },
          ]}
        />
      </Group>
      {!rows.length ? (
        <Text size="sm" c="dimmed">
          {view === "people"
            ? "No calls or pitched roles in this period. Log a call on someone's page, or add the roles they mention."
            : "No one from an agency in this period."}
        </Text>
      ) : (
        <Table.ScrollContainer minWidth={760}>
          <Table striped highlightOnHover verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{view === "people" ? "Person" : "Agency"}</Table.Th>
                <Table.Th ta="right">Calls</Table.Th>
                <Table.Th>Last call</Table.Th>
                <Table.Th ta="right">Pitched</Table.Th>
                <Table.Th ta="right">Applied</Table.Th>
                <Table.Th ta="right">Passed</Table.Th>
                <Table.Th ta="right">Deciding</Table.Th>
                <Table.Th ta="right">Apply rate</Table.Th>
                <Table.Th ta="right">Interviews</Table.Th>
                <Table.Th>Applications</Table.Th>
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
                          {r.people} {r.people === 1 ? "person" : "people"}
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
                              {r.closed_as === "ghosted" ? "Ghosted" : "Not interested"}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {r.agency_name ?? r.company_name ?? "Independent"}
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
  if (!data.pass_reasons.length) return null;
  return (
    <Card withBorder>
      <Title order={4}>Why you passed</Title>
      <Text size="sm" c="dimmed" mb="sm">
        The reasons you gave for passing on pitched roles, newest first.
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
                {r.person_name ? ` · from ${r.person_name}` : ""}
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
  const { data, isLoading, isError } = useConversations(since);
  if (isLoading) return <Loader />;
  if (isError || !data) return <Text c="red">Couldn't load recruiter conversations.</Text>;
  const t = data.total;
  return (
    <Stack>
      <Card withBorder>
        <Title order={4}>Recruiter conversations</Title>
        <Text size="sm" c="dimmed" mb="md">
          A lot happens before an application: calls with people, and the roles they pitch. Calls count by
          when they happen, roles by when you added them.
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
          <Stat
            label="Calls held"
            value={t.calls_held}
            hint={t.calls_booked ? `${t.calls_booked} booked ahead` : undefined}
          />
          <Stat label="People" value={data.people_talked_to} hint="talked to or pitched by" />
          <Stat label="Roles pitched" value={t.pitched} />
          <Stat label="Applied" value={t.applied} hint={`${percent(t.apply_rate)} of roles decided`} />
          <Stat label="Passed" value={t.passed} />
          <Stat label="Still deciding" value={t.deciding} />
          <Stat label="Interviews" value={t.interviewed} hint="pitched roles that got one" />
          <Stat label="Offers" value={t.offers} hint="from pitched roles" />
          <Stat label="Time to decide" value={days(t.median_decide_days)} hint="median, to apply or pass" />
          <Stat label="Ghosted" value={t.ghosted} hint="applications from pitches" />
        </SimpleGrid>
        <Title order={5} mt="lg" mb={4}>
          Where pitched roles go
        </Title>
        {t.pitched ? (
          <SankeyChart flow={data.flow} unit="role" />
        ) : (
          <Text size="sm" c="dimmed">
            No roles pitched in this period. On someone's page, <b>Add roles from this call</b> for each role
            they mention.
          </Text>
        )}
      </Card>
      <WhoTable data={data} />
      <PassReasons data={data} />
    </Stack>
  );
}
