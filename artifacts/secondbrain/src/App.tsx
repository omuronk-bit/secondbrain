import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { TopBar } from "./components/navigation/TopBar";
import { BottomNav } from "./components/navigation/BottomNav";
import { Today } from "./pages/Today";
import { Capture } from "./pages/Capture";
import { Media } from "./pages/Media";
import { Ask } from "./pages/Ask";
import { Library } from "./pages/Library";
import { Analytics } from "./pages/Analytics";
import { Notes } from "./pages/Notes";

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
        <main className="flex-1 pt-[56px] pb-[60px] md:pb-0 overflow-x-hidden">
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
        </main>
        <BottomNav />
      </WouterRouter>
    </div>
  );
}
