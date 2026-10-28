import {
  Anchor,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { IconCash, IconTrophy } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useState } from "react";

import { headline, money, STATUS_LABELS, useOffers, type Offer } from "../api/offerHooks";
import { formatDate } from "../utils/time";
import { t, useT, type Key } from "../i18n";

const dash = (
  <Text span c="dimmed">
    —
  </Text>
);

const ir35Word = (v: NonNullable<Offer["ir35"]>) =>
  v === "outside" ? "plans.ir35Outside" : v === "inside" ? "plans.ir35Inside" : "plans.ir35Unknown";

const ROWS: { label: Key; cell: (o: Offer) => ReactNode }[] = [
  {
    label: "plans.statusLabel",
    cell: (o) => (
      <Badge size="sm" variant="light" color={STATUS_LABELS[o.status].color}>
        {STATUS_LABELS[o.status].label}
      </Badge>
    ),
  },
  { label: "plans.pay", cell: (o) => headline(o) },
  { label: "plans.colBonus", cell: (o) => (o.bonus ? money(o.bonus, o.currency) : dash) },
  { label: "plans.colPension", cell: (o) => (o.pension_percent != null ? `${o.pension_percent}%` : dash) },
  {
    label: "plans.colEquity",
    cell: (o) =>
      o.equity || o.equity_value ? (
        <>
          {o.equity}
          {o.equity_value ? (
            <Text size="xs" c="dimmed">
              {t("plans.aboutAYear", { amount: money(o.equity_value, o.currency) })}
            </Text>
          ) : null}
        </>
      ) : (
        dash
      ),
  },
  {
    label: "plans.colHoliday",
    cell: (o) => (o.holiday_days != null ? t("plans.daysCount", { n: o.holiday_days }) : dash),
  },
  {
    label: "plans.colIr35",
    cell: (o) =>
      o.ir35 ? (
        <Text span tt="capitalize">
          {t(ir35Word(o.ir35))}
        </Text>
      ) : (
        dash
      ),
  },
  {
    label: "plans.colLength",
    cell: (o) => (o.contract_months ? t("plans.monthsCount", { n: o.contract_months }) : dash),
  },
  { label: "plans.benefits", cell: (o) => o.benefits ?? dash },
  { label: "plans.startDate", cell: (o) => (o.start_on ? formatDate(o.start_on) : dash) },
  { label: "plans.replyBy", cell: (o) => (o.respond_by ? formatDate(o.respond_by) : dash) },
  { label: "plans.notes", cell: (o) => o.notes ?? dash },
];

/** Offers side by side (P6): each application's newest offer, worth-a-year first. */
export function OffersPage() {
  const t = useT();
  const [showClosed, setShowClosed] = useState(false);
  const { data, isLoading } = useOffers({});
  const offers = (data ?? [])
    .filter((o) => showClosed || o.status === "pending" || o.status === "accepted")
    .sort((a, b) => (b.annual_value ?? -1) - (a.annual_value ?? -1));
  // The best is only comparable within one currency: the most common one among these offers.
  const counts = new Map<string, number>();
  for (const o of offers) counts.set(o.currency ?? "", (counts.get(o.currency ?? "") ?? 0) + 1);
  const main = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const best = offers.find((o) => (o.currency ?? "") === main && o.annual_value != null);

  return (
    <Stack maw={1200}>
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <IconCash size={26} stroke={1.6} />
          <Title order={2}>{t("plans.offers")}</Title>
        </Group>
        <Switch
          label={t("plans.showClosed")}
          checked={showClosed}
          onChange={(e) => setShowClosed(e.currentTarget.checked)}
        />
      </Group>
      {isLoading ? (
        <Loader />
      ) : !offers.length ? (
        <Card withBorder>
          <Text c="dimmed" size="sm">
            {data?.length ? t("plans.noneConsidered") : t("plans.noneYetOffers")}
          </Text>
        </Card>
      ) : (
        <Card withBorder>
          <Text size="sm" c="dimmed" mb="sm">
            {t("plans.worthExplainer")}
          </Text>
          <Table.ScrollContainer minWidth={240 + 220 * offers.length}>
            <Table withColumnBorders verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={160}>
                    <VisuallyHidden>{t("plans.detailHidden")}</VisuallyHidden>
                  </Table.Th>
                  {offers.map((o) => (
                    <Table.Th key={o.id}>
                      <Anchor component={Link} to={`/applications/${o.application_id}`} fw={700}>
                        {o.company_name}
                      </Anchor>
                      <Text size="xs" c="dimmed" fw={400}>
                        {o.role_title}
                      </Text>
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Th scope="row">{t("plans.worthAYear")}</Table.Th>
                  {offers.map((o) => (
                    <Table.Td key={o.id}>
                      <Group gap={6} wrap="nowrap">
                        <Text fw={700}>{money(o.annual_value, o.currency)}</Text>
                        {best?.id === o.id && offers.length > 1 && (
                          <Badge size="sm" color="green" leftSection={<IconTrophy size={12} />}>
                            {t("plans.highest")}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                  ))}
                </Table.Tr>
                {ROWS.map((row) => (
                  <Table.Tr key={row.label}>
                    <Table.Th scope="row">{t(row.label)}</Table.Th>
                    {offers.map((o) => (
                      <Table.Td key={o.id}>
                        <Text size="sm" component="div">
                          {row.cell(o)}
                        </Text>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </Stack>
  );
}
