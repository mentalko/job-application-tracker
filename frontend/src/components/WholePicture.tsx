import { Card, Loader, Text, Title } from "@mantine/core";

import { useWholeFlow } from "../api/insightHooks";
import { SankeyChart } from "./SankeyChart";

/**
 * The whole picture: every role from where it came from (a recruiter, a referral, or you found
 * it) to passing on it, still deciding, or applying and where that went, with a spur from each
 * stage to what's still waiting there.
 */
const roles = (n: number) => `${n} role${n === 1 ? "" : "s"}`;

export function WholePicture({ since }: { since?: string }) {
  const { data: flow, isLoading, isError } = useWholeFlow(since);
  return (
    <Card withBorder>
      <Title order={4}>The whole picture</Title>
      <Text size="sm" c="dimmed" mb="md">
        {flow ? roles(flow.applications) : "…"} by the date they were added: where each came from, then
        passing on it, deciding, or applying and how far it got. On the right, where things are now, including
        what's still waiting at each stage (one moved back counts at the furthest stage it reached). A role
        you applied to twice counts twice.
      </Text>
      {isLoading ? (
        <Loader />
      ) : isError || !flow ? (
        <Text c="red">Couldn't load the whole picture.</Text>
      ) : !flow.links.length ? (
        <Text size="sm" c="dimmed">
          Nothing here yet: add a role or an application and it shows up.
        </Text>
      ) : (
        <SankeyChart
          flow={flow}
          unit="role"
          label={`Sankey diagram of ${roles(flow.applications)}, from where they came from to where they are now`}
        />
      )}
    </Card>
  );
}
