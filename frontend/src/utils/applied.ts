/** Where Applied is in a workflow, as the server works it out (`domain/insights.py`). */

interface Stage {
  id: string;
  kind: string;
}
interface Flow {
  initial: string;
  stages: Stage[];
}

/** An open stage before Applied (Interested, say): the `applied` stage, or else the first open
 * stage after the starting one, is where applying begins. */
export function beforeApplied(workflow: Flow | undefined, stage: string | null): boolean {
  if (!workflow || !stage) return false;
  const active = workflow.stages.filter((s) => s.kind === "active").map((s) => s.id);
  const at = active.indexOf(stage);
  if (at < 0) return false; // closed or success: not before anything
  const applied = active.includes("applied")
    ? active.indexOf("applied")
    : active.indexOf(workflow.initial) + 1 || active.length;
  return at < applied;
}
