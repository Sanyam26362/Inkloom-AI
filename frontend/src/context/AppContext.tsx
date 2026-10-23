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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [activeBrandId, setActiveBrandId] = useState<number>(1);
  const [currentRole, setCurrentRole] = useState<UserRole>("REVIEWER");
  const [health, setHealth] = useState<HealthCheckResponse | null>(null);
  const [isLoadingBrands, setIsLoadingBrands] = useState<boolean>(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [theme, setThemeState] = useState<ThemeMode>("light");

  // Load and synchronize theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("inkloom_theme") as ThemeMode | null;
      if (saved === "dark" || saved === "light") {
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
        // If current activeBrandId is not in list, pick the first
        const found = data.find((b) => b.id === activeBrandId);
        if (!found) {
          setActiveBrandId(data[0].id);
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
              setActiveBrandId(data[0].id);
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
