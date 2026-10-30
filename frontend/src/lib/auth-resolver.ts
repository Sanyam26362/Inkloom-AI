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
    // If creator has submitted profile/completed onboarding, route to Creator Studio
    if (user.onboarding_status === "COMPLETED" || user.creator_type) {
      return "/content";
    }
    return "/profile";
  }

  // Brand Manager / Reviewer / Brand Tenancy Lifecycle
  if (role === "REVIEWER" || role === "BRAND" || role === "MANAGER") {
    if (user.onboarding_status === "COMPLETED") {
      // Completed brand setup leads directly to Brand Guidelines Console
      return "/guidelines";
    }
    if (user.onboarding_status === "IN_PROGRESS" && user.onboarding_step) {
      return `/setup?step=${user.onboarding_step}`;
    }
    return "/setup?step=1";
  }

  // Admin / Judge Lifecycle
  if (role === "ADMIN" || role === "JUDGE") {
    return "/dashboard";
  }

  return "/dashboard";
}
