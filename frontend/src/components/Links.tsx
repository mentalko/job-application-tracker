import {
  ActionIcon,
  Anchor,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconBrandGithub,
  IconBrandGoogleDrive,
  IconBrandLinkedin,
  IconCheck,
  IconFileText,
  IconLink,
  IconPencil,
  IconPresentation,
  IconTable,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";

import {
  useAddLink,
  useDeleteLink,
  useLinks,
  useUpdateLink,
  type EntityType,
  type LinkItem,
} from "../api/linkHooks";
import { useT } from "../i18n";

const ICONS: Record<string, typeof IconLink> = {
  google_doc: IconFileText,
  google_sheet: IconTable,
  google_slides: IconPresentation,
  google_drive: IconBrandGoogleDrive,
  github: IconBrandGithub,
  linkedin: IconBrandLinkedin,
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function LinkRow({ link }: { link: LinkItem }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(link.title ?? "");
  const update = useUpdateLink();
  const remove = useDeleteLink();
  const t = useT();
  const Icon = ICONS[link.kind] ?? IconLink;
  const label = link.title || host(link.url);
  const save = () => {
    if (title.trim() === (link.title ?? "")) return setEditing(false); // nothing changed
    update.mutate({ id: link.id, body: { title } }, { onSuccess: () => setEditing(false) });
  };

  return (
    <Group justify="space-between" wrap="nowrap" gap="xs">
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
        <Icon size={18} stroke={1.6} style={{ flexShrink: 0 }} />
        {editing ? (
          <TextInput
            size="xs"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            aria-label={t("people.linkTitleAria")}
            placeholder={t("people.linkTitlePlaceholder")}
            style={{ flex: 1 }}
            onBlur={save}
            autoFocus
          />
        ) : (
          <div style={{ minWidth: 0 }}>
            <Anchor
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              size="sm"
              fw={500}
              truncate="end"
              display="block"
            >
              {label}
            </Anchor>
            <Text size="xs" c="dimmed" truncate="end">
              {host(link.url)}
            </Text>
          </div>
        )}
      </Group>
      <Group gap={2} wrap="nowrap">
        {editing ? (
          <>
            <ActionIcon
              variant="subtle"
              color="teal"
              onClick={save}
              loading={update.isPending}
              aria-label={t("people.saveTitleAria")}
            >
              <IconCheck size={16} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => setEditing(false)}
              aria-label={t("shared.cancel")}
            >
              <IconX size={16} />
            </ActionIcon>
          </>
        ) : (
          <>
            <Tooltip label={t("people.renameTooltip")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                onClick={() => {
                  setTitle(link.title ?? "");
                  setEditing(true);
                }}
                aria-label={t("people.renameAria", { name: label })}
              >
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t("people.removeTooltip")}>
              <ActionIcon
                variant="subtle"
                color="gray"
                loading={remove.isPending}
                onClick={() => remove.mutate(link.id)}
                aria-label={t("people.removeAria", { name: label })}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </Group>
    </Group>
  );
}

/** External links on one thing: the job ad, a Google Doc brief, a take-home repo… */
export function LinksCard({ entityType, entityId }: { entityType: EntityType; entityId: string }) {
  const { data: links } = useLinks(entityType, entityId);
  const add = useAddLink();
  const t = useT();
  const form = useForm({
    initialValues: { url: "", title: "" },
    validate: {
      url: (v) => (/^https?:\/\/\S+$/.test(v.trim()) ? null : t("people.linkValidationError")),
    },
  });
  const submit = form.onSubmit((v) =>
    add.mutate(
      { entity_type: entityType, entity_id: entityId, url: v.url.trim(), title: v.title.trim() || null },
      { onSuccess: () => form.reset() },
    ),
  );

  return (
    <Card withBorder>
      <Stack gap="sm">
        <Title order={4}>{t("people.linksTitle")}</Title>
        {(links ?? []).map((link) => (
          <LinkRow key={link.id} link={link} />
        ))}
        {links && !links.length && (
          <Text size="sm" c="dimmed">
            {t("people.linksEmpty")}
          </Text>
        )}
        <form onSubmit={submit}>
          <Group align="flex-start" gap="xs" wrap="nowrap">
            <TextInput
              size="xs"
              placeholder={t("people.linkUrlPlaceholder")}
              aria-label={t("people.linkUrlAria")}
              style={{ flex: 2 }}
              {...form.getInputProps("url")}
            />
            <TextInput
              size="xs"
              placeholder={t("people.linkTitleOptional")}
              aria-label={t("people.linkTitleOptionalAria")}
              style={{ flex: 1 }}
              {...form.getInputProps("title")}
            />
            <Button size="xs" type="submit" variant="light" loading={add.isPending}>
              {t("shared.add")}
            </Button>
          </Group>
        </form>
      </Stack>
    </Card>
  );
}
