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
import { useAuth } from "@/lib/auth";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  roles: string[];
  group: string;
};

const allNav: NavItem[] = [
  // Principal
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard, roles: ["admin", "trainer", "trainee", "enterprise"], group: "principal" },

  // Formation
  { title: "Formations", url: "/programs", icon: BookOpen, roles: ["admin", "trainer", "trainee", "enterprise"], group: "formation" },
  { title: "Sessions", url: "/sessions", icon: Calendar, roles: ["admin", "trainer", "trainee", "enterprise"], group: "formation" },
  { title: "Inscriptions", url: "/enrollments", icon: ClipboardList, roles: ["admin", "trainer"], group: "formation" },
  { title: "E-Learning", url: "/elearning", icon: MonitorPlay, roles: ["admin", "trainer"], group: "formation" },
  { title: "Portail Apprenant", url: "/learner-portal", icon: BookMarked, roles: ["trainee"], group: "formation" },
  { title: "Portail Formateur", url: "/trainer-portal", icon: BookMarked, roles: ["trainer"], group: "formation" },
  { title: "Portail Entreprise", url: "/enterprise-portal", icon: Building2, roles: ["enterprise"], group: "formation" },

  // Contacts
  { title: "Apprenants", url: "/trainees", icon: GraduationCap, roles: ["admin", "trainer"], group: "contacts" },
  { title: "Formateurs", url: "/trainers", icon: Users, roles: ["admin"], group: "contacts" },
  { title: "Entreprises", url: "/enterprises", icon: Building2, roles: ["admin"], group: "contacts" },

  // Commercial
  { title: "Prospects", url: "/prospects", icon: UserPlus, roles: ["admin"], group: "commercial" },
  { title: "Devis", url: "/quotes", icon: Receipt, roles: ["admin"], group: "commercial" },
  { title: "Factures", url: "/invoices", icon: CreditCard, roles: ["admin"], group: "commercial" },
  { title: "Rapports financiers", url: "/financial-reports", icon: BarChart3, roles: ["admin"], group: "commercial" },

  // Administration
  { title: "Modèles d'emails", url: "/email-templates", icon: Mail, roles: ["admin"], group: "administration" },
  { title: "Documents", url: "/documents", icon: FileText, roles: ["admin"], group: "administration" },
  { title: "Émargement", url: "/attendance", icon: CheckSquare, roles: ["admin", "trainer"], group: "administration" },

  // Qualite
  { title: "Qualité Qualiopi", url: "/quality", icon: Star, roles: ["admin"], group: "qualite" },
  { title: "Enquêtes", url: "/surveys", icon: ClipboardList, roles: ["admin"], group: "qualite" },
];

const groupConfig: Record<string, { label: string; order: number }> = {
  principal: { label: "Principal", order: 0 },
  formation: { label: "Formation", order: 1 },
  contacts: { label: "Contacts", order: 2 },
  commercial: { label: "Commercial", order: 3 },
  administration: { label: "Administration", order: 4 },
  qualite: { label: "Qualité", order: 5 },
};

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const role = user?.role || "admin";

  const visibleNav = allNav.filter((item) => item.roles.includes(role));

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
    </Sidebar>
  );
}
