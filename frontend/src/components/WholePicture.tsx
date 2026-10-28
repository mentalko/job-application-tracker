import { Card, Loader, Text, Title } from "@mantine/core";

import { useWholeFlow } from "../api/insightHooks";
import { t, useT } from "../i18n";
import { SankeyChart } from "./SankeyChart";

/**
 * The whole picture: every role from where it came from (a recruiter, a referral, or you found
 * it) to passing on it, still deciding, or applying and where that went, with a spur from each
 * stage to what's still waiting there.
 */
const roles = (n: number) => t("insights.countRole", { n });

export function WholePicture({ since }: { since?: string }) {
  const t = useT();
  const { data: flow, isLoading, isError } = useWholeFlow(since);
  return (
    <Card withBorder>
      <Title order={4}>{t("insights.wholePicture")}</Title>
      <Text size="sm" c="dimmed" mb="md">
        {t("insights.wholePictureBlurb", { count: flow ? roles(flow.applications) : "…" })}
      </Text>
      {isLoading ? (
        <Loader />
      ) : isError || !flow ? (
        <Text c="red">{t("insights.wholePictureError")}</Text>
      ) : !flow.links.length ? (
        <Text size="sm" c="dimmed">
          {t("insights.wholePictureEmpty")}
        </Text>
      ) : (
        <SankeyChart
          flow={flow}
          unit="role"
          label={t("insights.sankeyLabelRoles", { count: roles(flow.applications) })}
        />
      )}
    </Card>
  );
}
