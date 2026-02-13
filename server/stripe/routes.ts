import { type Express, type Request, type Response, type NextFunction } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { TIER_PRICING, type SubscriptionTier } from "@shared/schema";
import {
  sendPurchaseConfirmation,
  sendSubscriptionChangeNotification,
  sendCancellationNotification,
  sendPaymentFailedNotification,
} from "../services/emailService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function resolveCustomerEmail(customerId: string): Promise<{ email: string | null; name: string }> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return { email: null, name: "Subscriber" };
    const tenantId = (customer as Stripe.Customer).metadata?.tenantId;
    let email = (customer as Stripe.Customer).email;
    let name = (customer as Stripe.Customer).name || "Subscriber";

    if (!email && tenantId) {
      const tenant = await storage.getTenant(tenantId);
      if (tenant?.pinAuthId) {
        const auth = await storage.getPinAuthById(tenant.pinAuthId);
        if (auth?.email) email = auth.email;
        if (auth?.name) name = auth.name;
      }
    }

    return { email, name };
  } catch {
    return { email: null, name: "Subscriber" };
  }
}

function getBaseUrl(req: Request): string {
  const host = req.headers.host || "localhost:5000";
  const protocol = req.headers["x-forwarded-proto"] || "http";
  return `${protocol}://${host}`;
}

function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

const STRIPE_PRICE_MAP: Record<string, { tier: SubscriptionTier; interval: "month" | "year" }> = {};

async function ensureStripeProducts() {
  const tiers: SubscriptionTier[] = ["personal", "pro", "studio"];

  for (const tier of tiers) {
    const pricing = TIER_PRICING[tier];

    const products = await stripe.products.search({
      query: `metadata["tier"]:"${tier}"`,
    });

    let product: Stripe.Product;
    if (products.data.length > 0) {
      product = products.data[0];
    } else {
      product = await stripe.products.create({
        name: `DW Media Studio - ${pricing.name}`,
        description: pricing.description,
        metadata: { tier },
      });
    }

    const existingPrices = await stripe.prices.list({
      product: product.id,
      active: true,
    });

    let monthlyPrice = existingPrices.data.find(
      (p) => p.recurring?.interval === "month"
    );
    let annualPrice = existingPrices.data.find(
      (p) => p.recurring?.interval === "year"
    );

    if (!monthlyPrice) {
      monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: pricing.monthly,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: { tier },
      });
    }

    if (!annualPrice) {
      annualPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: pricing.annual,
        currency: "usd",
        recurring: { interval: "year" },
        metadata: { tier },
      });
    }

    STRIPE_PRICE_MAP[monthlyPrice.id] = { tier, interval: "month" };
    STRIPE_PRICE_MAP[annualPrice.id] = { tier, interval: "year" };

    console.log(`Stripe prices for ${tier}: monthly=${monthlyPrice.id}, annual=${annualPrice.id}`);
  }

  console.log("Stripe products and prices initialized");
  console.log("STRIPE_PRICE_MAP:", JSON.stringify(STRIPE_PRICE_MAP, null, 2));
}

export function registerStripeRoutes(app: Express) {
  ensureStripeProducts().catch((err) => {
    console.error("Failed to initialize Stripe products:", err.message);
  });

  app.get("/api/stripe/config", (_req, res) => {
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  });

  app.get("/api/subscription", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.json({ tier: "free", status: "active" });
      }
      const sub = await storage.getSubscription(tenantId);
      if (!sub) {
        return res.json({ tier: "free", status: "active" });
      }
      res.json(sub);
    } catch (err) {
      console.error("Get subscription error:", err);
      res.status(500).json({ message: "Failed to get subscription" });
    }
  });

  app.post("/api/stripe/checkout", isAuthenticated, async (req, res) => {
    try {
      const { tier, interval } = req.body as { tier: SubscriptionTier; interval: "month" | "year" };
      const tenantId = req.session.tenantId;

      if (!tenantId) {
        return res.status(400).json({ message: "No tenant space found. Please log in again." });
      }

      if (!tier || !["personal", "pro", "studio"].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      if (!interval || !["month", "year"].includes(interval)) {
        return res.status(400).json({ message: "Invalid interval" });
      }

      let sub = await storage.getSubscription(tenantId);
      let customerId: string;

      if (sub?.stripeCustomerId) {
        customerId = sub.stripeCustomerId;
      } else {
        const tenant = await storage.getTenant(tenantId);
        if (tenant?.stripeCustomerId) {
          customerId = tenant.stripeCustomerId;
        } else {
          const customer = await stripe.customers.create({
            name: req.session.name,
            metadata: { app: "dw-media-studio", tenantId },
          });
          customerId = customer.id;
          await storage.updateTenant(tenantId, { stripeCustomerId: customerId });
        }
        await storage.upsertSubscription({
          tenantId,
          stripeCustomerId: customerId,
          tier: "free",
          status: "active",
        });
      }

      const priceEntry = Object.entries(STRIPE_PRICE_MAP).find(
        ([_, v]) => v.tier === tier && v.interval === interval
      );

      if (!priceEntry) {
        return res.status(400).json({ message: "Price not found. Stripe products may still be initializing." });
      }

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const baseUrl = `${protocol}://${host}`;

      let customerEmail: string | undefined;
      if (req.session.pinAuthId) {
        const auth = await storage.getPinAuthById(req.session.pinAuthId);
        if (auth?.email) customerEmail = auth.email;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerEmail && !sub?.stripeCustomerId ? customerEmail : undefined,
        mode: "subscription",
        line_items: [{ price: priceEntry[0], quantity: 1 }],
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { tier, interval, tenantId },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err.message);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req, res) => {
    try {
      const tenantId = req.session.tenantId;
      if (!tenantId) {
        return res.status(400).json({ message: "No tenant space found" });
      }
      const sub = await storage.getSubscription(tenantId);
      if (!sub?.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      const host = req.headers.host || "localhost:5000";
      const protocol = req.headers["x-forwarded-proto"] || "http";
      const baseUrl = `${protocol}://${host}`;

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${baseUrl}/pricing`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Portal error:", err.message);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  app.post("/api/stripe/webhook", async (req: any, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        event = stripe.webhooks.constructEvent(
          req.rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        event = req.body as Stripe.Event;
      }
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: "Webhook error" });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.subscription && session.customer) {
            const subscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            const priceId = subscription.items.data[0]?.price.id;
            const tierInfo = STRIPE_PRICE_MAP[priceId];
            const customerId = session.customer as string;
            const tenantId = session.metadata?.tenantId;

            let tenant = await storage.getTenantByStripeCustomerId(customerId);
            if (!tenant && tenantId) {
              tenant = await storage.getTenant(tenantId);
              if (tenant) {
                await storage.updateTenant(tenant.id, { stripeCustomerId: customerId });
              }
            }
            if (!tenant) {
              const customerName = session.customer_details?.name || "Subscriber";
              const storagePrefix = customerName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();
              tenant = await storage.createTenant({
                name: customerName,
                storagePrefix,
                tier: tierInfo?.tier || "personal",
                status: "active",
                stripeCustomerId: customerId,
              });
              console.log(`Auto-provisioned tenant space for new subscriber: ${tenant.name} (${tenant.id})`);
            }

            await storage.updateTenant(tenant.id, { tier: tierInfo?.tier || "personal" });

            await storage.upsertSubscription({
              tenantId: tenant.id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              tier: tierInfo?.tier || "personal",
              status: "active",
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            });

            console.log(`Subscription activated for tenant ${tenant.name}: ${tierInfo?.tier || "personal"}`);

            const checkoutEmail = session.customer_details?.email;
            const checkoutName = session.customer_details?.name;
            let custEmail = checkoutEmail || null;
            let custName = checkoutName || "Subscriber";

            if (!custEmail) {
              const resolved = await resolveCustomerEmail(customerId);
              custEmail = resolved.email;
              if (!custName || custName === "Subscriber") custName = resolved.name;
            }

            if (custEmail && checkoutEmail) {
              try {
                await stripe.customers.update(customerId, { email: checkoutEmail });
              } catch {}
            }

            if (custEmail) {
              const invoiceId = (session as any).invoice as string | undefined;
              let invoiceUrl: string | undefined;
              let receiptUrl: string | undefined;
              if (invoiceId) {
                try {
                  const inv = await stripe.invoices.retrieve(invoiceId);
                  invoiceUrl = inv.invoice_pdf || undefined;
                  receiptUrl = inv.hosted_invoice_url || undefined;
                } catch {}
              }

              const baseUrl = getBaseUrl(req);
              sendPurchaseConfirmation({
                customerName: custName,
                customerEmail: custEmail,
                tier: tierInfo?.tier || "personal",
                interval: tierInfo?.interval || "month",
                amount: subscription.items.data[0]?.price.unit_amount || 0,
                currency: subscription.currency || "usd",
                subscriptionId: subscription.id,
                invoiceUrl,
                receiptUrl,
                portalUrl: `${baseUrl}/pricing`,
                vaultUrl: baseUrl,
                periodStart: new Date((subscription as any).current_period_start * 1000),
                periodEnd: new Date((subscription as any).current_period_end * 1000),
              }).catch((err: any) => console.error("[Email] Purchase confirmation failed:", err.message));
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const priceId = subscription.items.data[0]?.price.id;
          const tierInfo = STRIPE_PRICE_MAP[priceId];

          const existing = await storage.getSubscriptionByCustomerId(
            subscription.customer as string
          );
          if (existing) {
            await storage.updateSubscription(existing.id, {
              tier: tierInfo?.tier || existing.tier as SubscriptionTier,
              status: subscription.status === "active" ? "active" : subscription.status as any,
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              stripeSubscriptionId: subscription.id,
            });

            if (existing.tenantId) {
              await storage.updateTenant(existing.tenantId, {
                tier: tierInfo?.tier || existing.tier as SubscriptionTier,
              });
            }

            const newTier = tierInfo?.tier || existing.tier as SubscriptionTier;
            if (newTier !== existing.tier) {
              const { email: updEmail, name: updName } = await resolveCustomerEmail(subscription.customer as string);
              if (updEmail) {
                const baseUrl = getBaseUrl(req);
                sendSubscriptionChangeNotification({
                  customerName: updName,
                  customerEmail: updEmail,
                  oldTier: existing.tier as SubscriptionTier,
                  newTier,
                  interval: tierInfo?.interval || "month",
                  amount: subscription.items.data[0]?.price.unit_amount || 0,
                  currency: subscription.currency || "usd",
                  portalUrl: `${baseUrl}/pricing`,
                  vaultUrl: baseUrl,
                  periodEnd: new Date((subscription as any).current_period_end * 1000),
                }).catch((err: any) => console.error("[Email] Subscription change email failed:", err.message));
              }
            }
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const existing = await storage.getSubscriptionByCustomerId(
            subscription.customer as string
          );
          if (existing) {
            await storage.updateSubscription(existing.id, {
              tier: "free",
              status: "canceled",
              cancelAtPeriodEnd: false,
              stripeSubscriptionId: null as any,
            });

            if (existing.tenantId) {
              await storage.updateTenant(existing.tenantId, { tier: "free" });
            }

            const { email: cancelEmail, name: cancelName } = await resolveCustomerEmail(subscription.customer as string);
            if (cancelEmail) {
              const baseUrl = getBaseUrl(req);
              sendCancellationNotification({
                customerName: cancelName,
                customerEmail: cancelEmail,
                tier: existing.tier as SubscriptionTier,
                portalUrl: `${baseUrl}/pricing`,
                vaultUrl: baseUrl,
              }).catch((err: any) => console.error("[Email] Cancellation email failed:", err.message));
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          if (invoice.customer) {
            const existing = await storage.getSubscriptionByCustomerId(
              invoice.customer as string
            );
            if (existing) {
              await storage.updateSubscription(existing.id, {
                status: "past_due",
              });

              const { email: failEmail, name: failName } = await resolveCustomerEmail(invoice.customer as string);
              if (failEmail) {
                const baseUrl = getBaseUrl(req);
                sendPaymentFailedNotification({
                  customerName: failName,
                  customerEmail: failEmail,
                  tier: existing.tier as SubscriptionTier,
                  amount: invoice.amount_due || 0,
                  currency: invoice.currency || "usd",
                  portalUrl: `${baseUrl}/pricing`,
                }).catch((err: any) => console.error("[Email] Payment failed email failed:", err.message));
              }
            }
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("Webhook processing error:", err.message);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });
}
