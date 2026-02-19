import { motion } from "framer-motion";
import { Upload, FolderOpen, Image, Search, Inbox } from "lucide-react";

type EmptyVariant = "vault" | "collection" | "search" | "gallery" | "inbox";

interface AnimatedEmptyStateProps {
  variant?: EmptyVariant;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const iconMap: Record<EmptyVariant, typeof Upload> = {
  vault: Upload,
  collection: FolderOpen,
  search: Search,
  gallery: Image,
  inbox: Inbox,
};

const orbitColors = [
  "bg-violet-500/20", "bg-blue-500/20", "bg-pink-500/20",
  "bg-cyan-500/20", "bg-amber-500/20", "bg-emerald-500/20",
];

function FloatingOrb({ index, total }: { index: number; total: number }) {
  const angle = (index / total) * Math.PI * 2;
  const radius = 80 + Math.random() * 30;
  const size = 6 + Math.random() * 10;
  const duration = 4 + Math.random() * 3;

  return (
    <motion.div
      className={`absolute rounded-full ${orbitColors[index % orbitColors.length]}`}
      style={{ width: size, height: size }}
      initial={{
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        opacity: 0,
      }}
      animate={{
        x: [
          Math.cos(angle) * radius,
          Math.cos(angle + Math.PI) * radius,
          Math.cos(angle) * radius,
        ],
        y: [
          Math.sin(angle) * radius,
          Math.sin(angle + Math.PI) * radius,
          Math.sin(angle) * radius,
        ],
        opacity: [0, 0.6, 0.6, 0],
        scale: [0.5, 1, 1, 0.5],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay: index * 0.3,
      }}
    />
  );
}

export function AnimatedEmptyState({
  variant = "vault",
  title,
  description,
  action,
  className = "",
}: AnimatedEmptyStateProps) {
  const Icon = iconMap[variant];

  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 ${className}`} data-testid="section-empty-state">
      <div className="relative mb-6">
        {Array.from({ length: 6 }, (_, i) => (
          <FloatingOrb key={i} index={i} total={6} />
        ))}

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative z-10"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center"
          >
            <Icon className="w-8 h-8 text-violet-400/60" />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ width: 160, height: 160, left: -40, top: -40 }}
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(167, 139, 250, 0)",
              "0 0 0 20px rgba(167, 139, 250, 0.03)",
              "0 0 0 40px rgba(167, 139, 250, 0)",
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground/80 mb-2 text-center"
        data-testid="text-empty-title"
      >
        {title}
      </motion.h3>

      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed"
          data-testid="text-empty-description"
        >
          {description}
        </motion.p>
      )}

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-5"
        >
          {action}
        </motion.div>
      )}
    </div>
  );
}
