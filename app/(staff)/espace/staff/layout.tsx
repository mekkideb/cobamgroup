"use client";

import {
  ForwardRefExoticComponent,
  ReactNode,
  RefAttributes,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronDown,
  FileText,
  ImageIcon,
  ListTree,
  LockKeyhole,
  Logs,
  LucideProps,
  Package,
  Shield,
  User,
  Users,
} from "lucide-react";
import BannedAccountNoticeDialog from "@/components/staff/ui/BannedAccountNoticeDialog";
import "./globals.css";
import {
  StaffSessionProvider,
  useStaffSessionContext,
} from "@/features/auth/client/staff-session-provider";
import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import { cn } from "@/lib/utils";
import { canAccessPersonalDetails, canAccessSecuritySettings } from "@/features/account/access";
import { canAccessArticleCategories } from "@/features/article-categories/access";
import { canAccessArticles } from "@/features/articles/access";
import { canAccessBrands } from "@/features/brands/access";
import { canAccessMediaLibrary } from "@/features/media/access";
import { canAccessProductCategories } from "@/features/product-categories/access";
import { canAccessProducts } from "@/features/products/access";
import { canAccessRoles } from "@/features/roles/access";
import { canAccessUsers } from "@/features/users/access";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";

function SidebarLink({
  icon,
  label,
  href = "#",
  prefetch = false,
  selected = false,
}: {
  icon: ReactNode;
  label: string;
  href?: string;
  prefetch?: boolean;
  selected?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        // Mobile: compact, icon-only; sm+: normal pill
        "group inline-flex items-center justify-center md:justify-start gap-2 rounded-full",
        "px-2 py-2 md:px-3 w-full",
        "text-xs font-medium text-slate-600 transition-colors",
        "hover:bg-slate-100",
      )}
    >
      <span
        className={cn(
          "text-slate-400 group-hover:text-cobam-water-blue/90",
          selected ? "text-cobam-water-blue/90" : "",
        )}
      >
        {icon}
      </span>
      <p
        className={cn(
          // Hide label on mobile, show from sm+
          "hidden md:inline text-slate-500 group-hover:text-cobam-water-blue",
          selected ? "text-cobam-water-blue font-semibold" : "",
        )}
      >
        {label}
      </p>
    </Link>
  );
}

export type StaffTabGroup = {
  key: string;
  label: string;
  tabs: Record<string, StaffTab>;
};

export type StaffTab = {
  key: string;
  label: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
};

const STAFF_TABS: Record<string, StaffTabGroup> = {
  accueil: {
    key: "accueil",
    label: "Accueil",
    tabs: {
      "tableau-de-bord": {
        key: "tableau-de-bord",
        label: "Tableau de bord",
        icon: User,
      },
    },
  },
  compte: {
    key: "compte",
    label: "Mon compte",
    tabs: {
      details: {
        key: "details",
        label: "Détails personnels",
        icon: User,
      },
      securite: {
        key: "securite",
        label: "Sécurité",
        icon: LockKeyhole,
      },
    },
  },
  "gestion-des-articles": {
    key: "gestion-des-articles",
    label: "Gestion des articles",
    tabs: {
      articles: {
        key: "articles",
        label: "Articles",
        icon: FileText,
      },
      "categories-articles": {
        key: "categories-articles",
        label: "Catégories d'articles",
        icon: ListTree,
      },
    }
  },
  "gestion-des-produits": {
    key: "gestions-des-produits",
    label: "Gestion des produits",
    tabs: {
      produits: {
        key: "produits",
        label: "Produits",
        icon: Package,
      },
      "categories-produits": {
          key: "categories-produits",
          label: "Catégories produits",
          icon: ListTree,
        },
      marques: {
        key: "marques",
        label: "Marques",
        icon: BadgeCheck,
      },
    }
  },
  autres: {
    key: "autres",
    label: "Autres",
    tabs: {
      medias: {
        key: "medias",
        label: "Médias",
        icon: ImageIcon,
      },
    }
  },
  "administration": {
    key: "administration",
    label: "Administration",
    tabs: {
      membres: {
        key: "membres",
        label: "Membres",
        icon: Users,
      },
      roles: {
        key: "roles",
        label: "Rôles",
        icon: Shield,
      },
      audit: {
        key: "audit",
        label: "Audit",
        icon: Logs,
      },
    },
  },
};

const STAFF_NAV_COLLAPSE_STORAGE_KEY = "staff-nav-collapsed-groups";

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <StaffSessionProvider>
      <StaffLayoutShell>{children}</StaffLayoutShell>
    </StaffSessionProvider>
  );
}

function StaffLayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearSession } = useStaffSessionContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isBanNoticeOpen, setIsBanNoticeOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [hasHydratedCollapseState, setHasHydratedCollapseState] = useState(false);

  const canAccessFlagMap: Record<string, Record<string, boolean>> = useMemo(
    () => ({
      accueil: {
        "tableau-de-bord": user?.status !== "BANNED",
      },
      compte: {
        details: user ? canAccessPersonalDetails(user) : false,
        securite: user ? canAccessSecuritySettings(user) : false,
      },
      "gestion-des-articles": {
        articles: user ? canAccessArticles(user) : false,
        "categories-articles": user ? canAccessArticleCategories(user) : false,
      },
      "gestion-des-produits": {
        marques: user ? canAccessBrands(user) : false,
        produits: user ? canAccessProducts(user) : false,
        "categories-produits": user
          ? canAccessProductCategories(user)
          : false,
      },
      autres: {
        medias: user ? canAccessMediaLibrary(user) : false,
      },
      "administration": {
        audit: false,
        roles: user ? canAccessRoles(user) : false,
        membres: user ? canAccessUsers(user) : false,
      },
    }),
    [user],
  );

  const canAccessViewMap: Record<string, StaffTabGroup> = useMemo(() => {
    const res: Record<string, StaffTabGroup> = {};
    for (const groupKey in STAFF_TABS) {
      const cur: StaffTabGroup = {
        key: groupKey,
        label: STAFF_TABS[groupKey].label,
        tabs: {},
      };
      let hasAtLeastOne = false;
      for (const tabKey in STAFF_TABS[groupKey].tabs) {
        if (canAccessFlagMap[groupKey][tabKey]) {
          cur.tabs[tabKey] = STAFF_TABS[groupKey].tabs[tabKey];
          hasAtLeastOne = true;
        }
      }
      if (hasAtLeastOne) res[groupKey] = cur;
    }
    return res;
  }, [canAccessFlagMap]);

  const displayEmail = user?.email || "Connexion...";
  const displayRole = user?.roleLabel || "-";
  const isBanned = user?.status === "BANNED";
  const isAccountSelfPath =
    pathname === "/espace/staff/compte/details" ||
    pathname === "/espace/staff/compte/securite";
  const banNoticeStorageKey = useMemo(() => {
    if (!user || user.status !== "BANNED" || !user.bannedAt) return null;
    return `staff_ban_notice_dismissed:${user.id}:${user.bannedAt}`;
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await staffApiFetch("/api/auth/staff/logout", { method: "POST" });
    } catch {
      // Ignore
    } finally {
      clearSession();
      router.replace("/login/staff");
      setIsLoggingOut(false);
    }
  }, [clearSession, isLoggingOut, router]);

  useEffect(() => {
    if (!user || user.status !== "BANNED" || !banNoticeStorageKey) {
      setIsBanNoticeOpen(false);
      return;
    }

    const dismissed = localStorage.getItem(banNoticeStorageKey) === "1";
    setIsBanNoticeOpen(!dismissed);
  }, [banNoticeStorageKey, user]);

  useEffect(() => {
    if (!user || user.status !== "BANNED") {
      return;
    }

    if (!isAccountSelfPath) {
      router.replace("/espace/staff/compte/details");
    }
  }, [isAccountSelfPath, router, user]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(
        STAFF_NAV_COLLAPSE_STORAGE_KEY,
      );

      if (!rawValue) {
        setHasHydratedCollapseState(true);
        return;
      }

      const parsed = JSON.parse(rawValue);

      if (typeof parsed === "object" && parsed !== null) {
        setCollapsedGroups(parsed as Record<string, boolean>);
      }
    } catch {
      // Ignore malformed persisted collapse state.
    } finally {
      setHasHydratedCollapseState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedCollapseState) {
      return;
    }

    try {
      window.localStorage.setItem(
        STAFF_NAV_COLLAPSE_STORAGE_KEY,
        JSON.stringify(collapsedGroups),
      );
    } catch {
      // Ignore localStorage persistence failures.
    }
  }, [collapsedGroups, hasHydratedCollapseState]);

  const handleCloseBanNotice = useCallback(
    ({ remember }: { remember: boolean }) => {
      if (remember && banNoticeStorageKey) {
        localStorage.setItem(banNoticeStorageKey, "1");
      }

      setIsBanNoticeOpen(false);
    },
    [banNoticeStorageKey],
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }, []);

  return (
    <main className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Sidebar: narrow on mobile, normal on sm+ */}
      <aside className="sticky left-0 top-0 max-h-screen flex w-14 flex-col border-r border-slate-200 bg-white md:w-64 scrollbar-left">        
        <div className="border-b border-slate-200 px-2 py-3 text-[10px] text-slate-500 md:space-y-2 md:px-5 md:py-5">
          <p className="hidden md:block">
            Connecté en tant que : <strong>{displayEmail}</strong>
          </p>
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 md:text-left md:tracking-[0.2em]">
            <span className="hidden md:inline">Accès : </span>
            <strong>{isBanned ? "Compte banni" : displayRole}</strong>
          </p>
        </div>

        {/* Navigation */}
        <nav className="overflow-y-auto flex-1 space-y-4 px-1 py-4 text-sm md:space-y-6 md:px-4 md:py-6">
          {Object.values(canAccessViewMap).map((group: StaffTabGroup) => (
            <div key={group.key} className="space-y-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                className="hidden w-full items-center justify-between rounded-full px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-500 md:flex"
                aria-expanded={!collapsedGroups[group.key]}
                aria-controls={`staff-nav-group-${group.key}`}
              >
                <span>{group.label}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    collapsedGroups[group.key] ? "-rotate-90" : "rotate-0",
                  )}
                />
              </button>

              <div
                id={`staff-nav-group-${group.key}`}
                className={cn(
                  "flex flex-col items-center gap-1 md:items-stretch",
                  collapsedGroups[group.key] ? "flex md:hidden" : "flex",
                )}
              >
                {Object.values(group.tabs).map((tab: StaffTab) => {
                  const href = `/espace/staff/${group.key}/${tab.key}`;
                  return (
                    <SidebarLink
                      key={tab.key}
                      href={href}
                      icon={<tab.icon className="h-4 w-4" />}
                      label={tab.label}
                      selected={pathname.startsWith(href)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer: public site + logout */}
        <div className="flex flex-col space-y-2 border-t border-slate-200 px-2 py-3 text-[10px] text-slate-500 md:px-5 md:py-5">
          {/* Public site link: icon-only on mobile, full on sm+ */}
                    <AnimatedUIButton
            icon="external-link"
            color="default"
            size="sm"
            href="/"
          >
            Aller au site public
          </AnimatedUIButton>

          {/* Logout: icon-only on mobile, text+icon on sm+ */}
          <AnimatedUIButton
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            loading={isLoggingOut}
            loadingText="Déconnexion..."
            icon="arrow-right"
            color="red"
            size="sm"
          >
            Déconnexion
          </AnimatedUIButton>
        </div>
      </aside>

      <section className="flex flex-1 flex-col">
        <div className="flex-1 space-y-8 px-4 py-8 md:px-6 md:py-12 lg:px-8">
          {children}
        </div>
      </section>

      <BannedAccountNoticeDialog
        key={banNoticeStorageKey ?? "ban-notice"}
        open={isBanNoticeOpen}
        banDetails={user?.banDetails ?? null}
        onClose={handleCloseBanNotice}
      />
    </main>
  );
}
