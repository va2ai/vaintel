const STRIPE_CHECKOUT_URLS = {
  pro: import.meta.env.VITE_STRIPE_CHECKOUT_PRO_URL || "",
  professional: import.meta.env.VITE_STRIPE_CHECKOUT_PROFESSIONAL_URL || "",
};

export function getStripeCheckoutUrl(plan) {
  return STRIPE_CHECKOUT_URLS[String(plan || "").toLowerCase()] || "";
}

export function hasStripeCheckout(plan) {
  return Boolean(getStripeCheckoutUrl(plan));
}

export function openStripeCheckout(plan) {
  const url = getStripeCheckoutUrl(plan);
  if (!url) return false;
  window.location.assign(url);
  return true;
}
