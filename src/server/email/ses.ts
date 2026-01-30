import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SendEmailResult = { ok: true } | { ok: false; error: string };

function resolveSesConfig():
  | { ok: true; client: SESClient; fromEmail: string }
  | { ok: false; error: string } {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const fromEmail = process.env.SES_FROM_EMAIL;

  if (!region || !accessKeyId || !secretAccessKey || !fromEmail) {
    return { ok: false, error: "Email service is not configured." };
  }

  const client = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey, sessionToken },
  });

  return { ok: true, client, fromEmail };
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const config = resolveSesConfig();
  if (!config.ok) {
    return { ok: false, error: config.error };
  }

  const { client, fromEmail } = config;
  const { to, subject, text, html } = input;

  try {
    await client.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject },
          Body: {
            Text: { Data: text },
            Html: { Data: html },
          },
        },
      }),
    );
    return { ok: true };
  } catch (error) {
    console.error("sendEmail: unable to send SES email", { error });
    return {
      ok: false,
      error: "Unable to send invitation email. Share the invite link manually.",
    };
  }
}
