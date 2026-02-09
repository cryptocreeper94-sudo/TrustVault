import { type Express, type Request, type Response, type NextFunction } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { TIER_PRICING, type SubscriptionTier } from "@shared/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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
  }

  console.log("Stripe products and prices initialized");
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

  app.get("/api/subscription", isAuthenticated, async (_req, res) => {
    try {
      const sub = await storage.getSubscription();
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

      if (!tier || !["personal", "pro", "studio"].includes(tier)) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      if (!interval || !["month", "year"].includes(interval)) {
        return res.status(400).json({ message: "Invalid interval" });
      }

      let sub = await storage.getSubscription();
      let customerId: string;

      if (sub?.stripeCustomerId) {
        customerId = sub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          metadata: { app: "dw-media-studio" },
        });
        customerId = customer.id;
        await storage.upsertSubscription({
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

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceEntry[0], quantity: 1 }],
        success_url: `${baseUrl}/pricing?success=true`,
        cancel_url: `${baseUrl}/pricing?canceled=true`,
        metadata: { tier, interval },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err.message);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req, res) => {
    try {
      const sub = await storage.getSubscription();
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

            await storage.upsertSubscription({
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: subscription.id,
              tier: tierInfo?.tier || "personal",
              status: "active",
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            });
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
