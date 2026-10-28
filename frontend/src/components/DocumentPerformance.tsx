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
import { t, useT, type Key } from "../i18n";
import { TOO_FEW, verdict } from "../utils/abtest";
import { useCvFilesToSort } from "./CvFiles";

const kindLabel = (kind: string): string =>
  kind === "cv"
    ? t("library.kindCv")
    : kind === "cover_letter"
      ? t("library.kindCoverLetter")
      : kind === "other"
        ? t("library.kindOther")
        : kind;
const noneLabel = (kind: string): string | undefined =>
  kind === "cv" ? t("library.noneCv") : kind === "cover_letter" ? t("library.noneCoverLetter") : undefined;

const routeOptions = () => [
  { value: "any", label: t("library.routeAny") },
  { value: "direct", label: t("library.routeDirect") },
  { value: "agency", label: t("library.routeAgency") },
  { value: "referral", label: t("library.routeReferral") },
];

type Measure = "heard_back" | "interviewed" | "offers";
const MEASURES: { value: Measure; labelKey: Key; longKey: Key }[] = [
  { value: "heard_back", labelKey: "library.measureHeardBack", longKey: "library.measureHeardBackLong" },
  { value: "interviewed", labelKey: "library.measureInterviewed", longKey: "library.measureInterviewedLong" },
  { value: "offers", labelKey: "library.measureOffers", longKey: "library.measureOffersLong" },
];

const percent = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "—");

function days(n: number | null | undefined) {
  if (n == null) return "—";
  if (n < 1) return t("library.sameDay");
  return t("library.nDays", { n, num: n % 1 === 0 ? n : n.toFixed(1) });
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
  const none = noneLabel(kind.kind);
  if (none && kind.none.sent > 0) rows.push({ id: "none", name: none, tally: kind.none, level: "none" });
  return rows;
}

/** The interview rate as a dot, with its 95% range as a bar: wide means unsure. */
function RangeBar({ t: tally }: { t: DocumentTally }) {
  const t = useT();
  if (tally.interview_rate == null || tally.interview_low == null || tally.interview_high == null)
    return null;
  const low = Math.round(tally.interview_low * 100);
  const high = Math.round(tally.interview_high * 100);
  return (
    <Tooltip label={t("library.rangeTooltip", { low, high })}>
      <Box
        w={90}
        h={10}
        pos="relative"
        style={{ background: "var(--mantine-color-default-border)", borderRadius: 5 }}
        aria-label={t("library.rangeAria", { low, high })}
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
          left={`calc(${tally.interview_rate * 100}% - 4px)`}
          style={{ background: "var(--mantine-color-indigo-filled)", borderRadius: "50%" }}
        />
      </Box>
    </Tooltip>
  );
}

function VersionsTable({ rows }: { rows: Row[] }) {
  const t = useT();
  return (
    <Table.ScrollContainer minWidth={820}>
      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th />
            <Table.Th ta="right">{t("library.colSent")}</Table.Th>
            <Table.Th ta="right">{t("library.measureHeardBack")}</Table.Th>
            <Table.Th ta="right">{t("library.measureInterviewed")}</Table.Th>
            <Table.Th>{t("library.colHowSure")}</Table.Th>
            <Table.Th ta="right">{t("library.colOffers")}</Table.Th>
            <Table.Th ta="right">{t("library.colFates")}</Table.Th>
            <Table.Th ta="right">{t("library.colReply")}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map(({ id, name, tally, level }) => (
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
              <Table.Td ta="right">{tally.sent}</Table.Td>
              <Table.Td ta="right">
                {tally.heard_back}{" "}
                <Text span size="xs" c="dimmed">
                  ({percent(tally.heard_back, tally.sent)})
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                {tally.interviewed}{" "}
                <Text span size="xs" c="dimmed">
                  ({percent(tally.interviewed, tally.sent)})
                </Text>
              </Table.Td>
              <Table.Td>
                <RangeBar t={tally} />
              </Table.Td>
              <Table.Td ta="right">{tally.offers}</Table.Td>
              <Table.Td ta="right">
                {tally.open} · {tally.ghosted} · {tally.closed}
              </Table.Td>
              <Table.Td ta="right">{days(tally.median_reply_days)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

const VERDICT_TEXT = {
  "too-few": (a: string, b: string) => t("library.verdictTooFew", { min: TOO_FEW, a, b }),
  same: (a: string, b: string) => t("library.verdictSame", { a, b }),
  hint: (a: string, b: string) => t("library.verdictHint", { a, b }),
  likely: (a: string, b: string) => t("library.verdictLikely", { a, b }),
};

/** Pick two rows and a measure; says in words whether the gap is likely real. */
function Compare({ rows }: { rows: Row[] }) {
  const t = useT();
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
        {t("library.compareEmpty")}
      </Text>
    );
  const m = MEASURES.find((x) => x.value === measure)!;

  let result: { kind: keyof typeof VERDICT_TEXT; p: number; text: string } | null = null;
  if (a && b && a.id !== b.id) {
    const hits = (r: Row) => r.tally[measure];
    const v = verdict(hits(a), a.tally.sent, hits(b), b.tally.sent);
    const say = (r: Row) =>
      t("library.sayTally", {
        name: r.name,
        hits: hits(r),
        sent: r.tally.sent,
        measure: t(m.longKey),
        pct: percent(hits(r), r.tally.sent),
      });
    const [first, second] = hits(a) / (a.tally.sent || 1) >= hits(b) / (b.tally.sent || 1) ? [a, b] : [b, a];
    result = { ...v, text: VERDICT_TEXT[v.kind](say(first), say(second)) };
  }

  return (
    <Stack gap="xs">
      <Group gap="sm" align="flex-end" wrap="wrap">
        <Select
          label={t("library.compareLabel")}
          data={optionsBesides(b)}
          value={a?.id ?? null}
          onChange={(v) => setPicked((p) => ({ ...p, a: v }))}
          allowDeselect={false}
          w={240}
        />
        <Select
          label={t("library.withLabel")}
          data={optionsBesides(a)}
          value={b?.id ?? null}
          onChange={(v) => setPicked((p) => ({ ...p, b: v }))}
          allowDeselect={false}
          w={240}
        />
        <SegmentedControl
          aria-label={t("library.measureAria")}
          size="xs"
          data={MEASURES.map(({ value, labelKey }) => ({ value, label: t(labelKey) }))}
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
              ? t("library.verdictTooFewTitle")
              : result.kind === "likely"
                ? t("library.verdictLikelyTitle")
                : result.kind === "hint"
                  ? t("library.verdictHintTitle")
                  : t("library.verdictSameTitle")
          }
        >
          <Text size="sm">{result.text}</Text>
          {result.kind !== "too-few" && (
            <Text size="xs" c="dimmed" mt={4}>
              {t("library.fisherNote", { p: result.p < 0.001 ? "< 0.001" : result.p.toFixed(3) })}
            </Text>
          )}
        </Alert>
      ) : (
        <Text size="sm" c="dimmed">
          {t("library.pickTwo")}
        </Text>
      )}
    </Stack>
  );
}

/** Insights tab: your CVs and cover letters, version against version (an A/B test). */
export function DocumentPerformanceSection({ since }: { since?: string }) {
  const t = useT();
  const [route, setRoute] = useState("any");
  const [kind, setKind] = useState("cv");
  const filters: FlowFilters = {
    since,
    route: route === "any" ? undefined : (route as FlowFilters["route"]),
  };
  const { data, isLoading, isError } = useDocumentPerformance(filters);
  const toSort = useCvFilesToSort();

  if (isLoading) return <Loader />;
  if (isError || !data) return <Text c="red">{t("library.cvLoadError")}</Text>;
  const current = data.kinds.find((k) => k.kind === kind) ?? data.kinds[0];
  const rows = current ? rowsOf(current) : [];
  const recorded = current?.documents.some((d) => d.sent > 0) ?? false;

  return (
    <Stack>
      {toSort > 0 && (
        <Alert color="blue" variant="light">
          <Text size="sm">
            {t("library.toSortAlert", { n: toSort })}
            <Anchor component={Link} to="/documents" size="sm">
              {t("library.sortThemOut")}
            </Anchor>
            .
          </Text>
        </Alert>
      )}
      <Card withBorder>
        <Group justify="space-between" mb="md" wrap="wrap" align="flex-start">
          <div>
            <Title order={4}>
              {current
                ? current.kind === "cover_letter"
                  ? t("library.bestCoverLetter")
                  : current.kind === "other"
                    ? t("library.bestOther")
                    : t("library.bestCv")
                : t("library.bestCv")}
            </Title>
            <Text size="sm" c="dimmed" maw={720}>
              {t("library.perfIntro", { n: data.applications })}
              <b>{t("library.measureInterviewed")}</b>
              {t("library.perfWatch")}
            </Text>
          </div>
          <Group gap="xs">
            {data.kinds.length > 1 && (
              <SegmentedControl
                aria-label={t("library.kindOfDocumentAria")}
                size="xs"
                data={data.kinds.map((k) => ({ value: k.kind, label: kindLabel(k.kind) }))}
                value={current?.kind ?? "cv"}
                onChange={setKind}
              />
            )}
            <Select
              aria-label={t("library.routeAria")}
              size="xs"
              w={150}
              data={routeOptions()}
              value={route}
              onChange={(v) => setRoute(v ?? "any")}
              allowDeselect={false}
            />
          </Group>
        </Group>
        {!recorded ? (
          <Text size="sm" c="dimmed">
            {t("library.compareCta1")}
            <Anchor component={Link} to="/documents">
              {t("nav.label.documents")}
            </Anchor>
            {t("library.compareCta2")}
            <i>{t("library.documentsSent")}</i>
            {t("library.compareCta3")}
          </Text>
        ) : (
          <Stack gap="lg">
            <VersionsTable rows={rows} />
            <Compare key={`${current?.kind}-${route}-${since}`} rows={rows.filter((r) => r.tally.sent > 0)} />
          </Stack>
        )}
      </Card>
      <Text size="xs" c="dimmed" maw={820}>
        <b>{t("library.measureHeardBack")}</b>
        {t("library.legendHeardBack")}
        <b>{t("library.measureInterviewed")}</b>
        {t("library.legendInterviewed")}
        <b>{t("library.colHowSure")}</b>
        {t("library.legendHowSure")}
      </Text>
    </Stack>
  );
}
