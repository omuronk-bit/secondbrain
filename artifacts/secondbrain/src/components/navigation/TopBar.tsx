import { useState, useEffect } from "react";
import { Sun, Moon, BarChart2, Bell, BellRing } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "../../lib/utils";
import { enablePush, pushEnabled } from "../../lib/push";
import { toast } from "../../hooks/use-toast";

interface Props {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const TopBar = ({ theme, toggleTheme }: Props) => {
  const [location] = useLocation();
  const onAnalytics = location.startsWith('/analytics');
  const [notif, setNotif] = useState(false);

  useEffect(() => { pushEnabled().then(setNotif).catch(() => {}); }, []);

  async function toggleNotif() {
    if (notif) { toast({ title: 'Notifications are on' }); return; }
    const r = await enablePush();
    if (r.ok) {
      setNotif(true);
      toast({ title: 'Notifications on', description: "You'll get your daily brief here." });
    } else {
      toast({ title: 'Could not enable notifications', description: r.error });
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50">
      <div className="font-black text-lg tracking-tight">SecondBrain</div>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleNotif}
          className={cn(
            "p-2 rounded-full transition-colors active:scale-95",
            notif ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
          aria-label="Enable notifications"
          title="Notifications"
        >
          {notif ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
        </button>
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
