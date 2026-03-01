import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Users,
  GraduationCap,
  Building2,
  Settings,
  ClipboardList,
  Mail,
  FileText,
  UserPlus,
  Receipt,
  CreditCard,
  BarChart3,
  CheckSquare,
  Star,
  MonitorPlay,
  BookMarked,
  Award,
  MessageSquare,
  Target,
  PieChart,
  ShieldAlert,
  Medal,
  Sparkles,
  ListChecks,
  Globe,
  Database,
  Wrench,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth, hasPermission } from "@/lib/auth";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  group: string;
  permission?: string;
};

const allNav: NavItem[] = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard, roles: ["admin", "trainer", "trainee", "enterprise"], group: "dashboard" },

  { title: "Formations", url: "/programs", icon: BookOpen, roles: ["admin", "trainer", "trainee", "enterprise"], permission: "manage_programs", group: "formation" },
  { title: "Sessions", url: "/sessions", icon: Calendar, roles: ["admin", "trainer", "trainee", "enterprise"], permission: "manage_sessions", group: "formation" },
  { title: "Inscriptions", url: "/enrollments", icon: ClipboardList, roles: ["admin", "trainer"], permission: "manage_enrollments", group: "formation" },
  { title: "Émargement", url: "/attendance", icon: CheckSquare, roles: ["admin", "trainer"], permission: "manage_attendance", group: "formation" },
  { title: "E-Learning", url: "/elearning", icon: MonitorPlay, roles: ["admin", "trainer"], permission: "manage_elearning", group: "formation" },
  { title: "Listes de tâches", url: "/task-lists", icon: ListChecks, roles: ["admin", "trainer"], group: "formation" },
  { title: "Portail Apprenant", url: "/learner-portal", icon: BookMarked, roles: ["trainee"], group: "formation" },
  { title: "Portail Formateur", url: "/trainer-portal", icon: BookMarked, roles: ["trainer"], group: "formation" },
  { title: "Portail Entreprise", url: "/enterprise-portal", icon: Building2, roles: ["enterprise"], group: "formation" },

  { title: "Apprenants", url: "/trainees", icon: GraduationCap, roles: ["admin", "trainer"], permission: "manage_trainees", group: "contacts" },
  { title: "Formateurs", url: "/trainers", icon: Users, roles: ["admin"], permission: "manage_trainers", group: "contacts" },
  { title: "Entreprises", url: "/enterprises", icon: Building2, roles: ["admin"], permission: "manage_enterprises", group: "contacts" },
  { title: "Prospects", url: "/prospects", icon: UserPlus, roles: ["admin"], permission: "manage_prospects", group: "contacts" },
  { title: "CRM & Marketing", url: "/crm", icon: Target, roles: ["admin"], permission: "manage_prospects", group: "contacts" },

  { title: "Devis", url: "/quotes", icon: Receipt, roles: ["admin"], permission: "manage_quotes", group: "finance" },
  { title: "Factures", url: "/invoices", icon: CreditCard, roles: ["admin"], permission: "manage_invoices", group: "finance" },
  { title: "Notes de frais", url: "/expense-notes", icon: Receipt, roles: ["admin", "trainer"], group: "finance" },
  { title: "Factures formateur", url: "/trainer-invoices", icon: CreditCard, roles: ["admin", "trainer"], group: "finance" },
  { title: "Rapports financiers", url: "/financial-reports", icon: BarChart3, roles: ["admin"], permission: "view_financial_reports", group: "finance" },

  { title: "Qualité Qualiopi", url: "/quality", icon: Star, roles: ["admin"], permission: "manage_quality_actions", group: "qualite" },
  { title: "Enquêtes", url: "/surveys", icon: ClipboardList, roles: ["admin"], permission: "manage_surveys", group: "qualite" },
  { title: "Suivi des compétences", url: "/trainer-competencies", icon: Award, roles: ["admin"], group: "qualite" },
  { title: "Certifications & Badges", url: "/certifications-badges", icon: Medal, roles: ["admin"], group: "qualite" },
  { title: "Amélioration continue", url: "/quality-improvement", icon: ShieldAlert, roles: ["admin"], group: "qualite" },
  { title: "Reporting", url: "/reporting", icon: PieChart, roles: ["admin"], group: "qualite" },

  { title: "Messagerie", url: "/messaging", icon: MessageSquare, roles: ["admin", "trainer", "trainee"], group: "communication" },
  { title: "Communications", url: "/email-templates", icon: Mail, roles: ["admin"], permission: "manage_templates", group: "communication" },
  { title: "Documents", url: "/documents", icon: FileText, roles: ["admin"], permission: "manage_documents", group: "communication" },

  { title: "Intégration site web", url: "/integration", icon: Globe, roles: ["admin"], group: "outils" },
  { title: "Migration & Archivage", url: "/data-migration", icon: Database, roles: ["admin"], group: "outils" },
  { title: "Fonctions avancées", url: "/advanced-features", icon: Sparkles, roles: ["admin"], group: "outils" },
];

type GroupDef = {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  order: number;
};

const groupDefs: GroupDef[] = [
  { key: "dashboard", label: "Accueil", icon: LayoutDashboard, order: 0 },
  { key: "formation", label: "Formation", icon: BookOpen, order: 1 },
  { key: "contacts", label: "Contacts", icon: Users, order: 2 },
  { key: "finance", label: "Finance", icon: CreditCard, order: 3 },
  { key: "qualite", label: "Qualité", icon: Award, order: 4 },
  { key: "communication", label: "Comm.", icon: MessageSquare, order: 5 },
  { key: "outils", label: "Outils", icon: Wrench, order: 6 },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const lastGroupRef = useRef<string>("formation");
  const role = user?.role || "admin";

  const visibleNav = allNav.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.permission && role === "admin" && user) {
      return hasPermission(user, item.permission);
    }
    return true;
  });

  const getGroupItems = (groupKey: string) =>
    visibleNav.filter((item) => item.group === groupKey);

  const activeGroupKey =
    visibleNav.find(
      (item) =>
        location === item.url ||
        (item.url !== "/" && location.startsWith(item.url))
    )?.group || "dashboard";

  const visibleGroups = groupDefs
    .sort((a, b) => a.order - b.order)
    .filter((g) => getGroupItems(g.key).length > 0);

  // Track last non-dashboard hovered group for flyout content during close animation
  if (hoveredGroup && hoveredGroup !== "dashboard") {
    lastGroupRef.current = hoveredGroup;
  }

  const showFlyout =
    hoveredGroup !== null &&
    hoveredGroup !== "dashboard" &&
    getGroupItems(hoveredGroup).length > 0;

  const flyoutGroupKey = lastGroupRef.current;
  const flyoutGroupDef = groupDefs.find((g) => g.key === flyoutGroupKey);
  const flyoutItems = getGroupItems(flyoutGroupKey);

  // ── Mobile ──
  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 flex items-center justify-center rounded-md bg-primary shrink-0">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">SO'SAFE</span>
                <span className="text-xs text-muted-foreground">Gestion de formation</span>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Navigation principale</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {visibleGroups.map((group) => {
              const items = getGroupItems(group.key);
              return (
                <div key={group.key} className="mb-1">
                  {group.key !== "dashboard" && (
                    <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </div>
                  )}
                  {items.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive =
                      location === item.url ||
                      (item.url !== "/" && location.startsWith(item.url));
                    return (
                      <Link key={item.url} href={item.url}>
                        <div
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                            isItemActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                          onClick={() => setOpenMobile(false)}
                        >
                          <ItemIcon className="w-4 h-4 shrink-0" />
                          <span>{item.title}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {role === "admin" && (
            <div className="border-t p-2">
              <Link href="/settings">
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm rounded-md transition-colors",
                    location === "/settings"
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => setOpenMobile(false)}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Paramètres</span>
                </div>
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    );
  }

  // ── Desktop ──
  return (
    <>
      {/* Spacer — reserves icon-bar width in the layout flow */}
      <div className="w-16 shrink-0" />

      {/* Fixed sidebar container */}
      <div
        className="fixed left-0 top-0 h-screen z-40 flex"
        onMouseLeave={() => setHoveredGroup(null)}
      >
        {/* Icon bar */}
        <nav className="w-16 bg-sidebar border-r flex flex-col items-center">
          {/* Logo */}
          <Link href="/" data-testid="link-home">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-primary mt-3 mb-1 shrink-0">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
          </Link>

          <div className="w-10 h-px bg-border my-2" />

          {/* Group icons */}
          <div className="flex-1 flex flex-col gap-0.5 w-full px-1.5 overflow-y-auto scrollbar-none">
            {visibleGroups.map((group) => {
              const GroupIcon = group.icon;
              const isActive = activeGroupKey === group.key;
              const isHovered = hoveredGroup === group.key;

              const iconClasses = cn(
                "flex flex-col items-center gap-0.5 py-2 rounded-lg cursor-pointer transition-colors",
                isActive && "bg-primary/10 text-primary",
                isHovered && !isActive && "bg-accent text-foreground",
                !isActive && !isHovered && "text-muted-foreground hover:text-foreground"
              );

              // Dashboard = direct link, no flyout
              if (group.key === "dashboard") {
                return (
                  <Link key={group.key} href="/">
                    <div
                      className={iconClasses}
                      onMouseEnter={() => setHoveredGroup("dashboard")}
                      data-testid="link-dashboard"
                    >
                      <GroupIcon className="w-5 h-5" />
                      <span className="text-[10px] font-medium leading-tight">{group.label}</span>
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={group.key}
                  className={iconClasses}
                  onMouseEnter={() => setHoveredGroup(group.key)}
                >
                  <GroupIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight">{group.label}</span>
                </div>
              );
            })}
          </div>

          {/* Settings — footer */}
          {role === "admin" && (
            <div className="w-full px-1.5 pb-3">
              <Link href="/settings" data-testid="link-settings">
                <div
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 rounded-lg cursor-pointer transition-colors",
                    location === "/settings"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  onMouseEnter={() => setHoveredGroup(null)}
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight">Réglages</span>
                </div>
              </Link>
            </div>
          )}
        </nav>

        {/* Flyout panel */}
        <div
          className={cn(
            "bg-sidebar border-r transition-[width,opacity,box-shadow] duration-200 ease-out overflow-hidden",
            showFlyout
              ? "w-56 opacity-100 shadow-xl"
              : "w-0 opacity-0 shadow-none"
          )}
        >
          <div className="w-56">
            {/* Group title */}
            <div className="px-4 py-3 border-b">
              <h3 className="font-semibold text-sm text-sidebar-foreground whitespace-nowrap">
                {flyoutGroupDef?.label}
              </h3>
            </div>

            {/* Sub-items */}
            <div className="py-1.5">
              {flyoutItems.map((item) => {
                const ItemIcon = item.icon;
                const isItemActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <Link key={item.url} href={item.url}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 text-sm transition-colors whitespace-nowrap",
                        isItemActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                      onClick={() => setHoveredGroup(null)}
                    >
                      <ItemIcon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
