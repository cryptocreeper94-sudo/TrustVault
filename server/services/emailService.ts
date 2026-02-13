import { getResendClient } from "./resendClient";
import {
  buildPurchaseConfirmationEmail,
  buildSubscriptionChangeEmail,
  buildCancellationEmail,
  buildPaymentFailedEmail,
  type PurchaseEmailData,
  type SubscriptionChangeEmailData,
  type CancellationEmailData,
  type PaymentFailedEmailData,
} from "./emailTemplates";

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    const result = await client.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("[Email] Send failed:", result.error);
      return false;
    }

    console.log(`[Email] Sent "${subject}" to ${to} (id: ${result.data?.id})`);
    return true;
  } catch (err: any) {
    console.error("[Email] Error sending email:", err.message);
    return false;
  }
}

export async function sendPurchaseConfirmation(data: PurchaseEmailData): Promise<boolean> {
  const { subject, html } = buildPurchaseConfirmationEmail(data);
  return sendEmail(data.customerEmail, subject, html);
}

export async function sendSubscriptionChangeNotification(data: SubscriptionChangeEmailData): Promise<boolean> {
  const { subject, html } = buildSubscriptionChangeEmail(data);
  return sendEmail(data.customerEmail, subject, html);
}

export async function sendCancellationNotification(data: CancellationEmailData): Promise<boolean> {
  const { subject, html } = buildCancellationEmail(data);
  return sendEmail(data.customerEmail, subject, html);
}

export async function sendPaymentFailedNotification(data: PaymentFailedEmailData): Promise<boolean> {
  const { subject, html } = buildPaymentFailedEmail(data);
  return sendEmail(data.customerEmail, subject, html);
}
