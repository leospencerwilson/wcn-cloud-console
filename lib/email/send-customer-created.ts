import { emailFrom, getResend } from "./resend";

interface SendCustomerCreatedEmailArgs {
  to: string;
  customerName: string;
  slug: string;
  tier: string;
}

export async function sendCustomerCreatedEmail(
  args: SendCustomerCreatedEmailArgs,
): Promise<void> {
  const { to, customerName, slug, tier } = args;

  const consoleUrl = "https://console.western-communication.com";
  const deploymentUrl = `https://${slug}.western-communication.com`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#FAF7F2;font-family:ui-sans-serif,system-ui,sans-serif;color:#161618;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:48px 16px;">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid rgba(7,14,116,0.14);">
          <tr><td style="padding:40px;">
            <div style="text-transform:uppercase;letter-spacing:0.16em;font-size:11px;color:rgba(7,14,116,0.7);margin-bottom:24px;">WCN Cloud Console</div>
            <h1 style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;font-size:32px;line-height:1.1;margin:0 0 16px 0;color:#070E74;">${customerName} is being provisioned.</h1>
            <p style="font-size:15px;line-height:1.55;margin:0 0 24px 0;">Your WCN Cloud environment is spinning up. This usually takes about five minutes — we'll email again once it's ready to use.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 32px 0;font-size:13px;">
              <tr><td style="padding:6px 0;color:rgba(22,22,24,0.56);width:120px;">Slug</td><td style="padding:6px 0;font-family:ui-monospace,'JetBrains Mono',Menlo,monospace;">${slug}</td></tr>
              <tr><td style="padding:6px 0;color:rgba(22,22,24,0.56);">Tier</td><td style="padding:6px 0;font-family:ui-monospace,'JetBrains Mono',Menlo,monospace;">${tier}</td></tr>
              <tr><td style="padding:6px 0;color:rgba(22,22,24,0.56);">URL</td><td style="padding:6px 0;font-family:ui-monospace,'JetBrains Mono',Menlo,monospace;">${deploymentUrl}</td></tr>
            </table>
            <p style="margin:0 0 16px 0;"><a href="${consoleUrl}" style="display:inline-block;padding:14px 24px;background:#070E74;color:#FAF7F2;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;">Open the console</a></p>
            <p style="font-size:13px;line-height:1.5;color:rgba(22,22,24,0.56);margin:24px 0 0 0;">You'll receive a separate invite email to set up your account on the console.</p>
          </td></tr>
        </table>
        <p style="font-size:11px;color:rgba(22,22,24,0.56);letter-spacing:0.08em;text-transform:uppercase;margin-top:24px;">Western Communication Networks &middot; westerncommunication.co.uk</p>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    `${customerName} is being provisioned.`,
    "",
    "Your WCN Cloud environment is spinning up. This usually takes about five minutes —",
    "we'll email again once it's ready to use.",
    "",
    `Slug: ${slug}`,
    `Tier: ${tier}`,
    `URL:  ${deploymentUrl}`,
    "",
    `Open the console: ${consoleUrl}`,
    "",
    "— WCN Cloud",
  ].join("\n");

  const { error } = await getResend().emails.send({
    from: emailFrom(),
    to,
    subject: `WCN Cloud — ${customerName} is being provisioned`,
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? String(error)}`);
  }
}
