import { ActionIcon, Box, Button, List, Modal, Stack, Text, ThemeIcon, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconHelp, IconPlus } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useT, type TFunc } from "../i18n";
import { NewApplicationModal } from "./NewApplicationModal";

function useSteps(): { title: string; body: ReactNode }[] {
  const t = useT();
  return [
    {
      title: t("shell.how.s1.title"),
      body: (
        <>
          {t("shell.how.s1.a")}
          <b>{t("shell.how.s1.bold")}</b>
          {t("shell.how.s1.b")}
          <i>{t("shell.how.s1.italic")}</i>
          {t("shell.how.s1.c")}
        </>
      ),
    },
    {
      title: t("shell.how.s2.title"),
      body: (
        <>
          {t("shell.how.s2.a")}
          <b>{t("shell.how.s2.bold")}</b>
          {t("shell.how.s2.b")}
        </>
      ),
    },
    {
      title: t("shell.how.s3.title"),
      body: (
        <>
          {t("shell.how.s3.a")}
          <b>{t("shell.how.s3.bold")}</b>
        </>
      ),
    },
    {
      title: t("shell.how.s4.title"),
      body: (
        <>
          {t("shell.how.s4.a")}
          <b>{t("shell.how.s4.bold1")}</b>
          {t("shell.how.s4.b")}
          <b>{t("shell.how.s4.bold2")}</b>
          {t("shell.how.s4.c")}
          <b>{t("shell.how.s4.bold3")}</b>
          {t("shell.how.s4.d")}
        </>
      ),
    },
    {
      title: t("shell.how.s5.title"),
      body: (
        <>
          {t("shell.how.s5.a")}
          <b>{t("shell.how.s5.bold1")}</b>
          {t("shell.how.s5.b")}
          <b>{t("shell.how.s5.bold2")}</b>
          {t("shell.how.s5.c")}
        </>
      ),
    },
  ];
}

function TailNote({ t }: { t: TFunc }) {
  return (
    <Text size="xs" c="dimmed">
      {t("shell.how.tail.a")}
      <b>{t("shell.how.tail.bold1")}</b>
      {t("shell.how.tail.b")}
      <b>{t("shell.how.tail.bold2")}</b>
      {t("shell.how.tail.c")}
      <b>{t("shell.how.tail.bold3")}</b>
      {t("shell.how.tail.d")}
    </Text>
  );
}

/** The everyday loop as numbered steps (used by the help button and the Today page). */
export function HowItWorks() {
  const t = useT();
  const steps = useSteps();
  return (
    <Stack gap="sm">
      <List
        type="ordered"
        spacing="sm"
        center={false}
        icon={null}
        styles={{ itemWrapper: { alignItems: "flex-start" } }}
      >
        {steps.map((step, n) => (
          <List.Item
            key={step.title}
            icon={
              <ThemeIcon size={24} radius="xl" variant="light" aria-hidden>
                {n + 1}
              </ThemeIcon>
            }
          >
            <Text fw={600} size="sm">
              {step.title}
            </Text>
            <Text size="sm" c="dimmed">
              {step.body}
            </Text>
          </List.Item>
        ))}
      </List>
      <TailNote t={t} />
    </Stack>
  );
}

export function HelpButton() {
  const t = useT();
  const [opened, { open, close }] = useDisclosure();
  return (
    <>
      <Tooltip label={t("shell.howItWorks")}>
        <ActionIcon variant="subtle" size="lg" aria-label={t("shell.howItWorks")} onClick={open}>
          <IconHelp size={18} />
        </ActionIcon>
      </Tooltip>
      <Modal opened={opened} onClose={close} title={t("shell.howItWorks")} size="lg">
        <HowItWorks />
      </Modal>
    </>
  );
}

/** "New application" from any page; opens the new application's page once it's added. */
export function NewApplicationButton({
  size = "sm",
  compact,
}: {
  size?: "xs" | "sm" | "md";
  compact?: boolean;
}) {
  const t = useT();
  const [opened, { open, close }] = useDisclosure();
  const router = useRouter();
  return (
    <>
      {compact ? (
        <>
          <Box visibleFrom="sm">
            <Button size={size} leftSection={<IconPlus size={16} />} onClick={open}>
              {t("shell.newApplication")}
            </Button>
          </Box>
          <Tooltip label={t("shell.newApplication")}>
            <ActionIcon hiddenFrom="sm" size="lg" aria-label={t("shell.newApplication")} onClick={open}>
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        </>
      ) : (
        <Button size={size} leftSection={<IconPlus size={16} />} onClick={open}>
          {t("shell.newApplication")}
        </Button>
      )}
      <NewApplicationModal
        opened={opened}
        onClose={(id) => {
          close();
          if (id) router.history.push(`/applications/${id}`);
        }}
      />
    </>
  );
}
