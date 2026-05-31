import { Link, useLocation } from "wouter";
import { Brain, Plus, Search, BookOpen, NotebookPen } from "lucide-react";
import { cn } from "../../lib/utils";

const LEFT = [
  { href: "/today", icon: Brain, label: "Today" },
  { href: "/ask", icon: Search, label: "Ask" },
];
const RIGHT = [
  { href: "/notes", icon: NotebookPen, label: "Notes" },
  { href: "/library", icon: BookOpen, label: "Library" },
];

export const BottomNav = () => {
  const [location] = useLocation();

  const NavItem = ({ href, icon: Icon, label }: { href: string; icon: typeof Brain; label: string }) => {
    const isActive = location.startsWith(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors active:scale-95",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
        data-testid={`nav-${label.toLowerCase()}`}
      >
        <span className={cn("flex items-center justify-center rounded-full px-4 py-1 transition-colors", isActive && "bg-primary/10")}>
          <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
        </span>
        <span className={cn("text-[10px]", isActive && "font-semibold")}>{label}</span>
      </Link>
    );
  };

  const captureActive = location.startsWith("/capture");

  return (
    <nav className="fixed bottom-0 left-0 right-0 min-h-[60px] pb-[env(safe-area-inset-bottom)] bg-background/90 backdrop-blur-md border-t border-border flex items-center px-2 z-50 md:hidden">
      {LEFT.map((i) => <NavItem key={i.href} {...i} />)}

      {/* center capture action — raised above the bar */}
      <div className="flex-1 flex justify-center">
        <Link
          href="/capture"
          aria-label="Capture"
          data-testid="nav-capture"
          className={cn(
            "-mt-7 w-14 h-14 rounded-full grid place-items-center shadow-lg active:scale-95 transition-transform border-4 border-background",
            captureActive ? "bg-primary text-primary-foreground" : "bg-foreground text-background hover:opacity-90",
          )}
        >
          <Plus className="w-6 h-6" />
        </Link>
      </div>

      {RIGHT.map((i) => <NavItem key={i.href} {...i} />)}
    </nav>
  );
};
