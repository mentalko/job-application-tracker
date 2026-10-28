import { Button, Group, Modal, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";

import { useT } from "../i18n";

/** Rename a company or agency and set its website. Mount it with a `key` so it starts fresh. */
export function EditNameModal({
  opened,
  onClose,
  title,
  name,
  website,
  saving,
  onSave,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  name: string;
  website: string | null;
  saving: boolean;
  onSave: (values: { name: string; website: string | null }) => void;
}) {
  const t = useT();
  const form = useForm({
    initialValues: { name, website: website ?? "" },
    validate: {
      name: (v) => (v.trim() ? null : t("people.needsName")),
      website: (v) =>
        !v.trim() || /^https?:\/\/[^\s/]+\.[^\s]+$/.test(v.trim()) ? null : t("people.websiteExample"),
    },
  });
  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <form
        onSubmit={form.onSubmit((v) => onSave({ name: v.name.trim(), website: v.website.trim() || null }))}
      >
        <Stack>
          <TextInput label={t("people.nameLabel")} data-autofocus {...form.getInputProps("name")} />
          <TextInput
            label={t("people.website")}
            placeholder={t("people.websitePlaceholder")}
            {...form.getInputProps("website")}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("shared.cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {t("people.save")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
