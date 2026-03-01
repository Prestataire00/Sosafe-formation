import { Badge } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const defaultStatusMap: Record<string, BadgeVariant> = {
  // French
  "actif": "success",
  "active": "success",
  "actifs": "success",
  "actives": "success",
  "confirme": "success",
  "confirmé": "success",
  "confirmée": "success",
  "payé": "success",
  "payée": "success",
  "validé": "success",
  "validée": "success",
  "terminé": "success",
  "terminée": "success",
  "complété": "success",
  "complétée": "success",
  "approuvé": "success",
  "approuvée": "success",
  "en_cours": "info",
  "en cours": "info",
  "planifié": "info",
  "planifiée": "info",
  "planifie": "info",
  "ouvert": "info",
  "ouverte": "info",
  "en attente": "warning",
  "en_attente": "warning",
  "brouillon": "warning",
  "draft": "warning",
  "pending": "warning",
  "partiel": "warning",
  "partielle": "warning",
  "inactif": "secondary",
  "inactive": "secondary",
  "annulé": "destructive",
  "annulée": "destructive",
  "refusé": "destructive",
  "refusée": "destructive",
  "rejeté": "destructive",
  "rejetée": "destructive",
  "en retard": "destructive",
  "expiré": "destructive",
  "expirée": "destructive",
  "archivé": "secondary",
  "archivée": "secondary",
  "nouveau": "purple",
  "nouvelle": "purple",
  // English fallbacks
  "active_en": "success",
  "completed": "success",
  "confirmed": "success",
  "paid": "success",
  "in_progress": "info",
  "open": "info",
  "planned": "info",
  "scheduled": "purple",
  "cancelled": "destructive",
  "rejected": "destructive",
  "overdue": "destructive",
  "inactive_en": "secondary",
  "archived": "secondary",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
  colorMap?: Record<string, BadgeVariant>;
  className?: string;
}

export function StatusBadge({ status, label, colorMap, className }: StatusBadgeProps) {
  const map = { ...defaultStatusMap, ...colorMap };
  const normalizedStatus = status.toLowerCase().trim();
  const variant = map[normalizedStatus] || "secondary";
  const displayLabel = label || status;

  return (
    <Badge variant={variant} className={className}>
      {displayLabel}
    </Badge>
  );
}
