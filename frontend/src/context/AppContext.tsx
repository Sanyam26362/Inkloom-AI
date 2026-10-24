"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BrandProfile, HealthCheckResponse, UserRole } from "@/lib/types";
import { api } from "@/lib/api";

export type ThemeMode = "light" | "dark";

interface AppContextType {
  brands: BrandProfile[];
  activeBrand: BrandProfile | null;
  activeBrandId: number;
  setActiveBrandId: (id: number) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  // Do not guess a brand id before the API has returned the seeded profiles.
  // IDs are database-generated, so the demo Blinkit brand is not guaranteed to be 1.
  const [activeBrandId, setActiveBrandId] = useState<number>(0);
  const [currentRole, setCurrentRole] = useState<UserRole>("REVIEWER");
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const [theme, setThemeState] = useState<ThemeMode>("light");

  // Synchronize document theme class and state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("inkloom_theme") as ThemeMode | null;
      if (saved === "dark" || saved === "light") {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setThemeState(saved);
        if (saved === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
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

  const fetchHealth = useCallback(async () => {
    try {
      const h = await api.getHealth();
      setHealth(h);
    } catch {
      // Backend may be starting or offline
      setHealth(null);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    setIsLoadingBrands(true);
    setBrandsError(null);
    try {
      const data = await api.listBrands({ userRole: currentRole });
      setBrands(data);
      if (data.length > 0) {
        // Keep Blinkit as the demo client when the seed contains multiple profiles.
        const found = data.find((b) => b.id === activeBrandId);
        if (!found) {
          const blinkit = data.find((b) => b.name.toLowerCase() === "blinkit");
          setActiveBrandId(blinkit?.id ?? data[0].id);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBrandsError(msg || "Failed to load brands from API.");
    } finally {
      setIsLoadingBrands(false);
    }
  }, [currentRole, activeBrandId]);

  useEffect(() => {
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
        const data = await api.listBrands({ userRole: currentRole });
        if (!ignore) {
          setBrands(data);
          if (data.length > 0) {
            const found = data.find((b) => b.id === activeBrandId);
            if (!found) {
              const blinkit = data.find((b) => b.name.toLowerCase() === "blinkit");
              setActiveBrandId(blinkit?.id ?? data[0].id);
            }
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
  }, [currentRole, activeBrandId]);

  const activeBrand = brands.find((b) => b.id === activeBrandId) || brands[0] || null;

  return (
    <AppContext.Provider
      value={{
        brands,
        activeBrand,
        activeBrandId,
        setActiveBrandId,
        currentRole,
        setCurrentRole,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppContextProvider");
  }
  return context;
}
