export type PlanId = 'free' | 'growth' | 'pro' | 'enterprise';

export interface PlanFeatures {
  staff_links: number;
  broadcasts: boolean;
  double_stamps: boolean;
  analytics: boolean;
  api_access: boolean;
  multi_location?: boolean;
  dedicated_support?: boolean;
}

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: { staff_links: 1, broadcasts: false, double_stamps: false, analytics: false, api_access: false },
  growth: { staff_links: 999, broadcasts: true, double_stamps: true, analytics: false, api_access: false },
  pro: { staff_links: 999, broadcasts: true, double_stamps: true, analytics: true, api_access: true },
  enterprise: { staff_links: 999, broadcasts: true, double_stamps: true, analytics: true, api_access: true, multi_location: true, dedicated_support: true },
};

export const PLAN_LIMITS: Record<PlanId, { members: number | null }> = {
  free: { members: 50 },
  growth: { members: 500 },
  pro: { members: null },
  enterprise: { members: null },
};

export function canUseBroadcasts(planId: PlanId, isPilot: boolean): boolean {
  if (isPilot) return true;
  return PLAN_FEATURES[planId]?.broadcasts ?? false;
}

export function canUseDoubleStamps(planId: PlanId, isPilot: boolean): boolean {
  if (isPilot) return true;
  return PLAN_FEATURES[planId]?.double_stamps ?? false;
}

export function getMemberLimit(planId: PlanId, isPilot: boolean): number | null {
  if (isPilot) return null; // unlimited for pilots
  return PLAN_LIMITS[planId]?.members ?? 50;
}

export function isAtMemberLimit(planId: PlanId, isPilot: boolean, currentMembers: number): boolean {
  const limit = getMemberLimit(planId, isPilot);
  if (limit === null) return false;
  return currentMembers >= limit;
}
