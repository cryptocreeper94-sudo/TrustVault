import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ShortcutAction, formatShortcut } from "@/hooks/use-editor-shortcuts";

interface ShortcutHelpProps {
  open: boolean;
  onClose: () => void;
  shortcuts: ShortcutAction[];
  title?: string;
}

export function ShortcutHelp({ open, onClose, shortcuts, title = "Keyboard Shortcuts" }: ShortcutHelpProps) {
  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="shortcut-help-overlay">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm bg-card rounded-xl shadow-2xl border border-white/10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" />
                <h3 className="font-display font-semibold text-sm" data-testid="text-shortcut-title">{title}</h3>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-shortcuts">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat}>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground mb-2">
                    {cat}
                  </p>
                  <div className="space-y-1.5">
                    {shortcuts
                      .filter((s) => s.category === cat)
                      .map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md"
                          data-testid={`shortcut-row-${i}`}
                        >
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 border border-white/10 text-foreground">
                            {formatShortcut(s)}
                          </kbd>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
                Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px] font-mono">?</kbd> to toggle this panel
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
