import crypto from "crypto";
import { db } from "./db";
import {
  pinAuth,
  affiliateReferrals,
  affiliateCommissions,
  AFFILIATE_TIER_CONFIG,
  type AffiliateTier,
} from "@shared/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { createTrustStamp } from "./hallmark";

export function generateUniqueHash(): string {
  return crypto.randomBytes(12).toString("hex");
}

export function getCrossPlatformLinks(hash: string): Record<string, string> {
  return {
    "Trust Layer Hub": `https://trusthub.tlid.io/ref/${hash}`,
    "Trust Layer (L1)": `https://dwtl.io/ref/${hash}`,
    "TrustHome": `https://trusthome.tlid.io/ref/${hash}`,
    "TrustVault": `https://trustvault.tlid.io/ref/${hash}`,
    "TLID.io": `https://tlid.io/ref/${hash}`,
    "THE VOID": `https://thevoid.tlid.io/ref/${hash}`,
    "Signal Chat": `https://signalchat.tlid.io/ref/${hash}`,
    "DarkWave Studio": `https://darkwavestudio.tlid.io/ref/${hash}`,
    "Guardian Shield": `https://guardianshield.tlid.io/ref/${hash}`,
    "Guardian Scanner": `https://guardianscanner.tlid.io/ref/${hash}`,
    "Guardian Screener": `https://guardianscreener.tlid.io/ref/${hash}`,
    "TradeWorks AI": `https://tradeworks.tlid.io/ref/${hash}`,
    "StrikeAgent": `https://strikeagent.tlid.io/ref/${hash}`,
    "Pulse": `https://pulse.tlid.io/ref/${hash}`,
    "Chronicles": `https://chronicles.tlid.io/ref/${hash}`,
    "The Arcade": `https://thearcade.tlid.io/ref/${hash}`,
    "Bomber": `https://bomber.tlid.io/ref/${hash}`,
    "Trust Golf": `https://trustgolf.tlid.io/ref/${hash}`,
    "ORBIT Staffing OS": `https://orbit.tlid.io/ref/${hash}`,
    "Orby Commander": `https://orby.tlid.io/ref/${hash}`,
    "GarageBot": `https://garagebot.tlid.io/ref/${hash}`,
    "Lot Ops Pro": `https://lotops.tlid.io/ref/${hash}`,
    "TORQUE": `https://torque.tlid.io/ref/${hash}`,
    "TL Driver Connect": `https://driverconnect.tlid.io/ref/${hash}`,
    "VedaSolus": `https://vedasolus.tlid.io/ref/${hash}`,
    "Verdara": `https://verdara.tlid.io/ref/${hash}`,
    "Arbora": `https://arbora.tlid.io/ref/${hash}`,
    "PaintPros": `https://paintpros.tlid.io/ref/${hash}`,
    "Nashville Painting Professionals": `https://nashvillepainting.tlid.io/ref/${hash}`,
    "Trust Book": `https://trustbook.tlid.io/ref/${hash}`,
    "DarkWave Academy": `https://darkwaveacademy.tlid.io/ref/${hash}`,
    "Happy Eats": `https://happyeats.tlid.io/ref/${hash}`,
    "Brew & Board Coffee": `https://brewandboard.tlid.io/ref/${hash}`,
    "TrustGen": `https://trustgen.tlid.io/ref/${hash}`,
  };
}

export function getAffiliateTier(convertedCount: number): { tier: AffiliateTier; rate: number; label: string } {
  const tiers: AffiliateTier[] = ["diamond", "platinum", "gold", "silver", "base"];
  for (const tier of tiers) {
    if (convertedCount >= AFFILIATE_TIER_CONFIG[tier].minReferrals) {
      return { tier, ...AFFILIATE_TIER_CONFIG[tier] };
    }
  }
  return { tier: "base", ...AFFILIATE_TIER_CONFIG.base };
}

export async function ensureUniqueHash(pinAuthId: number): Promise<string> {
  const [user] = await db
    .select({ uniqueHash: pinAuth.uniqueHash })
    .from(pinAuth)
    .where(eq(pinAuth.id, pinAuthId))
    .limit(1);

  if (user?.uniqueHash) return user.uniqueHash;

  const hash = generateUniqueHash();
  await db
    .update(pinAuth)
    .set({ uniqueHash: hash })
    .where(eq(pinAuth.id, pinAuthId));

  return hash;
}

export async function backfillUniqueHashes(): Promise<void> {
  const usersWithoutHash = await db
    .select({ id: pinAuth.id })
    .from(pinAuth)
    .where(isNull(pinAuth.uniqueHash));

  for (const user of usersWithoutHash) {
    const hash = generateUniqueHash();
    await db
      .update(pinAuth)
      .set({ uniqueHash: hash })
      .where(eq(pinAuth.id, user.id));
  }

  if (usersWithoutHash.length > 0) {
    console.log(`[Affiliate] Backfilled uniqueHash for ${usersWithoutHash.length} users`);
  }
}

export async function trackReferral(referralHash: string, platform: string = "trustvault") {
  const [referrer] = await db
    .select({ id: pinAuth.id })
    .from(pinAuth)
    .where(eq(pinAuth.uniqueHash, referralHash))
    .limit(1);

  if (!referrer) return null;

  const recentDuplicates = await db
    .select({ id: affiliateReferrals.id })
    .from(affiliateReferrals)
    .where(
      and(
        eq(affiliateReferrals.referralHash, referralHash),
        eq(affiliateReferrals.platform, platform),
        eq(affiliateReferrals.status, "pending"),
        sql`${affiliateReferrals.createdAt} > NOW() - INTERVAL '1 hour'`
      )
    )
    .limit(1);

  if (recentDuplicates.length > 0) {
    return recentDuplicates[0];
  }

  const [referral] = await db
    .insert(affiliateReferrals)
    .values({
      referrerId: referrer.id,
      referralHash,
      platform,
      status: "pending",
    })
    .returning();

  return referral;
}

export async function convertReferral(referredUserId: number, referralHash: string) {
  const [referral] = await db
    .select()
    .from(affiliateReferrals)
    .where(
      and(
        eq(affiliateReferrals.referralHash, referralHash),
        eq(affiliateReferrals.status, "pending")
      )
    )
    .limit(1);

  if (!referral) return null;

  const [updated] = await db
    .update(affiliateReferrals)
    .set({
      referredUserId,
      status: "converted",
      convertedAt: new Date(),
    })
    .where(eq(affiliateReferrals.id, referral.id))
    .returning();

  try {
    await createTrustStamp({
      userId: referral.referrerId,
      category: "affiliate-referral-converted",
      data: {
        referralId: referral.id,
        referredUserId,
        platform: referral.platform,
      },
    });
  } catch {}

  return updated;
}

export async function createCommission(
  referrerId: number,
  referralId: number,
  transactionAmount: number,
  convertedCount: number
) {
  const { tier, rate } = getAffiliateTier(convertedCount);
  const commissionAmount = (transactionAmount * rate).toFixed(2);

  const [commission] = await db
    .insert(affiliateCommissions)
    .values({
      referrerId,
      referralId,
      amount: commissionAmount,
      currency: "SIG",
      tier,
      status: "pending",
    })
    .returning();

  return commission;
}

export async function getAffiliateDashboard(pinAuthId: number) {
  const hash = await ensureUniqueHash(pinAuthId);

  const allReferrals = await db
    .select()
    .from(affiliateReferrals)
    .where(eq(affiliateReferrals.referrerId, pinAuthId));

  const convertedCount = allReferrals.filter((r) => r.status === "converted").length;
  const tierInfo = getAffiliateTier(convertedCount);

  const commissions = await db
    .select()
    .from(affiliateCommissions)
    .where(eq(affiliateCommissions.referrerId, pinAuthId));

  const pendingEarnings = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  const paidEarnings = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + parseFloat(c.amount), 0);

  return {
    uniqueHash: hash,
    referralLink: `https://trustvault.tlid.io/ref/${hash}`,
    crossPlatformLinks: getCrossPlatformLinks(hash),
    tier: tierInfo.tier,
    tierLabel: tierInfo.label,
    commissionRate: tierInfo.rate,
    totalReferrals: allReferrals.length,
    convertedReferrals: convertedCount,
    pendingEarnings: pendingEarnings.toFixed(2),
    paidEarnings: paidEarnings.toFixed(2),
    referrals: allReferrals.slice(0, 20),
    commissions: commissions.slice(0, 20),
  };
}

export async function requestPayout(pinAuthId: number) {
  const pendingCommissions = await db
    .select()
    .from(affiliateCommissions)
    .where(
      and(
        eq(affiliateCommissions.referrerId, pinAuthId),
        eq(affiliateCommissions.status, "pending")
      )
    );

  const totalPending = pendingCommissions.reduce((sum, c) => sum + parseFloat(c.amount), 0);

  if (totalPending < 10) {
    return { success: false, error: "Minimum payout is 10 SIG" };
  }

  for (const commission of pendingCommissions) {
    await db
      .update(affiliateCommissions)
      .set({ status: "processing" })
      .where(eq(affiliateCommissions.id, commission.id));
  }

  try {
    await createTrustStamp({
      userId: pinAuthId,
      category: "affiliate-payout-request",
      data: {
        amount: totalPending.toFixed(2),
        currency: "SIG",
        commissionsCount: pendingCommissions.length,
      },
    });
  } catch {}

  return {
    success: true,
    amount: totalPending.toFixed(2),
    commissionsProcessed: pendingCommissions.length,
  };
}
