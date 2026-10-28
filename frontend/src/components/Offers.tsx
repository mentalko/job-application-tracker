import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconCash, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import dayjs from "dayjs";
import { useState } from "react";

import {
  headline,
  money,
  STATUS_LABELS,
  useDeleteOffer,
  useOffers,
  useSaveOffer,
  type Offer,
  type OfferBody,
  type OfferStatus,
} from "../api/offerHooks";
import { useRoles } from "../api/hooks";
import { formatDate } from "../utils/time";
import { t, useT } from "../i18n";

type Kind = "permanent" | "contract" | "fixed_term";
type Num = number | string;

interface Values {
  status: OfferStatus;
  employmentType: Kind;
  currency: string;
  salary: Num;
  bonus: Num;
  equity: string;
  equityValue: Num;
  pensionPercent: Num;
  holidayDays: Num;
  dayRate: Num;
  ir35: "inside" | "outside" | "unknown" | null;
  contractMonths: Num;
  receivedOn: string | null;
  respondBy: string | null;
  startOn: string | null;
  benefits: string;
  notes: string;
}

const num = (v: Num) => (v === "" || v == null ? null : Number(v));
const blank = (s: string) => s.trim() || null;
const day = (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD") : null);
/** The IR35 status as a word ("outside"), not the raw enum. */
const ir35Word = (v: NonNullable<Offer["ir35"]>) =>
  t(v === "outside" ? "plans.ir35Outside" : v === "inside" ? "plans.ir35Inside" : "plans.ir35Unknown");

function fromOffer(o: Offer | null, defaultKind: Kind): Values {
  return {
    status: o?.status ?? "pending",
    employmentType: (o?.employment_type as Kind | null) ?? defaultKind,
    currency: o?.currency ?? "GBP",
    salary: o?.salary ?? "",
    bonus: o?.bonus ?? "",
    equity: o?.equity ?? "",
    equityValue: o?.equity_value ?? "",
    pensionPercent: o?.pension_percent ?? "",
    holidayDays: o?.holiday_days ?? "",
    dayRate: o?.day_rate ?? "",
    ir35: (o?.ir35 as Values["ir35"]) ?? null,
    contractMonths: o?.contract_months ?? "",
    receivedOn: o?.received_on ?? dayjs().format("YYYY-MM-DD"),
    respondBy: o?.respond_by ?? null,
    startOn: o?.start_on ?? null,
    benefits: o?.benefits ?? "",
    notes: o?.notes ?? "",
  };
}

/** Add or edit an offer. Mount it with a `key` per offer so the form starts fresh. */
export function OfferFormModal({
  opened,
  onClose,
  applicationId,
  offer,
  defaultKind = "permanent",
}: {
  opened: boolean;
  onClose: () => void;
  applicationId: string;
  offer: Offer | null;
  defaultKind?: Kind;
}) {
  const save = useSaveOffer();
  const t = useT();
  const form = useForm<Values>({
    initialValues: fromOffer(offer, defaultKind),
    validate: { currency: (v) => (!v || /^[A-Za-z]{3}$/.test(v) ? null : t("plans.threeLetters")) },
  });
  const contract = form.values.employmentType === "contract";

  const submit = form.onSubmit((v) => {
    const body: OfferBody = {
      status: v.status,
      employment_type: v.employmentType,
      currency: blank(v.currency)?.toUpperCase() ?? null,
      // A contract is a day rate; a permanent or fixed-term job is a salary package.
      salary: contract ? null : num(v.salary),
      bonus: contract ? null : num(v.bonus),
      equity: contract ? null : blank(v.equity),
      equity_value: contract ? null : num(v.equityValue),
      pension_percent: contract ? null : num(v.pensionPercent),
      holiday_days: contract ? null : num(v.holidayDays),
      day_rate: contract ? num(v.dayRate) : null,
      ir35: contract ? v.ir35 : null,
      contract_months: contract || v.employmentType === "fixed_term" ? num(v.contractMonths) : null,
      received_on: day(v.receivedOn),
      respond_by: day(v.respondBy),
      start_on: day(v.startOn),
      benefits: blank(v.benefits),
      notes: blank(v.notes),
    };
    save.mutate(offer ? { id: offer.id, body } : { applicationId, body }, { onSuccess: onClose });
  });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={offer ? t("plans.editOffer") : t("plans.addOfferTitle")}
      size="lg"
    >
      <form onSubmit={submit}>
        <Stack>
          <Group grow align="flex-end">
            <SegmentedControl
              aria-label={t("plans.kindAria")}
              data={[
                { value: "permanent", label: t("plans.employmentPermanent") },
                { value: "contract", label: t("plans.employmentContract") },
                { value: "fixed_term", label: t("plans.employmentFixedTerm") },
              ]}
              {...form.getInputProps("employmentType")}
            />
            <Select
              label={t("plans.statusLabel")}
              allowDeselect={false}
              data={Object.entries(STATUS_LABELS).map(([value, s]) => ({ value, label: s.label }))}
              {...form.getInputProps("status")}
            />
          </Group>
          {contract ? (
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <NumberInput
                label={t("plans.dayRate")}
                min={0}
                thousandSeparator=","
                data-autofocus
                {...form.getInputProps("dayRate")}
              />
              <Select
                label={t("plans.colIr35")}
                placeholder={t("plans.notSet")}
                clearable
                data={[
                  { value: "outside", label: t("plans.ir35OutsideOpt") },
                  { value: "inside", label: t("plans.ir35InsideOpt") },
                  { value: "unknown", label: t("plans.ir35UnknownOpt") },
                ]}
                {...form.getInputProps("ir35")}
              />
              <NumberInput
                label={t("plans.lengthMonths")}
                min={0}
                max={120}
                {...form.getInputProps("contractMonths")}
              />
            </SimpleGrid>
          ) : (
            <>
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <NumberInput
                  label={t("plans.baseSalary")}
                  min={0}
                  thousandSeparator=","
                  data-autofocus
                  {...form.getInputProps("salary")}
                />
                <NumberInput
                  label={t("plans.bonusYear")}
                  min={0}
                  thousandSeparator=","
                  {...form.getInputProps("bonus")}
                />
                <NumberInput
                  label={t("plans.pensionPercent")}
                  min={0}
                  max={100}
                  decimalScale={1}
                  {...form.getInputProps("pensionPercent")}
                />
              </SimpleGrid>
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <TextInput
                  label={t("plans.equity")}
                  placeholder={t("plans.equityPlaceholder")}
                  {...form.getInputProps("equity")}
                />
                <NumberInput
                  label={t("plans.equityWorth")}
                  description={t("plans.yourEstimate")}
                  min={0}
                  thousandSeparator=","
                  {...form.getInputProps("equityValue")}
                />
                <NumberInput
                  label={t("plans.holidayDays")}
                  min={0}
                  max={366}
                  {...form.getInputProps("holidayDays")}
                />
              </SimpleGrid>
              {form.values.employmentType === "fixed_term" && (
                <NumberInput
                  label={t("plans.lengthMonths")}
                  min={0}
                  max={120}
                  {...form.getInputProps("contractMonths")}
                />
              )}
            </>
          )}
          <SimpleGrid cols={{ base: 1, sm: 4 }}>
            <TextInput label={t("plans.currency")} maxLength={3} {...form.getInputProps("currency")} />
            <DateInput label={t("plans.received")} clearable {...form.getInputProps("receivedOn")} />
            <DateInput label={t("plans.replyBy")} clearable {...form.getInputProps("respondBy")} />
            <DateInput label={t("plans.startDate")} clearable {...form.getInputProps("startOn")} />
          </SimpleGrid>
          <Textarea
            label={t("plans.benefits")}
            autosize
            minRows={2}
            placeholder={t("plans.benefitsPlaceholder")}
            {...form.getInputProps("benefits")}
          />
          <Textarea label={t("plans.notes")} autosize minRows={2} {...form.getInputProps("notes")} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              {t("shared.cancel")}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {offer ? t("plans.saveOffer") : t("plans.addOffer")}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

/** One line per figure that's set: "Bonus £8,000", "Pension 6%"… */
export function offerFacts(o: Offer): string[] {
  const facts: string[] = [];
  if (o.value_basis === "day rate") {
    if (o.ir35) facts.push(t("plans.factIr35", { status: ir35Word(o.ir35) }));
  } else {
    if (o.bonus) facts.push(t("plans.factBonus", { amount: money(o.bonus, o.currency) }));
    if (o.pension_percent != null) facts.push(t("plans.factPension", { n: o.pension_percent }));
    if (o.equity) facts.push(t("plans.factEquity", { value: o.equity }));
    if (o.holiday_days != null) facts.push(t("plans.daysHoliday", { n: o.holiday_days }));
  }
  if (o.contract_months) facts.push(t("plans.monthsCount", { n: o.contract_months }));
  if (o.start_on) facts.push(t("plans.startsOn", { date: formatDate(o.start_on) }));
  return facts;
}

/** Offers on an application, newest first; a revised offer goes on top. */
export function OffersCard({ applicationId, roleId }: { applicationId: string; roleId: string }) {
  const t = useT();
  const { data: offers } = useOffers({ application_id: applicationId, latest: false });
  const { data: roles } = useRoles();
  // A new offer starts as the kind of job the role is.
  const defaultKind = (roles?.find((r) => r.id === roleId)?.employment_type as Kind | null) ?? "permanent";
  const remove = useDeleteOffer();
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  return (
    <Card withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconCash size={20} stroke={1.6} />
          <Title order={4}>{t("plans.offerTitle")}</Title>
        </Group>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={() => setEditing("new")}
        >
          {offers?.length ? t("plans.addRevisedOffer") : t("plans.addOffer")}
        </Button>
      </Group>
      {!offers?.length ? (
        <Text size="sm" c="dimmed">
          {t("plans.offersEmpty")}
        </Text>
      ) : (
        <Stack gap="sm">
          {offers.map((o, i) => (
            <Card key={o.id} withBorder padding="sm" opacity={i === 0 ? 1 : 0.6}>
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4}>
                  <Group gap="xs">
                    <Text fw={600}>{headline(o)}</Text>
                    <Badge size="sm" variant="light" color={STATUS_LABELS[o.status].color}>
                      {STATUS_LABELS[o.status].label}
                    </Badge>
                    {i > 0 && (
                      <Badge size="sm" variant="outline" color="gray">
                        {t("plans.earlierOffer")}
                      </Badge>
                    )}
                  </Group>
                  {o.annual_value != null && o.value_basis === "salary" && (
                    <Text size="sm">
                      {t("plans.worthTotal", { amount: money(o.annual_value, o.currency) })}
                    </Text>
                  )}
                  {o.annual_value != null && o.value_basis === "day rate" && (
                    <Text size="sm">
                      {t("plans.worthDayRate", { amount: money(o.annual_value, o.currency) })}
                    </Text>
                  )}
                  {offerFacts(o).length > 0 && (
                    <Text size="xs" c="dimmed">
                      {offerFacts(o).join(" · ")}
                    </Text>
                  )}
                  {o.respond_by && o.status === "pending" && (
                    <Text size="xs" c="orange">
                      {t("plans.replyByDate", { date: formatDate(o.respond_by) })}
                    </Text>
                  )}
                </Stack>
                <Group gap={4} wrap="nowrap">
                  <ActionIcon
                    variant="subtle"
                    aria-label={t("plans.editOffer")}
                    onClick={() => setEditing(o)}
                  >
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t("plans.deleteOfferAria")}
                    onClick={() => {
                      if (window.confirm(t("plans.deleteOfferConfirm"))) remove.mutate(o.id);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
      {editing && (
        <OfferFormModal
          key={editing === "new" ? "new" : editing.id}
          opened
          onClose={() => setEditing(null)}
          applicationId={applicationId}
          offer={editing === "new" ? null : editing}
          defaultKind={defaultKind}
        />
      )}
    </Card>
  );
}
