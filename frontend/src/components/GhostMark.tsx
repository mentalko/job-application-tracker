import { IconGhost2 } from "@tabler/icons-react";

/** A ghost just before the name of someone you've marked Ghosted. */
export function GhostMark({ closedAs, size = 14 }: { closedAs?: string | null; size?: number }) {
  if (closedAs !== "ghosted") return null;
  return (
    <span title="Ghosted" role="img" aria-label="Ghosted" style={{ marginRight: "0.3em" }}>
      <IconGhost2 size={size} stroke={1.8} style={{ verticalAlign: "-0.12em" }} aria-hidden />
    </span>
  );
}
