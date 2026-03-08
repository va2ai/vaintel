import { addDoc, collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { lazyDb } from "./firebase.js";

const STRIPE_CHECKOUT_URLS = {
  pro: import.meta.env.VITE_STRIPE_CHECKOUT_PRO_URL || "",
  professional: import.meta.env.VITE_STRIPE_CHECKOUT_PROFESSIONAL_URL || "",
};

const STRIPE_PRICE_IDS = {
  pro: import.meta.env.VITE_STRIPE_PRICE_PRO_ID || "",
  professional: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ID || "",
};

function getAbsoluteUrl(pathname = "/pricing") {
  return new URL(pathname, window.location.origin).toString();
}

export function getStripeCheckoutUrl(plan) {
  return STRIPE_CHECKOUT_URLS[String(plan || "").toLowerCase()] || "";
}

export function getStripePriceId(plan) {
  return STRIPE_PRICE_IDS[String(plan || "").toLowerCase()] || "";
}

export function hasStripeCheckout(plan) {
  return Boolean(getStripePriceId(plan) || getStripeCheckoutUrl(plan));
}

export async function startStripeCheckout(user, plan, options = {}) {
  const normalizedPlan = String(plan || "").toLowerCase();
  const priceId = getStripePriceId(normalizedPlan);
  if (priceId) {
    if (!user?.uid) {
      throw new Error("Sign in before starting checkout.");
    }

    const successUrl = getAbsoluteUrl(options.successPath || "/pricing?checkout=success");
    const cancelUrl = getAbsoluteUrl(options.cancelPath || "/pricing?checkout=cancelled");
    const checkoutSessionsRef = collection(lazyDb(), "customers", user.uid, "checkout_sessions");
    const sessionRef = await addDoc(checkoutSessionsRef, {
      mode: "subscription",
      price: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        appPlan: normalizedPlan,
        firebaseUid: user.uid,
      },
    });

    await waitForCheckoutUrl(sessionRef);
    return true;
  }

  const url = getStripeCheckoutUrl(normalizedPlan);
  if (!url) return false;
  window.location.assign(url);
  return true;
}

function waitForCheckoutUrl(sessionRef) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Stripe checkout session did not initialize. Confirm the Firebase Stripe extension is installed."));
    }, 45000);

    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        const data = snapshot.data();
        if (!data) return;
        if (data.url) {
          window.clearTimeout(timeoutId);
          unsubscribe();
          window.location.assign(data.url);
          resolve(data.url);
          return;
        }
        if (data.error) {
          window.clearTimeout(timeoutId);
          unsubscribe();
          reject(new Error(data.error.message || "Stripe checkout failed to start."));
        }
      },
      (error) => {
        window.clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      }
    );
  });
}

export async function getSubscriptionSnapshot(uid) {
  if (!uid) return null;
  const snapshot = await getDoc(doc(lazyDb(), "subscriptions", String(uid)));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
