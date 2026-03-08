import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

initializeApp();

const db = getFirestore();
const auth = getAuth();

const ACCESS_GRANTING_STATUSES = new Set(["active", "trialing", "past_due"]);
const ACTIVE_PRIORITY = {
  active: 4,
  trialing: 3,
  past_due: 2,
  incomplete: 1,
  unpaid: 1,
  canceled: 0,
  incomplete_expired: 0,
  paused: 0,
};

function parseCsv(value) {
  return new Set(
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

const PRICE_PLAN_MAP = {
  pro: parseCsv(process.env.STRIPE_PLAN_PRO_PRICE_IDS),
  professional: parseCsv(process.env.STRIPE_PLAN_PROFESSIONAL_PRICE_IDS),
};

function readByPath(value, path) {
  return path.reduce((current, part) => {
    if (current == null) return undefined;
    return current[part];
  }, value);
}

function collectValues(value, bucket = []) {
  if (value == null) return bucket;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    bucket.push(String(value));
    return bucket;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectValues(item, bucket);
    return bucket;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) collectValues(item, bucket);
  }
  return bucket;
}

function normalizeIsoDate(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const millis = value > 1e12 ? value : value * 1000;
    return new Date(millis).toISOString();
  }
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (typeof value?._seconds === "number") {
    return new Date(value._seconds * 1000).toISOString();
  }
  return null;
}

function scoreSubscription(data) {
  const status = String(data?.status || "").toLowerCase();
  const periodEnd = normalizeIsoDate(
    data?.current_period_end
      ?? data?.currentPeriodEnd
      ?? data?.current_period_end_at
      ?? data?.period_end
  );
  return {
    statusPriority: ACTIVE_PRIORITY[status] ?? -1,
    periodEndScore: periodEnd ? Date.parse(periodEnd) || 0 : 0,
    createdScore: Number(data?.created ?? data?.createdAt?._seconds ?? 0),
  };
}

function pickCanonicalSubscription(documents) {
  if (!documents.length) return null;
  return [...documents].sort((left, right) => {
    const a = scoreSubscription(left);
    const b = scoreSubscription(right);
    if (b.statusPriority !== a.statusPriority) return b.statusPriority - a.statusPriority;
    if (b.periodEndScore !== a.periodEndScore) return b.periodEndScore - a.periodEndScore;
    return b.createdScore - a.createdScore;
  })[0];
}

function inferPlan(data) {
  const metadata = data?.metadata || {};
  const directHints = [
    data?.plan,
    data?.tier,
    data?.role,
    metadata.plan,
    metadata.tier,
    metadata.role,
    metadata.appPlan,
    metadata.app_plan,
    metadata.subscriptionPlan,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  for (const hint of directHints) {
    if (hint.includes("professional")) return "professional";
    if (hint === "pro" || hint.includes(" pro")) return "pro";
    if (hint === "free") return "free";
  }

  const priceIdCandidates = [
    data?.price?.id,
    data?.price?.priceId,
    data?.price_id,
    data?.stripePriceId,
    data?.items?.[0]?.price?.id,
    ...collectValues(data?.items?.map((item) => item?.price?.id)),
  ]
    .filter(Boolean)
    .map((value) => String(value));

  for (const plan of ["professional", "pro"]) {
    if (priceIdCandidates.some((candidate) => PRICE_PLAN_MAP[plan].has(candidate))) {
      return plan;
    }
  }

  const textualHints = collectValues({
    price: data?.price,
    items: data?.items,
    prices: data?.prices,
    metadata,
    product: data?.product,
  }).map((value) => String(value).toLowerCase());

  if (textualHints.some((value) => value.includes("professional"))) return "professional";
  if (textualHints.some((value) => /\bpro\b/.test(value))) return "pro";
  return "free";
}

async function lookupEmail(uid, customerDoc) {
  const customerEmail = customerDoc?.email || customerDoc?.billing_email || customerDoc?.stripeEmail || null;
  if (customerEmail) return customerEmail;
  try {
    const user = await auth.getUser(uid);
    return user.email || null;
  } catch (error) {
    logger.warn("Unable to look up Firebase Auth user for Stripe sync", { uid, error: error.message });
    return null;
  }
}

function buildFreeMirror(uid, email, customerDoc) {
  return {
    uid,
    email,
    plan: "free",
    status: "inactive",
    stripeCustomerId: customerDoc?.stripeId || customerDoc?.customer_id || null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    source: "firebase-stripe-extension",
    extensionPath: `customers/${uid}`,
    syncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function buildMirrorDoc(uid, email, customerDoc, subscriptionId, data) {
  const status = String(data?.status || "inactive").toLowerCase();
  const inferredPlan = inferPlan(data);
  const grantsAccess = ACCESS_GRANTING_STATUSES.has(status);
  const plan = grantsAccess ? inferredPlan : "free";

  return {
    uid,
    email,
    plan,
    source: "firebase-stripe-extension",
    status,
    stripeCustomerId: customerDoc?.stripeId || customerDoc?.customer_id || null,
    stripeSubscriptionId: data?.id || subscriptionId,
    stripePriceId:
      data?.price?.id
      ?? data?.price_id
      ?? data?.items?.[0]?.price?.id
      ?? null,
    stripeProductId:
      data?.price?.product
      ?? data?.product
      ?? data?.items?.[0]?.price?.product
      ?? null,
    currentPeriodEnd: normalizeIsoDate(
      data?.current_period_end
      ?? data?.currentPeriodEnd
      ?? data?.current_period_end_at
      ?? data?.period_end
    ),
    cancelAtPeriodEnd: Boolean(data?.cancel_at_period_end ?? data?.cancelAtPeriodEnd),
    extensionPath: `customers/${uid}/subscriptions/${subscriptionId}`,
    syncedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export const syncStripeSubscriptionMirror = onDocumentWritten(
  {
    document: "customers/{uid}/subscriptions/{subscriptionId}",
    region: "us-central1",
    retry: false,
  },
  async (event) => {
    const { uid } = event.params;
    const customerRef = db.collection("customers").doc(uid);
    const subscriptionsRef = customerRef.collection("subscriptions");
    const mirrorRef = db.collection("subscriptions").doc(uid);

    const [customerSnap, subscriptionsSnap] = await Promise.all([
      customerRef.get(),
      subscriptionsRef.get(),
    ]);

    const customerDoc = customerSnap.exists ? customerSnap.data() : {};
    const allSubscriptions = subscriptionsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const canonical = pickCanonicalSubscription(allSubscriptions);
    const email = await lookupEmail(uid, customerDoc);

    if (!canonical) {
      await mirrorRef.set(buildFreeMirror(uid, email, customerDoc), { merge: true });
      logger.info("Synced free subscription mirror after Stripe subscription removal", { uid });
      return;
    }

    await mirrorRef.set(
      buildMirrorDoc(uid, email, customerDoc, canonical.id, canonical),
      { merge: true }
    );

    logger.info("Synced Stripe subscription mirror", {
      uid,
      plan: inferPlan(canonical),
      status: canonical.status || "unknown",
      subscriptionId: canonical.id,
    });
  }
);
