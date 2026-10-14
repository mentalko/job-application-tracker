import { Button } from "@mantine/core";
import { IconTimeline } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

export type TimelineAbout = "contact" | "company" | "agency";

/** The Timeline's search params for everything about one person, company or agency, all time. */
export function timelineSearch(kind: TimelineAbout, id: string) {
  return { about: `${kind}:${id}`, period: "all" };
}

/** Opens the Timeline filtered to one person, company or agency, over all time. */
export function TimelineButton({ kind, id, name }: { kind: TimelineAbout; id: string; name: string }) {
  return (
    <Button
      component={Link}
      to="/timeline"
      search={timelineSearch(kind, id) as never}
      variant="default"
      size="xs"
      leftSection={<IconTimeline size={14} />}
      aria-label={`Timeline for ${name}`}
    >
      Timeline
    </Button>
  );
}
