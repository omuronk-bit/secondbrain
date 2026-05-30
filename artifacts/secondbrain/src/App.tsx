import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { motion } from "framer-motion";
import { TopBar } from "./components/navigation/TopBar";
import { BottomNav } from "./components/navigation/BottomNav";
import { Toaster } from "./components/ui/toaster";
import { Today } from "./pages/Today";
import { Capture } from "./pages/Capture";
import { Media } from "./pages/Media";
import { Ask } from "./pages/Ask";
import { Library } from "./pages/Library";
import { Analytics } from "./pages/Analytics";
import { Notes } from "./pages/Notes";

// Keyed on location → each navigation fades the new page in (soft transition).
function Pages() {
  const [location] = useLocation();
  return (
    <motion.div
      key={location}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Switch>
        <Route path="/today" component={Today} />
        <Route path="/capture" component={Capture} />
        <Route path="/media" component={Media} />
        <Route path="/ask" component={Ask} />
        <Route path="/notes" component={Notes} />
        <Route path="/library" component={Library} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/">
          <Redirect to="/today" />
        </Route>
      </Switch>
    </motion.div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem("secondbrain_theme") as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem("secondbrain_theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground transition-colors duration-200">
      <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}>
        <TopBar theme={theme} toggleTheme={toggleTheme} />
        <main className="flex-1 pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(60px+env(safe-area-inset-bottom))] md:pb-0 overflow-x-hidden">
          <Pages />
        </main>
        <BottomNav />
      </WouterRouter>
      <Toaster />
    </div>
  );
}
