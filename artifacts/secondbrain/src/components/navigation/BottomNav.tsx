import { Link, useLocation } from "wouter";
import { Brain, Plus, Play, Search, BookOpen } from "lucide-react";
import { cn } from "../../lib/utils";

export const BottomNav = () => {
  const [location] = useLocation();

  const navItems = [
    { href: "/today", icon: Brain, label: "Today" },
    { href: "/capture", icon: Plus, label: "Capture" },
    { href: "/media", icon: Play, label: "Media" },
    { href: "/ask", icon: Search, label: "Ask" },
    { href: "/library", icon: BookOpen, label: "Library" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-background border-t border-border flex items-center justify-around px-2 z-50 pb-safe md:hidden">
      {navItems.map((item) => {
        const isActive = location.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
            <span className={cn("text-[10px]", isActive && "font-semibold")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
