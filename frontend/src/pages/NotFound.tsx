import { Button, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

import { useT } from "../i18n";

export function NotFound() {
  const t = useT();
  return (
    <Stack align="flex-start">
      <Title order={2}>{t("insights.notFoundTitle")}</Title>
      <Text c="dimmed">{t("insights.notFoundText")}</Text>
      <Button component={Link} to="/" variant="light">
        {t("insights.backToToday")}
      </Button>
    </Stack>
  );
}
