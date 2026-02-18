import {
  type EmailContent,
  buildBaseHtml,
  escapeHtml,
  normalizeInviteUrl,
} from "./utils";

type BuildMemberInviteEmailInput = {
  inviteUrl: string;
  agencyName?: string | null;
};

export function buildMemberInviteEmail(
  input: BuildMemberInviteEmailInput,
): EmailContent {
  const agencyName = input.agencyName?.trim();
  const validatedInviteUrl = normalizeInviteUrl(input.inviteUrl);
  const safeInviteUrl = escapeHtml(validatedInviteUrl);
  const safeAgencyName = agencyName ? escapeHtml(agencyName) : null;
  const subject = agencyName
    ? `You're invited to join ${agencyName}`
    : "You're invited to join the team";

  const introText = agencyName
    ? `You've been invited to join ${agencyName}.`
    : "You've been invited to join the team.";
  const introHtml = safeAgencyName
    ? `You've been invited to join ${safeAgencyName}.`
    : "You've been invited to join the team.";

  const text = `${introText}\n\nAccept your invitation here:\n${validatedInviteUrl}\n\nIf you did not expect this, you can ignore this email.`;

  const html = buildBaseHtml({
    introHtml,
    actionUrl: safeInviteUrl,
    actionText: "Accept your invitation",
  });

  return { subject, text, html };
}
