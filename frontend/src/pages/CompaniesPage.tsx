import {
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBuilding, IconPlus, IconSearch } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { useCreateCompany } from "../api/detailHooks";
import { useApplications, useCompanies } from "../api/hooks";
import { useT } from "../i18n";

function NewCompanyModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const create = useCreateCompany();
  const navigate = useNavigate();
  const t = useT();
  const form = useForm({
    initialValues: { name: "", website: "" },
    validate: {
      name: (v) => (v.trim() ? null : t("people.nameCompany")),
      website: (v) => (!v || /^https?:\/\//.test(v) ? null : t("people.linksStartHttpOrHttps")),
    },
  });
  return (
    <Modal opened={opened} onClose={onClose} title={t("people.newCompany")}>
      <form
        onSubmit={form.onSubmit((values) =>
          create.mutate(
            { name: values.name.trim(), website: values.website || null, description: null },
            {
              onSuccess: (company) => {
                form.reset();
                onClose();
                void navigate({ to: `/companies/${company.id}` });
              },
            },
          ),
        )}
      >
        <Stack>
          <TextInput label={t("people.nameLabel")} data-autofocus {...form.getInputProps("name")} />
          <TextInput
            label={t("people.website")}
            placeholder={t("people.websitePlaceholder")}
            {...form.getInputProps("website")}
          />
          <Group justify="flex-end">
            <Button type="submit" loading={create.isPending}>
              {t("people.addCompany")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const { data: apps } = useApplications({});
  const t = useT();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const stats = new Map<string, { total: number; active: number; stale: number }>();
  for (const a of apps ?? []) {
    const s = stats.get(a.company_id) ?? { total: 0, active: 0, stale: 0 };
    s.total += 1;
    if (a.stage_kind === "active") s.active += 1;
    if (a.stale) s.stale += 1;
    stats.set(a.company_id, s);
  }
  const shown = (companies ?? []).filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="sm">
          <IconBuilding size={26} stroke={1.6} />
          <Title order={2}>{t("people.companiesTitle")}</Title>
          {companies && (
            <Badge variant="light" color="gray">
              {companies.length}
            </Badge>
          )}
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setCreating(true)}>
          {t("people.newCompany")}
        </Button>
      </Group>
      <TextInput
        placeholder={t("people.searchCompaniesPlaceholder")}
        leftSection={<IconSearch size={16} />}
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        w={300}
        aria-label={t("people.searchCompaniesAria")}
      />
      {isLoading ? (
        <Loader />
      ) : !shown.length ? (
        <Card withBorder p="xl">
          <Text ta="center" c="dimmed">
            {companies?.length ? t("people.noCompanyMatches") : t("people.companiesEmpty")}
          </Text>
        </Card>
      ) : (
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t("people.thCompany")}</Table.Th>
              <Table.Th>{t("people.applications")}</Table.Th>
              <Table.Th>{t("people.thInProgress")}</Table.Th>
              <Table.Th>{t("people.website")}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shown.map((c) => {
              const s = stats.get(c.id);
              const open = () => void navigate({ to: `/companies/${c.id}` });
              return (
                <Table.Tr
                  key={c.id}
                  onClick={open}
                  onKeyDown={(e) => e.key === "Enter" && open()}
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  aria-label={t("people.openNamed", { name: c.name })}
                >
                  <Table.Td fw={600}>{c.name}</Table.Td>
                  <Table.Td>{s?.total ?? 0}</Table.Td>
                  <Table.Td>
                    {s?.active ?? 0}
                    {s?.stale ? (
                      <Text span c="red" size="xs" ml={6}>
                        {t("people.toChase", { n: s.stale })}
                      </Text>
                    ) : null}
                  </Table.Td>
                  <Table.Td>
                    {c.website && (
                      <Anchor
                        href={c.website}
                        target="_blank"
                        rel="noreferrer"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </Anchor>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
      <NewCompanyModal opened={creating} onClose={() => setCreating(false)} />
      <Text size="xs" c="dimmed">
        <Anchor component={Link} to="/applications">
          {t("people.applications")}
        </Anchor>{" "}
        {t("people.companiesFooter")}
      </Text>
    </Stack>
  );
}
