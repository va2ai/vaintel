import { useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { lazyAuth, lazyGoogleProvider } from "./firebase.js";
import { getSubscription, getUsageMeter, incrementUsageMeter } from "./firestore.js";
import { getUsageState } from "./product-catalog.js";

function normalizePlan(subscription) {
  if (!subscription?.plan) return "free";
  return String(subscription.plan).toLowerCase();
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export function useAccess(toolSlug = null) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usageMeter, setUsageMeter] = useState(null);
  const [loading, setLoading] = useState(true);
  const monthKey = getMonthKey();

  useEffect(() => {
    return onAuthStateChanged(lazyAuth(), async (nextUser) => {
      setUser(nextUser || null);

      if (!nextUser) {
        setSubscription(null);
        setUsageMeter(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [nextSubscription, nextUsageMeter] = await Promise.all([
          getSubscription(nextUser.uid),
          getUsageMeter(nextUser.uid, monthKey),
        ]);
        setSubscription(nextSubscription);
        setUsageMeter(nextUsageMeter);
      } catch (error) {
        console.warn("Failed to load access state", error);
        setSubscription(null);
        setUsageMeter(null);
      } finally {
        setLoading(false);
      }
    });
  }, [monthKey]);

  const signIn = useCallback(() => signInWithPopup(lazyAuth(), lazyGoogleProvider()), []);
  const signOutUser = useCallback(() => signOut(lazyAuth()), []);

  const plan = normalizePlan(subscription);
  const used = toolSlug ? Number(usageMeter?.tools?.[toolSlug] || 0) : 0;
  const toolAccess = useMemo(
    () => (toolSlug ? getUsageState(toolSlug, plan, used) : null),
    [toolSlug, plan, used]
  );

  const consumeUsage = useCallback(async (meta = {}) => {
    if (!user || !toolSlug) throw new Error("Sign in before using this tool.");
    await incrementUsageMeter(user.uid, monthKey, toolSlug, meta);
    setUsageMeter((current) => ({
      ...(current || {}),
      monthKey,
      uid: user.uid,
      tools: {
        ...(current?.tools || {}),
        [toolSlug]: Number(current?.tools?.[toolSlug] || 0) + 1,
      },
    }));
  }, [monthKey, toolSlug, user]);

  return {
    user,
    loading,
    plan,
    subscription,
    usageMeter,
    toolAccess,
    signIn,
    signOutUser,
    consumeUsage,
  };
}
