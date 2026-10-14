import {
  Alert,
  Anchor,
  Box,
  Card,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  useDocumentPerformance,
  type DocumentKindPerformance,
  type DocumentTally,
  type FlowFilters,
} from "../api/insightHooks";
import { TOO_FEW, verdict } from "../utils/abtest";
import { useCvFilesToSort } from "./CvFiles";

const KIND_LABEL: Record<string, string> = {
  cv: "CVs",
  cover_letter: "Cover letters",
  other: "Other documents",
};
const ONE: Record<string, string> = { cv: "CV", cover_letter: "cover letter", other: "document" };
const NONE_LABEL: Record<string, string> = { cv: "No CV recorded", cover_letter: "No cover letter recorded" };

const ROUTES = [
  { value: "any", label: "Any route" },
  { value: "direct", label: "Direct" },
  { value: "agency", label: "Via an agency" },
  { value: "referral", label: "Referral" },
];

type Measure = "heard_back" | "interviewed" | "offers";
const MEASURES: { value: Measure; label: string; long: string }[] = [
  { value: "heard_back", label: "Heard back", long: "heard back" },
  { value: "interviewed", label: "Screen or interview", long: "got a screen or interview" },
  { value: "offers", label: "Offer", long: "got an offer" },
];

const percent = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

function days(n: number | null | undefined) {
  if (n == null) return "—";
  if (n < 1) return "same day";
  return `${n % 1 === 0 ? n : n.toFixed(1)} day${n === 1 ? "" : "s"}`;
}

/** A row you can compare: a version, a whole document, or "none recorded". */
interface Row {
  id: string;
  name: string;
  tally: DocumentTally;
  level: "document" | "version" | "none";
  docId?: string;
}

/** A document and one of its own versions share applications: not a fair comparison. */
const overlaps = (x: Row, y: Row) =>
  x.docId !== undefined && x.docId === y.docId && (x.level === "document" || y.level === "document");

function rowsOf(kind: DocumentKindPerformance): Row[] {
  const rows: Row[] = [];
  for (const d of kind.documents) {
    rows.push({ id: `doc:${d.id}`, name: d.name, tally: d, level: "document", docId: d.id });
    // One version is the document itself: no need to say it twice.
    if (d.versions.length > 1)
      for (const v of d.versions)
        rows.push({
          id: `version:${v.id}`,
          name: `${d.name} · ${v.label}`,
          tally: v,
          level: "version",
          docId: d.id,
        });
  }
  if (NONE_LABEL[kind.kind] && kind.none.sent > 0)
    rows.push({ id: "none", name: NONE_LABEL[kind.kind]!, tally: kind.none, level: "none" });
  return rows;
}

/** The interview rate as a dot, with its 95% range as a bar: wide means unsure. */
function RangeBar({ t }: { t: DocumentTally }) {
  if (t.interview_rate == null || t.interview_low == null || t.interview_high == null) return null;
  const low = Math.round(t.interview_low * 100);
  const high = Math.round(t.interview_high * 100);
  return (
    <Tooltip label={`Likely between ${low}% and ${high}% (95% range)`}>
      <Box
        w={90}
        h={10}
        pos="relative"
        style={{ background: "var(--mantine-color-default-border)", borderRadius: 5 }}
        aria-label={`Likely between ${low}% and ${high}%`}
        role="img"
      >
        <Box
          pos="absolute"
          h={10}
          left={`${low}%`}
          w={`${Math.max(high - low, 2)}%`}
          style={{ background: "var(--mantine-color-indigo-light)", borderRadius: 5 }}
        />
        <Box
          pos="absolute"
          top={1}
          w={8}
          h={8}
          left={`calc(${t.interview_rate * 100}% - 4px)`}
          style={{ background: "var(--mantine-color-indigo-filled)", borderRadius: "50%" }}
        />
      </Box>
    </Tooltip>
  );
}

function VersionsTable({ rows }: { rows: Row[] }) {
  return (
    <Table.ScrollContainer minWidth={820}>
      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th ta="right">Sent</Table.Th>
            <Table.Th ta="right">Heard back</Table.Th>
            <Table.Th ta="right">Screen or interview</Table.Th>
            <Table.Th>How sure</Table.Th>
            <Table.Th ta="right">Offers</Table.Th>
            <Table.Th ta="right">Open · ghosted · closed</Table.Th>
            <Table.Th ta="right">Typical reply</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(({ id, name, tally: t, level }) => (
            <Table.Tr key={id}>
              <Table.Td pl={level === "version" ? "xl" : undefined}>
                <Text
                  size="sm"
                  fw={level === "document" ? 600 : 400}
                  c={level === "none" ? "dimmed" : undefined}
                >
                  {level === "version" ? name.split(" · ").slice(1).join(" · ") : name}
                </Text>
              </Table.Td>
              <Table.Td ta="right">{t.sent}</Table.Td>
              <Table.Td ta="right">
                {t.heard_back}{" "}
                <Text span size="xs" c="dimmed">
                  ({percent(t.heard_back, t.sent)})
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                {t.interviewed}{" "}
                <Text span size="xs" c="dimmed">
                  ({percent(t.interviewed, t.sent)})
                </Text>
              </Table.Td>
              <Table.Td>
                <RangeBar t={t} />
              </Table.Td>
              <Table.Td ta="right">{t.offers}</Table.Td>
              <Table.Td ta="right">
                {t.open} · {t.ghosted} · {t.closed}
              </Table.Td>
              <Table.Td ta="right">{days(t.median_reply_days)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

const VERDICT_TEXT = {
  "too-few": (a: string, b: string) =>
    `Too few to tell yet: send each to at least ${TOO_FEW} applications (10 or more is better) before reading anything into it. So far ${a} and ${b}.`,
  same: (a: string, b: string) =>
    `No real difference so far: ${a} and ${b} could easily be chance. Keep sending both, or try a bigger change.`,
  hint: (a: string, b: string) =>
    `A hint, not proof yet: ${a} and ${b}. Keep sending both and see if it holds.`,
  likely: (a: string, b: string) => `Likely a real difference: ${a} and ${b}.`,
};

/** Pick two rows and a measure; says in words whether the gap is likely real. */
function Compare({ rows }: { rows: Row[] }) {
  // The two most-sent versions (or documents, when none has versions to compare) to start with.
  const versions = rows.filter((r) => r.level === "version");
  const pool = [...(versions.length >= 2 ? versions : rows.filter((r) => r.level !== "version"))].sort(
    (x, y) => y.tally.sent - x.tally.sent,
  );
  const [picked, setPicked] = useState<{ a?: string | null; b?: string | null }>({});
  const [measure, setMeasure] = useState<Measure>("interviewed");
  // A pick that's gone (another date range, say) falls back to the defaults.
  const a = rows.find((r) => r.id === picked.a) ?? pool[0];
  const b = rows.find((r) => r.id === picked.b && (!a || !overlaps(a, r))) ?? pool.find((r) => r !== a);
  const optionsBesides = (other: Row | undefined) =>
    rows.map((r) => ({ value: r.id, label: r.name, disabled: Boolean(other && overlaps(other, r)) }));
  if (rows.length < 2)
    return (
      <Text size="sm" c="dimmed">
        Only one so far: send another version (or record applications without one) to compare.
      </Text>
    );
  const m = MEASURES.find((x) => x.value === measure)!;

  let result: { kind: keyof typeof VERDICT_TEXT; p: number; text: string } | null = null;
  if (a && b && a.id !== b.id) {
    const hits = (r: Row) => r.tally[measure];
    const v = verdict(hits(a), a.tally.sent, hits(b), b.tally.sent);
    const say = (r: Row) =>
      `${r.name}: ${hits(r)} of ${r.tally.sent} ${m.long} (${percent(hits(r), r.tally.sent)})`;
    const [first, second] = hits(a) / (a.tally.sent || 1) >= hits(b) / (b.tally.sent || 1) ? [a, b] : [b, a];
    result = { ...v, text: VERDICT_TEXT[v.kind](say(first), say(second)) };
  }

  return (
    <Stack gap="xs">
      <Group gap="sm" align="flex-end" wrap="wrap">
        <Select
          label="Compare"
          data={optionsBesides(b)}
          value={a?.id ?? null}
          onChange={(v) => setPicked((p) => ({ ...p, a: v }))}
          allowDeselect={false}
          w={240}
        />
        <Select
          label="With"
          data={optionsBesides(a)}
          value={b?.id ?? null}
          onChange={(v) => setPicked((p) => ({ ...p, b: v }))}
          allowDeselect={false}
          w={240}
        />
        <SegmentedControl
          aria-label="Measure"
          size="xs"
          data={MEASURES}
          value={measure}
          onChange={(v) => setMeasure(v as Measure)}
        />
      </Group>
      {result ? (
        <Alert
          color={result.kind === "likely" ? "green" : result.kind === "hint" ? "yellow" : "gray"}
          variant="light"
          title={
            result.kind === "too-few"
              ? "Too few to tell"
              : result.kind === "likely"
                ? "Likely real"
                : result.kind === "hint"
                  ? "A hint"
                  : "Could be chance"
          }
        >
          <Text size="sm">{result.text}</Text>
          {result.kind !== "too-few" && (
            <Text size="xs" c="dimmed" mt={4}>
              Fisher's exact test: p = {result.p < 0.001 ? "< 0.001" : result.p.toFixed(3)}. That's how often
              a gap this big would turn up by chance if both did equally well.
            </Text>
          )}
        </Alert>
      ) : (
        <Text size="sm" c="dimmed">
          Pick two different ones to compare.
        </Text>
      )}
    </Stack>
  );
}

/** Insights tab: your CVs and cover letters, version against version (an A/B test). */
export function DocumentPerformanceSection({ since }: { since?: string }) {
  const [route, setRoute] = useState("any");
  const [kind, setKind] = useState("cv");
  const filters: FlowFilters = {
    since,
    route: route === "any" ? undefined : (route as FlowFilters["route"]),
  };
  const { data, isLoading, isError } = useDocumentPerformance(filters);
  const toSort = useCvFilesToSort();

  if (isLoading) return <Loader />;
  if (isError || !data) return <Text c="red">Couldn't load how your CVs are doing.</Text>;
  const current = data.kinds.find((k) => k.kind === kind) ?? data.kinds[0];
  const rows = current ? rowsOf(current) : [];
  const recorded = current?.documents.some((d) => d.sent > 0) ?? false;

  return (
    <Stack>
      {toSort > 0 && (
        <Alert color="blue" variant="light">
          <Text size="sm">
            {toSort} CV file{toSort === 1 ? "" : "s"} you've attached {toSort === 1 ? "isn't" : "aren't"} a
            version yet, so {toSort === 1 ? "it isn't" : "they aren't"} compared here.{" "}
            <Anchor component={Link} to="/documents" size="sm">
              Sort them out on Documents
            </Anchor>
            .
          </Text>
        </Alert>
      )}
      <Card withBorder>
        <Group justify="space-between" mb="md" wrap="wrap" align="flex-start">
          <div>
            <Title order={4}>Which {ONE[current?.kind ?? "cv"] ?? "document"} works best</Title>
            <Text size="sm" c="dimmed" maw={720}>
              Your {data.applications} sent application{data.applications === 1 ? "" : "s"} (by the date they
              were added), by which version went with each. <b>Screen or interview</b> is the one to watch:
              it's what gets you through the door.
            </Text>
          </div>
          <Group gap="xs">
            {data.kinds.length > 1 && (
              <SegmentedControl
                aria-label="Kind of document"
                size="xs"
                data={data.kinds.map((k) => ({ value: k.kind, label: KIND_LABEL[k.kind] ?? k.kind }))}
                value={current?.kind ?? "cv"}
                onChange={setKind}
              />
            )}
            <Select
              aria-label="Route"
              size="xs"
              w={150}
              data={ROUTES}
              value={route}
              onChange={(v) => setRoute(v ?? "any")}
              allowDeselect={false}
            />
          </Group>
        </Group>
        {!recorded ? (
          <Text size="sm" c="dimmed">
            Nothing to compare yet. Add your CVs on{" "}
            <Anchor component={Link} to="/documents">
              Documents
            </Anchor>{" "}
            (a new version each time you change one), then on each application say which one you sent (its{" "}
            <i>Documents sent</i> card). They'll be compared here.
          </Text>
        ) : (
          <Stack gap="lg">
            <VersionsTable rows={rows} />
            <Compare key={`${current?.kind}-${route}-${since}`} rows={rows.filter((r) => r.tally.sent > 0)} />
          </Stack>
        )}
      </Card>
      <Text size="xs" c="dimmed" maw={820}>
        <b>Heard back</b>: any reply after applying, a rejection included (closing it yourself, or marking it
        ghosted, isn't; logged calls and messages count either way). <b>Screen or interview</b>: got past
        Applied, or has an interview round. <b>How sure</b>: the dot is the screen or interview rate, the bar
        where it likely really is (a 95% range); with few applications it's wide. Other things vary too (the
        roles, the route, the market), so compare like with like: pick a route, and change one thing at a
        time.
      </Text>
    </Stack>
  );
}
