import { UserProfileResponse } from "./types";

/**
 * Authoritative client-side routing resolver.
 * Evaluates user role and onboarding status to determine the next destination.
 */
export function resolvePostAuthRedirect(user: UserProfileResponse | null | undefined): string {
  let role = (user?.role || "").toUpperCase();
  let isSignupRole = false;
  if (typeof window !== "undefined") {
    try {
      const signupRole = localStorage.getItem("inkloom_signup_role");
      if (signupRole) {
        role = signupRole.toUpperCase();
        isSignupRole = true;
      } else {
        const saved = localStorage.getItem("inkloom_role");
        if (saved && !role) role = saved.toUpperCase();
      }
    } catch {}
  }

  // Brand Manager / Reviewer / Brand Tenancy Lifecycle
  if (role === "REVIEWER" || role === "BRAND" || role === "MANAGER") {
    if (isSignupRole) {
      return "/setup?step=1";
    }
    if (user?.onboarding_status === "COMPLETED") {
      return "/guidelines";
    }
    if (user?.onboarding_status === "IN_PROGRESS" && user?.onboarding_step) {
      return `/setup?step=${user.onboarding_step}`;
    }
    return "/setup?step=1";
  }

  // Content Creator Lifecycle
  if (role === "CREATOR") {
    if (user?.onboarding_status === "COMPLETED" || user?.creator_type) {
      return "/content";
    }
    return "/profile";
  }

  // Admin / Judge Lifecycle
  if (role === "ADMIN" || role === "JUDGE") {
    return "/dashboard";
  }

  return "/dashboard";
}
