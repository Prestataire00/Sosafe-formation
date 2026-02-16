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

const allNav = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard, roles: ["admin", "trainer", "trainee", "enterprise"] },
  { title: "Formations", url: "/programs", icon: BookOpen, roles: ["admin", "trainer", "trainee", "enterprise"], group: "formation" },
  { title: "Sessions", url: "/sessions", icon: Calendar, roles: ["admin", "trainer", "trainee", "enterprise"], group: "formation" },
  { title: "Apprenants", url: "/trainees", icon: GraduationCap, roles: ["admin", "trainer"], group: "contacts" },
  { title: "Formateurs", url: "/trainers", icon: Users, roles: ["admin"], group: "contacts" },
  { title: "Entreprises", url: "/enterprises", icon: Building2, roles: ["admin"], group: "contacts" },
  { title: "Inscriptions", url: "/enrollments", icon: ClipboardList, roles: ["admin", "trainer"], group: "formation" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const role = user?.role || "admin";

  const visibleNav = allNav.filter((item) => item.roles.includes(role));
  const mainItems = visibleNav.filter((item) => !item.group || item.group === "formation");
  const contactItems = visibleNav.filter((item) => item.group === "contacts");

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
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
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
        {contactItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Contacts</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {contactItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.startsWith(item.url)}
                      tooltip={item.title}
                    >
                      <Link href={item.url} data-testid={`link-${item.url.replace("/", "")}`}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Param\u00e8tres">
              <Settings />
              <span>Param\u00e8tres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
