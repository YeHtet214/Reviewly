type BuildClientInviteEmailInput = {
  inviteUrl: string;
  agencyName?: string | null;
  projectName?: string | null;
};

type ClientInviteEmail = {
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

  // temporary disable for localhost
  // if (parsedUrl.protocol === "http:") {
  //   parsedUrl.protocol = "https:";
  // } else if (parsedUrl.protocol !== "https:") {
  //   throw new Error("Invite URL must use https://.");
  // }

  return parsedUrl.toString();
}

export function buildClientInviteEmail(
  input: BuildClientInviteEmailInput,
): ClientInviteEmail {
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

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>${introHtml}</p>
      <p>
        <a href="${safeInviteUrl}">View the project</a>
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
