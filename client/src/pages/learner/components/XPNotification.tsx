import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface XPNotificationProps {
  points: number;
  label?: string;
  onComplete?: () => void;
}

export function XPNotification({ points, label, onComplete }: XPNotificationProps) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 1 }}
      animate={{ y: -60, opacity: 0, scale: 1.4 }}
      transition={{ duration: 1.8, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="flex items-center gap-1.5 text-amber-500 font-bold pointer-events-none"
    >
      <Zap className="w-5 h-5 fill-amber-400" />
      <span className="text-lg bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
        +{points} XP
      </span>
      {label && <span className="text-sm text-muted-foreground ml-1">{label}</span>}
    </motion.div>
  );
}
