import { UserProfileResponse } from "./types";

/**
 * Authoritative client-side routing resolver.
 * Evaluates user role and onboarding status to determine the next destination.
 */
export function resolvePostAuthRedirect(user: UserProfileResponse | null | undefined): string {
  if (!user) return "/dashboard";

  const role = (user.role || "").toUpperCase();

  // Content Creator Lifecycle
  if (role === "CREATOR") {
    // If creator hasn't submitted their organization/agency profile, send to profile setup
    if (user.onboarding_status === "COMPLETED" || user.creator_type) {
      return "/content";
    }
    return "/profile";
  }

  // Brand Manager / Reviewer / Admin Lifecycle
  if (role === "REVIEWER" || role === "ADMIN" || role === "BRAND" || role === "JUDGE") {
    if (user.onboarding_status === "COMPLETED") {
      return "/dashboard";
    }
    if (user.onboarding_status === "IN_PROGRESS" && user.onboarding_step) {
      return `/setup?step=${user.onboarding_step}`;
    }
    return "/setup?step=1";
  }

  return "/dashboard";
}

