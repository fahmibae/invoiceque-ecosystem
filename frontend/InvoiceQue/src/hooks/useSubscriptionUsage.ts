"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  subscriptionApi,
  type PremiumFeature,
  type SubscriptionResource,
  type UsageData,
} from "@/lib/api";
import {
  getLimitReachedMessage,
  getLockedResources,
  isFeatureUnlocked,
  isResourceLocked as readResourceLocked,
} from "@/lib/subscription-limits";

export function useSubscriptionUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUsage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await subscriptionApi.getUsage();
      setUsage(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat penggunaan plan",
      );
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const lockedResources = useMemo(() => getLockedResources(usage), [usage]);

  useEffect(() => {
    if (!usage || lockedResources.length === 0 || typeof window === "undefined")
      return;

    const key = `invoicequ:upgrade-recommendation:${usage.plan_id || "current"}:${lockedResources.join(",")}`;
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "sent");
    subscriptionApi.sendUpgradeRecommendation().catch(() => {
      window.sessionStorage.removeItem(key);
    });
  }, [usage, lockedResources]);

  const isResourceLocked = useCallback(
    (resource: SubscriptionResource) => readResourceLocked(usage, resource),
    [usage],
  );

  const isFeatureLocked = useCallback(
    (feature: PremiumFeature) => !isFeatureUnlocked(usage, feature),
    [usage],
  );

  const limitMessage = useCallback(
    (resource: SubscriptionResource) => getLimitReachedMessage(usage, resource),
    [usage],
  );

  return {
    usage,
    loading,
    error,
    lockedResources,
    hasLockedResources: lockedResources.length > 0,
    isResourceLocked,
    isFeatureLocked,
    limitMessage,
    refresh: loadUsage,
  };
}
