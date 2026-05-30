import { Sun, Moon, BarChart2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "../../lib/utils";

interface Props {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const TopBar = ({ theme, toggleTheme }: Props) => {
  const [location] = useLocation();
  const onAnalytics = location.startsWith('/analytics');

  return (
    <header className="fixed top-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50">
      <div className="font-black text-lg tracking-tight">SecondBrain</div>
      <div className="flex items-center gap-1">
        <Link href="/analytics">
          <button
            className={cn(
              "p-2 rounded-full transition-colors active:scale-95",
              onAnalytics
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-label="Loop analytics"
            title="Loop Health"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-95"
          data-testid="theme-toggle"
          aria-label="Toggle dark mode"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
