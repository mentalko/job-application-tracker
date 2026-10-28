import { Alert, Anchor, List, Text } from "@mantine/core";
import { IconCopy } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { Duplicate } from "../api/client";
import { t, useT } from "../i18n";
import { formatDate } from "../utils/time";

function via(d: Duplicate): string {
  if (d.route === "agency")
    return t("applications.duplicateVia", {
      name: d.agency_name ?? d.recruiter_name ?? t("applications.duplicateARecruiter"),
    });
  if (d.route === "referral") return t("applications.duplicateByReferral");
  return t("applications.duplicateDirectly");
}

function describe(d: Duplicate): string {
  const how = d.applied_on
    ? t("applications.duplicateOnDate", { via: via(d), date: formatDate(d.applied_on) })
    : via(d);
  const bits = [how, t("applications.duplicateNowStage", { stage: d.stage_name })];
  if (d.archived) bits.push(t("applications.duplicateArchived"));
  return bits.join(" · ");
}

/**
 * Other applications that look like the same job. Shown while adding an application ("have you
 * applied already?") and on an application's page ("also applied via…").
 */
export function DuplicateWarning({
  duplicates,
  title,
  onNavigate,
}: {
  duplicates: Duplicate[];
  title: string;
  onNavigate?: () => void;
}) {
  const t = useT();
  if (!duplicates.length) return null;
  return (
    <Alert color="yellow" variant="light" icon={<IconCopy size={18} />} title={title}>
      <List size="sm" spacing={2}>
        {duplicates.map((d) => (
          <List.Item key={d.id}>
            <Anchor component={Link} to={`/applications/${d.id}`} size="sm" onClick={onNavigate}>
              {t("applications.duplicateLink", { role: d.role_title, company: d.company_name })}
            </Anchor>{" "}
            <Text span size="sm" c="dimmed">
              {describe(d)}
              {d.match === "similar_title" ? t("applications.duplicateSimilarTitle") : ""}
            </Text>
          </List.Item>
        ))}
      </List>
    </Alert>
  );
}
