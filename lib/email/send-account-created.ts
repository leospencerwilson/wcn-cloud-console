import { emailFrom, getResend } from "./resend";

interface SendAccountCreatedEmailArgs {
  to: string;
  name: string;
  role: "wcn_admin" | "customer_admin";
  customerName: string | null;
}

export async function sendAccountCreatedEmail(
  args: SendAccountCreatedEmailArgs,
): Promise<void> {
  const { to, name, role, customerName } = args;

  const consoleUrl = "https://console.western-communication.com";
  const roleLabel = role === "wcn_admin" ? "WCN Admin" : "Customer Admin";
  const scope =
    role === "wcn_admin"
      ? "the WCN Cloud fleet"
      : customerName
        ? `the ${customerName} environment`
        : "your environment";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#FAF7F2;font-family:ui-sans-serif,system-ui,sans-serif;color:#161618;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid rgba(7,14,116,0.14);">
          <tr><td style="padding:40px;">
            <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:11px;color:rgba(7,14,116,0.7);margin-bottom:24px;">WCN Cloud Console</div>
            <h1 style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;font-size:32px;line-height:1.1;margin:0 0 16px 0;color:#070E74;">Welcome, ${name}.</h1>
            <p style="font-size:15px;line-height:1.55;margin:0 0 24px 0;">Your WCN Cloud account is set up. You're signed in as <strong>${roleLabel}</strong> with access to ${scope}.</p>
            <p style="margin:0 0 32px 0;"><a href="${consoleUrl}" style="display:inline-block;padding:14px 24px;background:#070E74;color:#FAF7F2;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">Open the console</a></p>
            <p style="font-size:13px;line-height:1.5;color:rgba(22,22,24,0.56);margin:0;">If you didn't expect this email, contact <a href="mailto:cloud-support@western-communication.com" style="color:#070E74;">cloud-support@western-communication.com</a> immediately.</p>
          </td></tr>
        </table>
        <p style="font-size:11px;color:rgba(22,22,24,0.56);letter-spacing:0.08em;text-transform:uppercase;margin-top:24px;">Western Communication Networks &middot; westerncommunication.co.uk</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `Welcome, ${name}.`,
    "",
    `Your WCN Cloud account is set up. You're signed in as ${roleLabel} with access to ${scope}.`,
    "",
    `Open the console: ${consoleUrl}`,
    "",
    "If you didn't expect this email, contact cloud-support@western-communication.com immediately.",
    "",
    "— WCN Cloud",
  ].join("\n");

  const { error } = await getResend().emails.send({
    from: emailFrom(),
    to,
    subject: "Your WCN Cloud account is ready",
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? String(error)}`);
  }
}
