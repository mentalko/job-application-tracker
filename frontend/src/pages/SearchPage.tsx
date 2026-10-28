import { Anchor, Badge, Card, Group, Highlight, Loader, Stack, Text, Title } from "@mantine/core";
import {
  IconBriefcase,
  IconBuilding,
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconCash,
  IconFile,
  IconFileText,
  IconHistory,
  IconLink,
  IconListCheck,
  IconNotes,
  IconPhone,
  IconSearch,
  IconTargetArrow,
  IconUser,
  type Icon,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";

import { PersonMarks } from "../components/GhostMark";
import { useSearchResults, type SearchHit } from "../api/searchHooks";
import { useT, type Key } from "../i18n";

const KINDS: Record<string, { labelKey: Key; icon: Icon }> = {
  application: { labelKey: "insights.kindApplication", icon: IconBriefcase },
  role: { labelKey: "insights.role", icon: IconTargetArrow },
  company: { labelKey: "insights.company", icon: IconBuilding },
  agency: { labelKey: "insights.agency", icon: IconBuildingSkyscraper },
  contact: { labelKey: "insights.person", icon: IconUser },
  interview: { labelKey: "insights.kindInterview", icon: IconCalendarEvent },
  meeting: { labelKey: "insights.kindMeeting", icon: IconPhone },
  todo: { labelKey: "insights.kindTodo", icon: IconListCheck },
  offer: { labelKey: "insights.kindOffer", icon: IconCash },
  timeline: { labelKey: "insights.timeline", icon: IconHistory },
  note: { labelKey: "insights.kindNote", icon: IconNotes },
  document: { labelKey: "insights.kindDocument", icon: IconFileText },
  file: { labelKey: "insights.kindFile", icon: IconFile },
  link: { labelKey: "insights.kindLink", icon: IconLink },
};

function HitRow({ hit, words }: { hit: SearchHit; words: string[] }) {
  const t = useT();
  const kind: { labelKey: Key | null; icon: Icon } = KINDS[hit.kind] ?? {
    labelKey: null,
    icon: IconSearch,
  };
  // In-app paths open in the app; files and outside links in a new tab (web addresses only).
  const external = !hit.link.startsWith("/") || hit.link.startsWith("/api/");
  const safe = hit.link.startsWith("/") || /^https?:\/\//i.test(hit.link);
  const title = (
    <>
      {hit.kind === "contact" && <PersonMarks id={hit.id} />}
      <Highlight highlight={words} fw={600} size="sm" span>
        {hit.title}
      </Highlight>
    </>
  );
  return (
    <Group wrap="nowrap" align="flex-start" gap="sm">
      <kind.icon size={18} stroke={1.6} style={{ marginTop: 2, flexShrink: 0 }} />
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Group gap="xs" wrap="nowrap">
          {!safe ? (
            title
          ) : external ? (
            <Anchor href={hit.link} target="_blank" rel="noreferrer">
              {title}
            </Anchor>
          ) : (
            <Anchor component={Link} to={hit.link}>
              {title}
            </Anchor>
          )}
          <Badge size="xs" variant="light" color="gray">
            {kind.labelKey ? t(kind.labelKey) : hit.kind}
          </Badge>
          {hit.archived && (
            <Badge size="xs" variant="outline" color="gray">
              {t("insights.archived")}
            </Badge>
          )}
        </Group>
        {hit.subtitle && (
          <Text size="xs" c="dimmed" truncate="end">
            {hit.subtitle}
          </Text>
        )}
        {hit.snippet && (
          <Highlight highlight={words} size="sm" c="dimmed">
            {hit.snippet}
          </Highlight>
        )}
      </Stack>
    </Group>
  );
}

/** Search results for ?q=, from the header box (P6 `search`). */
export function SearchPage() {
  const t = useT();
  const q = useRouterState({ select: (s) => (s.location.search as { q?: string }).q ?? "" });
  const { data: hits, isFetching, isError } = useSearchResults(q);
  const words = q.split(/\s+/).filter(Boolean);

  return (
    <Stack maw={900}>
      <Group gap="sm">
        <IconSearch size={26} stroke={1.6} />
        <Title order={2}>{q ? t("insights.resultsFor", { q }) : t("insights.searchTitle")}</Title>
        {isFetching && <Loader size="xs" />}
      </Group>
      {!q ? (
        <Text c="dimmed" size="sm">
          {t("insights.searchHowA")} <b>/</b>
          {t("insights.searchHowB")}
        </Text>
      ) : isError ? (
        <Text c="red">{t("insights.searchError")}</Text>
      ) : !hits ? null : !hits.length ? (
        <Text c="dimmed" size="sm">
          {t("insights.noResults", { q })}
        </Text>
      ) : (
        <Card withBorder>
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              {hits.length === 50 ? t("insights.first50") : t("insights.countResults", { n: hits.length })}
            </Text>
            {hits.map((h) => (
              <HitRow key={`${h.kind}:${h.id}`} hit={h} words={words} />
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
