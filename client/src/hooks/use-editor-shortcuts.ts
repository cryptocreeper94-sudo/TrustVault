import { useEffect, useCallback, useState } from "react";

export interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  label: string;
  category: string;
  action: () => void;
}

export function useEditorShortcuts(shortcuts: ShortcutAction[]) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && showHelp) {
        setShowHelp(false);
        return;
      }

      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl
          ? e.ctrlKey || e.metaKey
          : !e.ctrlKey && !e.metaKey;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch) {
          if (isInput && !s.ctrl) continue;
          e.preventDefault();
          s.action();
          return;
        }
      }
    },
    [shortcuts, showHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}

export function formatShortcut(s: ShortcutAction): string {
  const parts: string[] = [];
  if (s.ctrl) parts.push(navigator.platform.includes("Mac") ? "Cmd" : "Ctrl");
  if (s.shift) parts.push("Shift");
  const keyLabel =
    s.key === " "
      ? "Space"
      : s.key.length === 1
        ? s.key.toUpperCase()
        : s.key;
  parts.push(keyLabel);
  return parts.join(" + ");
}
