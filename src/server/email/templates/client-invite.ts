import {
  type EmailContent,
  buildBaseHtml,
  escapeHtml,
  normalizeInviteUrl,
} from "./utils";

type BuildClientInviteEmailInput = {
  inviteUrl: string;
  agencyName?: string | null;
  projectName?: string | null;
};

export function buildClientInviteEmail(
  input: BuildClientInviteEmailInput,
): EmailContent {
  const agencyName = input.agencyName?.trim();
  const projectName = input.projectName?.trim();
  const validatedInviteUrl = normalizeInviteUrl(input.inviteUrl);
  const safeInviteUrl = escapeHtml(validatedInviteUrl);
  const safeAgencyName = agencyName ? escapeHtml(agencyName) : null;
  const safeProjectName = projectName ? escapeHtml(projectName) : null;

  let subject = "You're invited to view a project";
  if (projectName) {
    subject = `You're invited to view ${projectName}`;
  }

  let introText = "You've been invited to view a project.";
  let introHtml = "You've been invited to view a project.";

  if (projectName && agencyName) {
    introText = `You've been invited to view ${projectName} from ${agencyName}.`;
    introHtml = `You've been invited to view ${safeProjectName} from ${safeAgencyName}.`;
  } else if (projectName) {
    introText = `You've been invited to view ${projectName}.`;
    introHtml = `You've been invited to view ${safeProjectName}.`;
  } else if (agencyName) {
    introText = `You've been invited to view a project from ${agencyName}.`;
    introHtml = `You've been invited to view a project from ${safeAgencyName}.`;
  }

  const text = `${introText}\n\nAccess the project here:\n${validatedInviteUrl}\n\nIf you did not expect this, you can ignore this email.`;

  const html = buildBaseHtml({
    introHtml,
    actionUrl: safeInviteUrl,
    actionText: "View the project",
  });

  return { subject, text, html };
}
