import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bell, MessageSquare, CalendarCheck, UserPlus, FileText,
  PenTool, ClipboardList, CheckSquare, Award, Info, Clock,
  CheckCheck, Trash2, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  userId: string;
  category: string;
  title: string;
  description: string | null;
  href: string | null;
  read: boolean;
  relatedId: string | null;
  relatedType: string | null;
  createdAt: string;
}

const CATEGORY_ORDER = [
  "message", "session", "enrollment", "document", "signature",
  "evaluation", "task", "badge", "reminder", "system",
];

const CATEGORY_CONFIG: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  message:    { icon: MessageSquare, color: "text-blue-600",   bgColor: "bg-blue-50 dark:bg-blue-900/20",     label: "Messages" },
  session:    { icon: CalendarCheck, color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-900/20", label: "Sessions" },
  enrollment: { icon: UserPlus,      color: "text-green-600",  bgColor: "bg-green-50 dark:bg-green-900/20",   label: "Inscriptions" },
  document:   { icon: FileText,      color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/20", label: "Documents" },
  signature:  { icon: PenTool,       color: "text-amber-600",  bgColor: "bg-amber-50 dark:bg-amber-900/20",   label: "Signatures" },
  evaluation: { icon: ClipboardList, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/20", label: "Évaluations" },
  task:       { icon: CheckSquare,   color: "text-teal-600",   bgColor: "bg-teal-50 dark:bg-teal-900/20",     label: "Missions" },
  badge:      { icon: Award,         color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-900/20", label: "Badges" },
  reminder:   { icon: Clock,         color: "text-red-600",    bgColor: "bg-red-50 dark:bg-red-900/20",       label: "Rappels" },
  system:     { icon: Info,          color: "text-gray-600",   bgColor: "bg-gray-50 dark:bg-gray-900/20",     label: "Système" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000,
    enabled: !!user,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    refetchInterval: 10000,
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notifications/mark-all-read"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const unreadCount = unreadData?.count || 0;
  const allNotifs = notifications || [];

  // Count per category
  const countByCategory: Record<string, { total: number; unread: number }> = {};
  for (const n of allNotifs) {
    if (!countByCategory[n.category]) countByCategory[n.category] = { total: 0, unread: 0 };
    countByCategory[n.category].total++;
    if (!n.read) countByCategory[n.category].unread++;
  }

  // Filter
  const filtered = activeFilter
    ? allNotifs.filter(n => n.category === activeFilter)
    : allNotifs;

  // Group filtered by category (in order)
  const grouped: { category: string; notifs: Notification[] }[] = [];
  if (!activeFilter) {
    for (const cat of CATEGORY_ORDER) {
      const catNotifs = filtered.filter(n => n.category === cat);
      if (catNotifs.length > 0) grouped.push({ category: cat, notifs: catNotifs });
    }
    // Any remaining unknown categories
    const knownCats = new Set(CATEGORY_ORDER);
    const unknownNotifs = filtered.filter(n => !knownCats.has(n.category));
    if (unknownNotifs.length > 0) grouped.push({ category: "system", notifs: unknownNotifs });
  } else {
    grouped.push({ category: activeFilter, notifs: filtered });
  }

  function handleClick(notif: Notification) {
    if (!notif.read) markReadMutation.mutate(notif.id);
    if (notif.href) {
      setOpen(false);
      setLocation(notif.href);
    }
  }

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[440px] sm:max-w-[480px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base">Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => markAllReadMutation.mutate()}
              >
                <CheckCheck className="w-3 h-3" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Category filters */}
        <div className="px-3 py-2 border-b shrink-0">
          <div className="flex flex-wrap gap-1.5">
            <button
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                !activeFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
              onClick={() => setActiveFilter(null)}
            >
              <Filter className="w-3 h-3" />
              Toutes
              {allNotifs.length > 0 && (
                <span className="ml-0.5 opacity-75">{allNotifs.length}</span>
              )}
            </button>
            {CATEGORY_ORDER.map(cat => {
              const counts = countByCategory[cat];
              if (!counts) return null;
              const config = CATEGORY_CONFIG[cat];
              const CatIcon = config.icon;
              return (
                <button
                  key={cat}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                    activeFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                  onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                >
                  <CatIcon className="w-3 h-3" />
                  {config.label}
                  {counts.unread > 0 && (
                    <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
                      {counts.unread}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications list grouped by category */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                {activeFilter ? "Aucune notification dans cette catégorie" : "Aucune notification"}
              </p>
            </div>
          ) : (
            <div>
              {grouped.map(({ category, notifs }) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.system;
                const CatIcon = config.icon;
                const catUnread = notifs.filter(n => !n.read).length;
                return (
                  <div key={category}>
                    {/* Category header */}
                    {!activeFilter && (
                      <div className={cn("sticky top-0 z-10 flex items-center gap-2 px-4 py-2 border-b", config.bgColor)}>
                        <CatIcon className={cn("w-3.5 h-3.5", config.color)} />
                        <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
                        <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
                          {notifs.length}
                        </Badge>
                        {catUnread > 0 && (
                          <span className="min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1">
                            {catUnread}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Notifications */}
                    {notifs.map(notif => {
                      const nConfig = CATEGORY_CONFIG[notif.category] || CATEGORY_CONFIG.system;
                      const NIcon = nConfig.icon;
                      const timeAgo = notif.createdAt
                        ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })
                        : "";

                      return (
                        <button
                          key={notif.id}
                          className={cn(
                            "w-full flex items-start gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left group border-b border-border/50",
                            !notif.read && "bg-primary/5"
                          )}
                          onClick={() => handleClick(notif)}
                        >
                          <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", nConfig.color, nConfig.bgColor)}>
                            <NIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className={cn("text-sm leading-tight", !notif.read ? "font-semibold" : "font-medium")}>
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                              )}
                            </div>
                            {notif.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.description}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo}</p>
                          </div>
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1 p-1 rounded hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
