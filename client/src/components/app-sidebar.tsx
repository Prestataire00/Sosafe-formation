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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
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
  // Principal
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard, roles: ["admin", "trainer", "trainee", "enterprise"], group: "principal" },

  // Formation
  { title: "Formations", url: "/programs", icon: BookOpen, roles: ["admin", "trainer", "trainee", "enterprise"], permission: "manage_programs", group: "formation" },
  { title: "Sessions", url: "/sessions", icon: Calendar, roles: ["admin", "trainer", "trainee", "enterprise"], permission: "manage_sessions", group: "formation" },
  { title: "Inscriptions", url: "/enrollments", icon: ClipboardList, roles: ["admin", "trainer"], permission: "manage_enrollments", group: "formation" },
  { title: "E-Learning", url: "/elearning", icon: MonitorPlay, roles: ["admin", "trainer"], permission: "manage_elearning", group: "formation" },
  { title: "Portail Apprenant", url: "/learner-portal", icon: BookMarked, roles: ["trainee"], group: "formation" },
  { title: "Portail Formateur", url: "/trainer-portal", icon: BookMarked, roles: ["trainer"], group: "formation" },
  { title: "Portail Entreprise", url: "/enterprise-portal", icon: Building2, roles: ["enterprise"], group: "formation" },

  // Contacts
  { title: "Apprenants", url: "/trainees", icon: GraduationCap, roles: ["admin", "trainer"], permission: "manage_trainees", group: "contacts" },
  { title: "Formateurs", url: "/trainers", icon: Users, roles: ["admin"], permission: "manage_trainers", group: "contacts" },
  { title: "Entreprises", url: "/enterprises", icon: Building2, roles: ["admin"], permission: "manage_enterprises", group: "contacts" },

  // Commercial
  { title: "Prospects", url: "/prospects", icon: UserPlus, roles: ["admin"], permission: "manage_prospects", group: "commercial" },
  { title: "Devis", url: "/quotes", icon: Receipt, roles: ["admin"], permission: "manage_quotes", group: "commercial" },
  { title: "Factures", url: "/invoices", icon: CreditCard, roles: ["admin"], permission: "manage_invoices", group: "commercial" },
  { title: "Rapports financiers", url: "/financial-reports", icon: BarChart3, roles: ["admin"], permission: "view_financial_reports", group: "commercial" },

  // Intervenant
  { title: "Notes de frais", url: "/expense-notes", icon: Receipt, roles: ["admin", "trainer"], group: "intervenant" },
  { title: "Factures formateur", url: "/trainer-invoices", icon: CreditCard, roles: ["admin", "trainer"], group: "intervenant" },

  // Administration
  { title: "Modèles d'emails", url: "/email-templates", icon: Mail, roles: ["admin"], permission: "manage_templates", group: "administration" },
  { title: "Documents", url: "/documents", icon: FileText, roles: ["admin"], permission: "manage_documents", group: "administration" },
  { title: "Émargement", url: "/attendance", icon: CheckSquare, roles: ["admin", "trainer"], permission: "manage_attendance", group: "administration" },

  // Qualite
  { title: "Qualité Qualiopi", url: "/quality", icon: Star, roles: ["admin"], permission: "manage_quality_actions", group: "qualite" },
  { title: "Suivi des compétences", url: "/trainer-competencies", icon: Award, roles: ["admin"], group: "qualite" },
  { title: "Enquêtes", url: "/surveys", icon: ClipboardList, roles: ["admin"], permission: "manage_surveys", group: "qualite" },
];

const groupConfig: Record<string, { label: string; order: number }> = {
  principal: { label: "Principal", order: 0 },
  formation: { label: "Formation", order: 1 },
  contacts: { label: "Contacts", order: 2 },
  intervenant: { label: "Intervenant", order: 3 },
  commercial: { label: "Commercial", order: 4 },
  administration: { label: "Administration", order: 5 },
  qualite: { label: "Qualité", order: 6 },
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const role = user?.role || "admin";

  const visibleNav = allNav.filter((item) => {
    if (!item.roles.includes(role)) return false;
    // Les permissions ne s'appliquent qu'aux admins (système de sous-rôles admin)
    if (item.permission && role === "admin" && user) {
      return hasPermission(user, item.permission);
    }
    return true;
  });

  const groups = Object.entries(groupConfig)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, config]) => ({
      key,
      label: config.label,
      items: visibleNav.filter((item) => item.group === key),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">SO'SAFE</span>
              <span className="text-xs text-muted-foreground">Gestion de formation</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.key}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                      tooltip={item.title}
                    >
                      <Link href={item.url} data-testid={`link-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {role === "admin" && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/settings"} tooltip="Paramètres">
                <Link href="/settings" data-testid="link-settings">
                  <Settings />
                  <span>Paramètres</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
