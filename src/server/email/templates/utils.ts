export type EmailContent = {
    subject: string;
    text: string;
    html: string;
};

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function normalizeInviteUrl(inviteUrl: string): string {
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

type BaseEmailTemplateProps = {
    introHtml: string;
    actionUrl: string;
    actionText: string;
};

export function buildBaseHtml({ introHtml, actionUrl, actionText }: BaseEmailTemplateProps): string {
    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <p>${introHtml}</p>
      <p>
        <a href="${actionUrl}">${actionText}</a>
      </p>
      <p style="font-size: 14px; color: #555;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="font-size: 14px; color: #555;">
        ${actionUrl}
      </p>
      <p style="font-size: 14px; color: #555;">
        If you did not expect this, you can ignore this email.
      </p>
    </div>
  `;
}
