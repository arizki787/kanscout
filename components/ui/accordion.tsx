"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  openItems: Set<string>;
  toggleItem: (id: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue>({
  openItems: new Set(),
  toggleItem: () => {},
});

interface AccordionProps {
  children: React.ReactNode;
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({
  children,
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [openItems, setOpenItems] = React.useState<Set<string>>(
    new Set(defaultOpen)
  );

  const toggleItem = React.useCallback((id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div
        className={cn(
          "rounded-lg border border-gray-200 bg-white divide-y divide-gray-200",
          className
        )}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function AccordionItem({ id, title, children }: AccordionItemProps) {
  const { openItems, toggleItem } = React.useContext(AccordionContext);
  const isOpen = openItems.has(id);

  return (
    <div>
      <button
        type="button"
        onClick={() => toggleItem(id)}
        className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-expanded={isOpen}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"
        )}
        aria-hidden={!isOpen}
      >
        <div className="px-5 pb-5 pt-2">{children}</div>
      </div>
    </div>
  );
}
