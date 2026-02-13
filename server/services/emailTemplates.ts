import { TIER_PRICING, type SubscriptionTier } from "@shared/schema";

const BRAND_COLOR = "#6366f1";
const BRAND_GRADIENT = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)";
const DARK_BG = "#0f0f14";
const CARD_BG = "#1a1a24";
const CARD_BORDER = "#2a2a3a";
const TEXT_PRIMARY = "#f1f1f4";
const TEXT_SECONDARY = "#9ca3af";
const TEXT_MUTED = "#6b7280";
const SUCCESS_GREEN = "#22c55e";
const WARNING_AMBER = "#f59e0b";
const ERROR_RED = "#ef4444";

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  free: ["5GB Storage", "Basic Uploads", "Standard Preview"],
  personal: ["50GB Storage", "Full Media Editors", "AI Auto-Tags", "Collections & Timeline", "Priority Support"],
  pro: ["500GB Storage", "Advanced AI Tools", "Smart Search", "Auto-Enhance", "Media Merge Studio", "Team Sharing"],
  studio: ["2TB Storage", "Unlimited AI Credits", "DarkWave Studio API", "ORBIT Financial Hub", "Custom Branding", "Dedicated Support"],
};

const TIER_ICONS: Record<SubscriptionTier, string> = {
  free: "I",
  personal: "II",
  pro: "III",
  studio: "IV",
};

function baseLayout(content: string, preheaderText: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>DW Media Studio</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: ${DARK_BG}; color: ${TEXT_PRIMARY}; -webkit-font-smoothing: antialiased; }
    .preheader { display: none !important; font-size: 1px; color: ${DARK_BG}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; }
    a { color: ${BRAND_COLOR}; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .hero-padding { padding: 32px 24px !important; }
      .content-padding { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${DARK_BG};">
  <div class="preheader">${preheaderText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${DARK_BG}; min-height:100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background: ${BRAND_GRADIENT}; border-radius: 12px; padding: 8px 20px;">
                    <span style="font-size: 18px; font-weight: 800; color: white; letter-spacing: 1px;">DW MEDIA STUDIO</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${content}

          <tr>
            <td style="padding-top: 32px; border-top: 1px solid ${CARD_BORDER};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 24px 0 8px;">
                    <span style="font-size: 11px; color: ${TEXT_MUTED}; letter-spacing: 2px; text-transform: uppercase; font-weight: 600;">POWERED BY THE TRUSTLAYER ECOSYSTEM</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 0 12px;"><a href="https://darkwavestudios.io" style="color:${TEXT_SECONDARY}; font-size:12px; font-weight:500;">DarkWave Studios</a></td>
                        <td style="color:${CARD_BORDER}; font-size:12px;">|</td>
                        <td style="padding: 0 12px;"><a href="#" style="color:${TEXT_SECONDARY}; font-size:12px; font-weight:500;">Support</a></td>
                        <td style="color:${CARD_BORDER}; font-size:12px;">|</td>
                        <td style="padding: 0 12px;"><a href="#" style="color:${TEXT_SECONDARY}; font-size:12px; font-weight:500;">Terms</a></td>
                        <td style="color:${CARD_BORDER}; font-size:12px;">|</td>
                        <td style="padding: 0 12px;"><a href="#" style="color:${TEXT_SECONDARY}; font-size:12px; font-weight:500;">Privacy</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 8px 0 0;">
                    <span style="font-size: 11px; color: ${TEXT_MUTED};">Dark Wave Studios, LLC. All rights reserved.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function featureList(features: string[]): string {
  return features.map(f =>
    `<tr>
      <td style="padding: 6px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 24px; vertical-align: top; padding-top: 2px;">
              <span style="color: ${SUCCESS_GREEN}; font-size: 14px;">&#10003;</span>
            </td>
            <td style="font-size: 14px; color: ${TEXT_SECONDARY}; line-height: 1.5;">${f}</td>
          </tr>
        </table>
      </td>
    </tr>`
  ).join("");
}

export interface PurchaseEmailData {
  customerName: string;
  customerEmail: string;
  tier: SubscriptionTier;
  interval: "month" | "year";
  amount: number;
  currency: string;
  subscriptionId: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  portalUrl: string;
  vaultUrl: string;
  periodStart: Date;
  periodEnd: Date;
}

export function buildPurchaseConfirmationEmail(data: PurchaseEmailData): { subject: string; html: string } {
  const pricing = TIER_PRICING[data.tier];
  const features = TIER_FEATURES[data.tier];
  const amountFormatted = `$${(data.amount / 100).toFixed(2)}`;
  const intervalLabel = data.interval === "month" ? "Monthly" : "Annual";
  const nextBillingDate = data.periodEnd.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const purchaseDate = data.periodStart.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const subject = `Welcome to ${pricing.name} - Your DW Media Studio subscription is active`;

  const content = `
          <tr>
            <td style="background: ${BRAND_GRADIENT}; border-radius: 16px 16px 0 0; padding: 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="hero-padding" style="padding: 48px 40px; text-align: center;">
                    <div style="font-size: 36px; font-weight: 800; margin-bottom: 16px; color: rgba(255,255,255,0.3); letter-spacing: 6px;">&#10003;</div>
                    <h1 style="font-size: 28px; font-weight: 800; color: white; margin: 0 0 8px; line-height: 1.2;">You're In, ${data.customerName}!</h1>
                    <p style="font-size: 16px; color: rgba(255,255,255,0.85); margin: 0; font-weight: 400;">Your <strong>${pricing.name}</strong> subscription is now active</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background: ${CARD_BG}; border: 1px solid ${CARD_BORDER}; border-top: none; border-radius: 0 0 16px 16px; overflow: hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                
                <tr>
                  <td class="content-padding" style="padding: 32px 40px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px;">
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 11px; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; padding-bottom: 16px;">ORDER SUMMARY</td>
                            </tr>
                            <tr>
                              <td>
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                  <tr>
                                    <td style="font-size: 14px; color: ${TEXT_SECONDARY}; padding: 6px 0;">Plan</td>
                                    <td align="right" style="font-size: 14px; color: ${TEXT_PRIMARY}; font-weight: 600;">${pricing.name} (${intervalLabel})</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size: 14px; color: ${TEXT_SECONDARY}; padding: 6px 0;">Amount</td>
                                    <td align="right" style="font-size: 14px; color: ${TEXT_PRIMARY}; font-weight: 600;">${amountFormatted} ${data.currency.toUpperCase()}</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size: 14px; color: ${TEXT_SECONDARY}; padding: 6px 0;">Billing Cycle</td>
                                    <td align="right" style="font-size: 14px; color: ${TEXT_PRIMARY}; font-weight: 600;">${intervalLabel}</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size: 14px; color: ${TEXT_SECONDARY}; padding: 6px 0;">Purchase Date</td>
                                    <td align="right" style="font-size: 14px; color: ${TEXT_PRIMARY}; font-weight: 600;">${purchaseDate}</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size: 14px; color: ${TEXT_SECONDARY}; padding: 6px 0;">Next Billing</td>
                                    <td align="right" style="font-size: 14px; color: ${TEXT_PRIMARY}; font-weight: 600;">${nextBillingDate}</td>
                                  </tr>
                                  <tr>
                                    <td colspan="2" style="padding-top: 12px; border-top: 1px solid ${CARD_BORDER};">
                                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                        <tr>
                                          <td style="font-size: 11px; color: ${TEXT_MUTED}; padding-top: 8px;">Subscription ID</td>
                                          <td align="right" style="font-size: 11px; color: ${TEXT_MUTED}; font-family: monospace; padding-top: 8px;">${data.subscriptionId.slice(0, 24)}...</td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="content-padding" style="padding: 0 40px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px;">
                      <tr>
                        <td style="padding: 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 11px; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; padding-bottom: 12px;">YOUR ${pricing.name.toUpperCase()} FEATURES</td>
                            </tr>
                            ${featureList(features)}
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="content-padding" style="padding: 0 40px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; padding-bottom: 16px;">QUICK LINKS</td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <a href="${data.vaultUrl}" style="display: block; background: ${BRAND_GRADIENT}; color: white; text-align: center; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">Open Your Media Vault</a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px;">
                          <a href="${data.portalUrl}" style="display: block; background: transparent; border: 1px solid ${CARD_BORDER}; color: ${TEXT_PRIMARY}; text-align: center; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">Manage Subscription</a>
                        </td>
                      </tr>
                      ${data.receiptUrl ? `<tr>
                        <td style="padding-bottom: 8px;">
                          <a href="${data.receiptUrl}" style="display: block; background: transparent; border: 1px solid ${CARD_BORDER}; color: ${TEXT_PRIMARY}; text-align: center; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">View Receipt</a>
                        </td>
                      </tr>` : ""}
                      ${data.invoiceUrl ? `<tr>
                        <td>
                          <a href="${data.invoiceUrl}" style="display: block; background: transparent; border: 1px solid ${CARD_BORDER}; color: ${TEXT_PRIMARY}; text-align: center; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">Download Invoice</a>
                        </td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="content-padding" style="padding: 0 40px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(99,102,241,0.04); border-radius: 12px; border: 1px solid ${CARD_BORDER};">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="font-size: 13px; color: ${TEXT_SECONDARY}; line-height: 1.6;">
                                <strong style="color: ${TEXT_PRIMARY};">Need help?</strong> Our support team is available to assist with setup, media uploads, or any subscription questions. Reply to this email or visit our support center.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return { subject, html: baseLayout(content, `Your ${pricing.name} subscription is now active - ${amountFormatted}/${data.interval}`) };
}

export interface SubscriptionChangeEmailData {
  customerName: string;
  customerEmail: string;
  oldTier: SubscriptionTier;
  newTier: SubscriptionTier;
  interval: "month" | "year";
  amount: number;
  currency: string;
  portalUrl: string;
  vaultUrl: string;
  periodEnd: Date;
}

export function buildSubscriptionChangeEmail(data: SubscriptionChangeEmailData): { subject: string; html: string } {
  const oldPricing = TIER_PRICING[data.oldTier];
  const newPricing = TIER_PRICING[data.newTier];
  const features = TIER_FEATURES[data.newTier];
  const amountFormatted = `$${(data.amount / 100).toFixed(2)}`;
  const isUpgrade = ["free", "personal", "pro", "studio"].indexOf(data.newTier) > ["free", "personal", "pro", "studio"].indexOf(data.oldTier);

  const subject = isUpgrade
    ? `Upgraded to ${newPricing.name} - DW Media Studio`
    : `Plan changed to ${newPricing.name} - DW Media Studio`;

  const content = `
          <tr>
            <td style="background: ${BRAND_GRADIENT}; border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="hero-padding" style="padding: 40px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 800; margin-bottom: 12px; color: rgba(255,255,255,0.3); letter-spacing: 4px;">${isUpgrade ? "&#9650;" : "&#9660;"}</div>
                    <h1 style="font-size: 24px; font-weight: 800; color: white; margin: 0 0 8px;">Plan ${isUpgrade ? "Upgraded" : "Changed"}</h1>
                    <p style="font-size: 15px; color: rgba(255,255,255,0.85); margin: 0;">${oldPricing.name} &rarr; <strong>${newPricing.name}</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: ${CARD_BG}; border: 1px solid ${CARD_BORDER}; border-top: none; border-radius: 0 0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-padding" style="padding: 32px 40px;">
                    <p style="font-size: 15px; color: ${TEXT_SECONDARY}; line-height: 1.7; margin: 0 0 24px;">
                      Hi ${data.customerName}, your subscription has been updated to <strong style="color: ${TEXT_PRIMARY};">${newPricing.name}</strong> at <strong style="color: ${TEXT_PRIMARY};">${amountFormatted}/${data.interval}</strong>. Your new features are available immediately.
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.15); border-radius: 12px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr><td style="font-size: 11px; color: ${TEXT_MUTED}; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; padding-bottom: 12px;">NOW INCLUDED</td></tr>
                            ${featureList(features)}
                          </table>
                        </td>
                      </tr>
                    </table>
                    <a href="${data.vaultUrl}" style="display: block; background: ${BRAND_GRADIENT}; color: white; text-align: center; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 700; margin-bottom: 8px;">Open Your Vault</a>
                    <a href="${data.portalUrl}" style="display: block; border: 1px solid ${CARD_BORDER}; color: ${TEXT_PRIMARY}; text-align: center; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">Manage Subscription</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return { subject, html: baseLayout(content, `Your plan has been ${isUpgrade ? "upgraded" : "changed"} to ${newPricing.name}`) };
}

export interface CancellationEmailData {
  customerName: string;
  customerEmail: string;
  tier: SubscriptionTier;
  portalUrl: string;
  vaultUrl: string;
}

export function buildCancellationEmail(data: CancellationEmailData): { subject: string; html: string } {
  const pricing = TIER_PRICING[data.tier];

  const subject = `Your ${pricing.name} subscription has been canceled - DW Media Studio`;

  const content = `
          <tr>
            <td style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="hero-padding" style="padding: 40px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 800; margin-bottom: 12px; color: rgba(255,255,255,0.3); letter-spacing: 4px;">&#9711;</div>
                    <h1 style="font-size: 24px; font-weight: 800; color: white; margin: 0 0 8px;">Subscription Canceled</h1>
                    <p style="font-size: 15px; color: rgba(255,255,255,0.75); margin: 0;">We're sorry to see you go</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: ${CARD_BG}; border: 1px solid ${CARD_BORDER}; border-top: none; border-radius: 0 0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-padding" style="padding: 32px 40px;">
                    <p style="font-size: 15px; color: ${TEXT_SECONDARY}; line-height: 1.7; margin: 0 0 24px;">
                      Hi ${data.customerName}, your <strong style="color: ${TEXT_PRIMARY};">${pricing.name}</strong> subscription has been canceled. Your account has been moved to the Free tier. You can still access your vault, though some features may be limited.
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.15); border-radius: 12px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <p style="font-size: 14px; color: ${WARNING_AMBER}; margin: 0 0 8px; font-weight: 600;">What happens now?</p>
                          <p style="font-size: 13px; color: ${TEXT_SECONDARY}; line-height: 1.6; margin: 0;">Your media files are safe. You can re-subscribe anytime to unlock your full features again. No data is lost.</p>
                        </td>
                      </tr>
                    </table>
                    <a href="${data.portalUrl}" style="display: block; background: ${BRAND_GRADIENT}; color: white; text-align: center; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 700; margin-bottom: 8px;">Resubscribe</a>
                    <a href="${data.vaultUrl}" style="display: block; border: 1px solid ${CARD_BORDER}; color: ${TEXT_PRIMARY}; text-align: center; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;">Access Your Vault</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return { subject, html: baseLayout(content, `Your ${pricing.name} subscription has been canceled`) };
}

export interface PaymentFailedEmailData {
  customerName: string;
  customerEmail: string;
  tier: SubscriptionTier;
  amount: number;
  currency: string;
  portalUrl: string;
}

export function buildPaymentFailedEmail(data: PaymentFailedEmailData): { subject: string; html: string } {
  const pricing = TIER_PRICING[data.tier];
  const amountFormatted = `$${(data.amount / 100).toFixed(2)}`;

  const subject = `Action required: Payment failed for DW Media Studio`;

  const content = `
          <tr>
            <td style="background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="hero-padding" style="padding: 40px; text-align: center;">
                    <div style="font-size: 28px; font-weight: 800; margin-bottom: 12px; color: rgba(255,255,255,0.3); letter-spacing: 4px;">&#9888;</div>
                    <h1 style="font-size: 24px; font-weight: 800; color: white; margin: 0 0 8px;">Payment Failed</h1>
                    <p style="font-size: 15px; color: rgba(255,255,255,0.75); margin: 0;">We couldn't process your ${amountFormatted} payment</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background: ${CARD_BG}; border: 1px solid ${CARD_BORDER}; border-top: none; border-radius: 0 0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="content-padding" style="padding: 32px 40px;">
                    <p style="font-size: 15px; color: ${TEXT_SECONDARY}; line-height: 1.7; margin: 0 0 24px;">
                      Hi ${data.customerName}, we were unable to charge <strong style="color: ${TEXT_PRIMARY};">${amountFormatted} ${data.currency.toUpperCase()}</strong> for your <strong style="color: ${TEXT_PRIMARY};">${pricing.name}</strong> subscription. Please update your payment method to keep your features active.
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(239,68,68,0.06); border: 1px solid rgba(239,68,68,0.15); border-radius: 12px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <p style="font-size: 14px; color: ${ERROR_RED}; margin: 0 0 8px; font-weight: 600;">What happens if not resolved?</p>
                          <p style="font-size: 13px; color: ${TEXT_SECONDARY}; line-height: 1.6; margin: 0;">If we can't collect payment, your subscription may be downgraded to the Free tier. Your files remain safe, but premium features will be paused.</p>
                        </td>
                      </tr>
                    </table>
                    <a href="${data.portalUrl}" style="display: block; background: ${BRAND_GRADIENT}; color: white; text-align: center; padding: 14px 24px; border-radius: 10px; font-size: 15px; font-weight: 700;">Update Payment Method</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return { subject, html: baseLayout(content, `Action required: Payment of ${amountFormatted} failed for your ${pricing.name} subscription`) };
}
