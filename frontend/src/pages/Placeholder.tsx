import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";

import { useT } from "../i18n";
import type { NavItem } from "../nav";

export function Placeholder({ item }: { item: NavItem }) {
  const t = useT();
  return (
    <Stack maw={720}>
      <Group gap="sm">
        <item.icon size={26} stroke={1.6} />
        <Title order={2}>{t(item.labelKey)}</Title>
      </Group>
      <Card withBorder padding="lg">
        <Text>{t(item.descriptionKey)}</Text>
        <Group mt="md" gap="xs">
          <Badge variant="light">{t("shell.comingSoon")}</Badge>
          <Text size="sm" c="dimmed">
            {t("shell.roadmapTask")} <code>{item.task}</code>
          </Text>
        </Group>
      </Card>
    </Stack>
  );
}
