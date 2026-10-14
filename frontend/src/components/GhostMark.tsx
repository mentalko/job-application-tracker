import { IconGhost2 } from "@tabler/icons-react";
import { useMemo } from "react";

import { useContacts } from "../api/hooks";

/** A ghost just before the name of someone you've marked Ghosted. */
export function GhostMark({ closedAs, size = 14 }: { closedAs?: string | null; size?: number }) {
  if (closedAs !== "ghosted") return null;
  return (
    <span title="Ghosted: no reply" role="img" aria-label="Ghosted" style={{ marginRight: "0.3em" }}>
      <IconGhost2 size={size} stroke={1.8} style={{ verticalAlign: "-0.12em" }} aria-hidden />
    </span>
  );
}

/** Whether a person (by id) has ghosted you, from the people list everyone shares. */
export function useGhosted() {
  const { data: contacts } = useContacts();
  const ghosts = useMemo(
    () => new Set((contacts ?? []).filter((c) => c.closed_as === "ghosted").map((c) => c.id)),
    [contacts],
  );
  return (id: string | null | undefined) => Boolean(id && ghosts.has(id));
}

/** A person's name, with a ghost in front if they've ghosted you. */
export function PersonName({
  id,
  name,
  size,
}: {
  id: string | null | undefined;
  name: string;
  size?: number;
}) {
  const ghosted = useGhosted();
  return (
    <>
      <GhostMark closedAs={ghosted(id) ? "ghosted" : null} size={size} />
      {name}
    </>
  );
}
