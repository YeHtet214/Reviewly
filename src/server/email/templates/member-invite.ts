type BuildMemberInviteEmailInput = {
  inviteUrl: string;
  agencyName?: string | null;
};

type MemberInviteEmail = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeInviteUrl(inviteUrl: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(inviteUrl.trim());
  } catch {
    throw new Error("Invite URL must be a valid https:// URL.");
  }

  if (parsedUrl.protocol === "http:") {
    parsedUrl.protocol = "https:";
  } else if (parsedUrl.protocol !== "https:") {
    throw new Error("Invite URL must use https://.");
  }

  return parsedUrl.toString();
}

export function buildMemberInviteEmail(
  input: BuildMemberInviteEmailInput,
): MemberInviteEmail {
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

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>${introHtml}</p>
      <p>
        <a href="${safeInviteUrl}">Accept your invitation</a>
      </p>
      <p style="font-size: 14px; color: #555;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="font-size: 14px; color: #555;">
        ${safeInviteUrl}
      </p>
      <p style="font-size: 14px; color: #555;">
        If you did not expect this, you can ignore this email.
      </p>
    </div>
  `;

  return { subject, text, html };
}
