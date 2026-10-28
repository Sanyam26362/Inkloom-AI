"use client";

import { useUser } from "@clerk/nextjs";
import { SignUpModal } from "@/components/auth/SignUpModal";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { BrandProfile, HealthCheckResponse, UserRole, UserProfileResponse, Campaign } from "@/lib/types";
import { api } from "@/lib/api";

export type ThemeMode = "light" | "dark";

interface AppContextType {
  brands: BrandProfile[];
  activeBrand: BrandProfile | null;
  activeBrandId: number;
  setActiveBrandId: (id: number) => void;
  campaigns: Campaign[];
  activeCampaignId: number | null;
  setActiveCampaignId: (id: number | null) => void;
  refreshCampaigns: () => Promise<void>;
  user: UserProfileResponse | null;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  loginAsDemoUser: (role: UserRole) => Promise<void>;
  logout: () => void;
  health: HealthCheckResponse | null;
  isLoadingBrands: boolean;
  brandsError: string | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  refreshBrands: () => Promise<void>;
  refreshHealth: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  isAuthModalOpen: boolean;
  openAuthModal: (role?: UserRole) => void;
  closeAuthModal: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<number>(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<number | null>(null);
  const [currentRole, setCurrentRoleState] = useState<UserRole>("CREATOR");
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalRole, setAuthModalRole] = useState<UserRole | undefined>(undefined);

  const brandsRef = useRef<BrandProfile[]>([]);
  brandsRef.current = brands;
  const syncedClerkIdRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<boolean>(false);

  const openAuthModal = useCallback((role?: UserRole) => {
    setAuthModalRole(role);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Synchronize Clerk user identity with backend & local AppContext
  useEffect(() => {
    if (!isClerkLoaded || !clerkUser) return;
    if (syncedClerkIdRef.current === clerkUser.id) return;
    syncedClerkIdRef.current = clerkUser.id;

    const rawRole = (clerkUser.unsafeMetadata?.role as string) || (clerkUser.publicMetadata?.role as string) || "CREATOR";
    const mappedRole = (rawRole.toUpperCase() === "REVIEWER" || rawRole.toUpperCase() === "BRAND") ? "REVIEWER" : (rawRole.toUpperCase() === "ADMIN" ? "ADMIN" : "CREATOR") as UserRole;

    api.clerkSync({
      clerk_id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || `${clerkUser.id}@inkloom.user`,
      user_name: clerkUser.fullName || clerkUser.firstName || "Inkloom User",
      role: mappedRole,
    }).then(async (res) => {
      setUser(res.user);
      setCurrentRoleState(mappedRole);
      if (mappedRole === "CREATOR") {
        const brandList = brandsRef.current.length > 0 ? brandsRef.current : await api.listBrands().catch(() => []);
        const blinkit = brandList.find((b) => b.name.toLowerCase() === "blinkit");
        if (blinkit) {
          setActiveBrandId(blinkit.id);
        }
      }
    }).catch((err) => {
      console.warn("Clerk backend sync failed, using client session:", err);
    });
  }, [isClerkLoaded, clerkUser]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Synchronize document theme class and state on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("inkloom_theme") as ThemeMode | null;
      if (savedTheme === "dark") {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setThemeState("dark");
        document.documentElement.classList.add("dark");
      } else {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setThemeState("light");
        document.documentElement.classList.remove("dark");
      }

      const savedUserStr = localStorage.getItem("inkloom_user");
      if (savedUserStr) {
        const parsed = JSON.parse(savedUserStr);
        setUser(parsed);
        if (parsed.role) {
          setCurrentRoleState(parsed.role as UserRole);
        }
      }
    } catch {
      // localStorage may fail in restricted browser envs
    }
  }, []);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t);
    try {
      localStorage.setItem("inkloom_theme", t);
    } catch {}
    if (t === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const loginAsDemoUser = useCallback(async (role: UserRole) => {
    try {
      const res = await api.login({ role });
      setUser(res.user);
      setCurrentRoleState(role);
      if (role === "CREATOR") {
        const brandList = brandsRef.current.length > 0 ? brandsRef.current : await api.listBrands().catch(() => []);
        const blinkit = brandList.find((b) => b.name.toLowerCase() === "blinkit");
        if (blinkit) {
          setActiveBrandId(blinkit.id);
        }
      }
    } catch (err) {
      console.error("Failed to login as demo user:", err);
    }
  }, []);

  const setCurrentRole = useCallback((role: UserRole) => {
    setCurrentRoleState(role);
    loginAsDemoUser(role);
  }, [loginAsDemoUser]);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    if (!activeBrandId) return;
    try {
      const list = await api.listCampaigns(activeBrandId);
      setCampaigns(list);
      if (list.length > 0) {
        setActiveCampaignId((prev) => {
          if (prev && list.some((c) => c.id === prev)) return prev;
          const active = list.find((c) => c.is_active);
          return active ? active.id : list[0].id;
        });
      }
    } catch {
      setCampaigns([]);
    }
  }, [activeBrandId]);

  const fetchBrands = useCallback(async () => {
    setIsLoadingBrands(true);
    setBrandsError(null);
    try {
      // Ensure we have a valid token if not already present
      if (typeof window !== "undefined" && !localStorage.getItem("inkloom_token")) {
        await loginAsDemoUser(currentRole);
      }
      const data = await api.listBrands();
      setBrands(data);
      brandsRef.current = data;
      if (data.length > 0) {
        setActiveBrandId((prev) => {
          if (prev > 0 && data.some((b) => b.id === prev)) {
            return prev;
          }
          const blinkit = data.find((b) => b.name.toLowerCase() === "blinkit");
          return blinkit?.id ?? data[0].id;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBrandsError(msg || "Failed to load brands from API.");
    } finally {
      setIsLoadingBrands(false);
    }
  }, [currentRole, loginAsDemoUser]);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    let ignore = false;
    async function init() {
      try {
        const h = await api.getHealth();
        if (!ignore) setHealth(h);
      } catch {
        if (!ignore) setHealth(null);
      }

      try {
        setIsLoadingBrands(true);
        setBrandsError(null);
        if (typeof window !== "undefined" && !localStorage.getItem("inkloom_token")) {
          await loginAsDemoUser(currentRole);
        }
        const data = await api.listBrands();
        if (!ignore) {
          setBrands(data);
          brandsRef.current = data;
          if (data.length > 0) {
            setActiveBrandId((prev) => {
              if (prev > 0 && data.some((b) => b.id === prev)) {
                return prev;
              }
              const blinkit = data.find((b) => b.name.toLowerCase() === "blinkit");
              return blinkit?.id ?? data[0].id;
            });
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : String(err);
          setBrandsError(msg || "Failed to load brands from API.");
        }
      } finally {
        if (!ignore) {
          setIsLoadingBrands(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [currentRole, loginAsDemoUser]);

  useEffect(() => {
    if (activeBrandId) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      fetchCampaigns();
    }
  }, [activeBrandId, fetchCampaigns]);

  const activeBrand = brands.find((b) => b.id === activeBrandId) || brands[0] || null;

  return (
    <AppContext.Provider
      value={{
        brands,
        activeBrand,
        activeBrandId,
        setActiveBrandId,
        campaigns,
        activeCampaignId,
        setActiveCampaignId,
        refreshCampaigns: fetchCampaigns,
        user,
        currentRole,
        setCurrentRole,
        loginAsDemoUser,
        logout,
        health,
        isLoadingBrands,
        brandsError,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        theme,
        setTheme,
        toggleTheme,
        refreshBrands: fetchBrands,
        refreshHealth: fetchHealth,
        refreshKey,
        triggerRefresh,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebar,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
      <SignUpModal isOpen={isAuthModalOpen} onClose={closeAuthModal} initialRole={authModalRole} />
    </AppContext.Provider>
  );
}

export const useAppContext = useApp;
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppContextProvider");
  }
  return context;
}
