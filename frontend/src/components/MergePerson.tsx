import { Alert, Button, Group, List, Modal, Select, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowsJoin2, IconCopy } from "@tabler/icons-react";
import { useState } from "react";

import type { Contact } from "../api/client";
import { useAgencies, useCompanies, useContacts } from "../api/hooks";
import { useMergeContact } from "../api/peopleHooks";

/** An email address or LinkedIn profile, written the way the server compares them. */
function identities(c: Contact): Set<string> {
  const out = new Set<string>();
  for (const d of c.details) {
    const value = d.value.trim().toLowerCase();
    if (d.kind === "email" && value.includes("@")) out.add(`email:${value}`);
    const m = value.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/);
    if (m) out.add(`linkedin:${m[1]}`);
  }
  return out;
}

const sameName = (a: Contact, b: Contact) =>
  a.name.trim().toLowerCase().replace(/\s+/g, " ") === b.name.trim().toLowerCase().replace(/\s+/g, " ");

/** Other people who look like the same person: same name, email address or LinkedIn profile. */
export function likelyDuplicates(person: Contact, everyone: Contact[]): { contact: Contact; why: string }[] {
  const mine = identities(person);
  const out: { contact: Contact; why: string }[] = [];
  for (const other of everyone) {
    if (other.id === person.id) continue;
    const shared = [...identities(other)].find((k) => mine.has(k));
    if (shared)
      out.push({ contact: other, why: shared.startsWith("email") ? "same email" : "same LinkedIn" });
    else if (sameName(person, other)) out.push({ contact: other, why: "same name" });
  }
  return out;
}

function useWhere() {
  const { data: agencies } = useAgencies();
  const { data: companies } = useCompanies();
  const agency = new Map((agencies ?? []).map((a) => [a.id, a.name]));
  const company = new Map((companies ?? []).map((c) => [c.id, c.name]));
  return (c: Contact) =>
    (c.agency_id && agency.get(c.agency_id)) || (c.company_id && company.get(c.company_id)) || null;
}

function MergeModal({
  person,
  opened,
  onClose,
  initial,
}: {
  person: Contact;
  opened: boolean;
  onClose: () => void;
  initial: string | null;
}) {
  const { data: contacts } = useContacts();
  const merge = useMergeContact();
  const where = useWhere();
  const [fromId, setFromId] = useState<string | null>(initial);
  const everyone = contacts ?? [];
  const likely = likelyDuplicates(person, everyone);
  const likelyIds = new Set(likely.map((l) => l.contact.id));
  const label = (c: Contact, why?: string) =>
    `${[c.name, where(c)].filter(Boolean).join(" · ")}${why ? ` (${why})` : ""}`;
  const data = [
    ...(likely.length
      ? [
          {
            group: "Looks like the same person",
            items: likely.map((l) => ({ value: l.contact.id, label: label(l.contact, l.why) })),
          },
        ]
      : []),
    {
      group: "Everyone else",
      items: everyone
        .filter((c) => c.id !== person.id && !likelyIds.has(c.id))
        .map((c) => ({ value: c.id, label: label(c) })),
    },
  ].filter((g) => g.items.length);
  const other = everyone.find((c) => c.id === fromId);

  return (
    <Modal opened={opened} onClose={onClose} title={`Merge someone into ${person.name}`} size="lg">
      <Stack>
        <Text size="sm">
          Two records of the same person? Pick the other one: everything on it moves to <b>{person.name}</b>,
          and then it's deleted.
        </Text>
        {data.length ? (
          <Select
            label="The other record"
            placeholder="Choose a person"
            searchable
            data={data}
            value={fromId}
            onChange={setFromId}
            nothingFoundMessage="No one by that name"
          />
        ) : (
          <Text size="sm" c="dimmed">
            There's no one else to merge in.
          </Text>
        )}
        {other && (
          <Alert variant="light" color="blue" icon={<IconArrowsJoin2 size={18} />}>
            <Text size="sm" fw={600} mb={4}>
              From {other.name} to {person.name}:
            </Text>
            <List size="sm" spacing={2}>
              <List.Item>contact details {person.name} doesn't already have</List.Item>
              <List.Item>calls, and the roles they pitched</List.Item>
              <List.Item>the applications and interviews they're on</List.Item>
              <List.Item>notes, links, files and to-dos about them</List.Item>
              <List.Item>
                title, agency or company, and waiting or chased, where {person.name} has none
              </List.Item>
            </List>
            <Text size="sm" mt={6}>
              Then {other.name} is deleted. This can't be undone (but your data repo keeps history).
            </Text>
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!fromId}
            loading={merge.isPending}
            leftSection={<IconArrowsJoin2 size={16} />}
            onClick={() =>
              fromId &&
              merge.mutate(
                { id: person.id, fromId },
                {
                  onSuccess: () => {
                    notifications.show({
                      color: "green",
                      title: "Merged",
                      message: `${other?.name ?? "They"} merged into ${person.name}.`,
                    });
                    setFromId(null);
                    onClose();
                  },
                },
              )
            }
          >
            Merge into {person.name}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** "Merge…" on a person's page. */
export function MergePersonButton({ person }: { person: Contact }) {
  const [opened, setOpened] = useState(false);
  return (
    <>
      <Button
        variant="default"
        size="xs"
        leftSection={<IconArrowsJoin2 size={14} />}
        onClick={() => setOpened(true)}
      >
        Merge…
      </Button>
      {opened && <MergeModal person={person} opened onClose={() => setOpened(false)} initial={null} />}
    </>
  );
}

const NOT_SAME = "jat.notTheSamePerson";

/** Pairs you've said aren't the same person (in this browser), as "a|b" with the ids sorted. */
function readNotSame(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOT_SAME) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

const pair = (a: string, b: string) => [a, b].sort().join("|");

/** On a person's page: a nudge when someone else looks like the same person. */
export function PossibleDuplicates({ person }: { person: Contact }) {
  const { data: contacts } = useContacts();
  const where = useWhere();
  const [merging, setMerging] = useState<string | null>(null);
  const [notSame, setNotSame] = useState(readNotSame);
  const dismiss = (otherId: string) => {
    const next = new Set(notSame).add(pair(person.id, otherId));
    setNotSame(next);
    try {
      localStorage.setItem(NOT_SAME, JSON.stringify([...next]));
    } catch {
      // No storage (a private window): it's hidden until the page reloads.
    }
  };
  const likely = likelyDuplicates(person, contacts ?? []).filter(
    ({ contact }) => !notSame.has(pair(person.id, contact.id)),
  );
  if (!likely.length) return null;
  return (
    <Alert variant="light" color="yellow" icon={<IconCopy size={18} />} title="Looks like a duplicate">
      <Stack gap={6}>
        {likely.map(({ contact, why }) => (
          <Group key={contact.id} justify="space-between" wrap="wrap" gap="xs">
            <Text size="sm">
              <b>{contact.name}</b>
              {where(contact) ? ` · ${where(contact)}` : ""} has the {why}.
            </Text>
            <Group gap={6}>
              <Button
                size="compact-xs"
                variant="light"
                aria-label={`Merge ${contact.name}${where(contact) ? ` (${where(contact)})` : ""} into this one`}
                onClick={() => setMerging(contact.id)}
              >
                Merge into this one
              </Button>
              <Button
                size="compact-xs"
                variant="subtle"
                color="gray"
                aria-label={`${contact.name}${where(contact) ? ` (${where(contact)})` : ""} is not the same person`}
                onClick={() => dismiss(contact.id)}
              >
                Not the same person
              </Button>
            </Group>
          </Group>
        ))}
      </Stack>
      {merging && <MergeModal person={person} opened onClose={() => setMerging(null)} initial={merging} />}
    </Alert>
  );
}
