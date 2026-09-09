"use client";

import { useEffect } from "react";

if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    const errorString = args
      .map((a) => {
        if (typeof a === "string") return a;
        if (a && typeof a === "object") {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        }
        return String(a);
      })
      .join(" ");

    if (
      errorString.includes("bis_skin_checked") ||
      errorString.includes("bis_status") ||
      errorString.includes("cz-shortcut-listen")
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

export default function ExtensionHydrationFix() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      const clean = () => {
        document.querySelectorAll("[bis_skin_checked]").forEach((el) => {
          el.removeAttribute("bis_skin_checked");
        });
      };
      clean();
      const timer = setTimeout(clean, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
