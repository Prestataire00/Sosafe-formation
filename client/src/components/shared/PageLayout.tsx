import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("px-3 py-4 sm:px-6 sm:py-6 space-y-4 sm:space-y-6 max-w-[1400px] mx-auto w-full", className)}
    >
      {children}
    </motion.div>
  );
}
