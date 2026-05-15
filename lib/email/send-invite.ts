import { emailFrom, getResend } from "./resend";

interface SendInviteEmailArgs {
  to: string;
  inviteUrl: string;
  role: "wcn_admin" | "customer_admin";
  customerName: string | null;
  expiresAt: Date;
}

export async function sendInviteEmail(args: SendInviteEmailArgs): Promise<void> {
  const { to, inviteUrl, role, customerName, expiresAt } = args;

  const heading =
    role === "wcn_admin"
      ? "You've been invited to WCN Cloud."
      : `You've been invited to manage ${customerName ?? "your environment"} on WCN Cloud.`;

  const expiresLine = `This link expires on ${expiresAt.toUTCString()}.`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#FAF7F2;font-family:ui-sans-serif,system-ui,sans-serif;color:#161618;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid rgba(7,14,116,0.14);">
          <tr><td style="padding:40px;">
            <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:11px;color:rgba(7,14,116,0.7);margin-bottom:24px;">WCN Cloud Console</div>
            <h1 style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;font-size:32px;line-height:1.1;margin:0 0 16px 0;color:#070E74;">${heading}</h1>
            <p style="font-size:15px;line-height:1.55;margin:0 0 24px 0;">Click the button below to set a password and finish setting up your account.</p>
            <p style="margin:0 0 32px 0;"><a href="${inviteUrl}" style="display:inline-block;padding:14px 24px;background:#070E74;color:#FAF7F2;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">Accept invite</a></p>
            <p style="font-size:13px;line-height:1.5;color:rgba(22,22,24,0.56);margin:0 0 8px 0;">${expiresLine}</p>
            <p style="font-size:13px;line-height:1.5;color:rgba(22,22,24,0.56);margin:0 0 24px 0;">If the button doesn't work, paste this URL into your browser:</p>
            <p style="font-family:ui-monospace,'JetBrains Mono',Menlo,monospace;font-size:12px;word-break:break-all;color:#070E74;margin:0;">${inviteUrl}</p>
          </td></tr>
        </table>
        <p style="font-size:11px;color:rgba(22,22,24,0.56);letter-spacing:0.08em;text-transform:uppercase;margin-top:24px;">Western Communication Networks &middot; westerncommunication.co.uk</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    heading,
    "",
    "Accept your invite:",
    inviteUrl,
    "",
    expiresLine,
    "",
    "— WCN Cloud",
  ].join("\n");

  const subject =
    role === "wcn_admin"
      ? "Your WCN Cloud admin invite"
      : `Your WCN Cloud invite${customerName ? ` — ${customerName}` : ""}`;

  const { error } = await getResend().emails.send({
    from: emailFrom(),
    to,
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? String(error)}`);
  }
}
