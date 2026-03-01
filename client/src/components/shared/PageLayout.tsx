import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("p-6 space-y-6 max-w-[1400px] mx-auto", className)}>
      {children}
    </div>
  );
}
