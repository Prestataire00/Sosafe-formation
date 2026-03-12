import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { allNav, type NavItem } from "@/components/app-sidebar";
import { useAuth, hasPermission } from "@/lib/auth";

const groupLabels: Record<string, string> = {
  dashboard: "Accueil",
  formation: "Formation",
  contacts: "Contacts",
  finance: "Finance",
  qualite: "Qualité",
  communication: "Communication",
  outils: "Outils",
};

const groupOrder = [
  "dashboard",
  "formation",
  "contacts",
  "finance",
  "qualite",
  "communication",
  "outils",
];

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const visibleItems = useMemo(() => {
    if (!user) return [];
    const role = user.role;

    return allNav.filter((item) => {
      if (!item.roles.includes(role)) return false;
      if (item.permission && !hasPermission(user, item.permission)) return false;
      return true;
    });
  }, [user]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    for (const item of visibleItems) {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    }
    return groupOrder
      .filter((key) => groups[key] && groups[key].length > 0)
      .map((key) => ({
        key,
        label: groupLabels[key] || key,
        items: groups[key],
      }));
  }, [visibleItems]);

  function handleSelect(url: string) {
    setOpen(false);
    setLocation(url);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Rechercher une page..." />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        {groupedItems.map((group) => (
          <CommandGroup key={group.key} heading={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.url}
                  value={item.title}
                  onSelect={() => handleSelect(item.url)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                  <CommandShortcut>⌘K</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
