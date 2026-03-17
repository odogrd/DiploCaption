import { Link, useLocation } from "wouter";
import { useGetMe, useLogout } from "@workspace/api-client-react";
import { Compass, Home, Settings, Clock, LogOut, Menu, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useGetMe({ query: { retry: false } });
  const logoutMutation = useLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && (isError || !user?.authenticated)) {
      setLocation("/login");
    }
  }, [isLoading, isError, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user?.authenticated) return null;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation("/login")
    });
  };

  const navItems = [
    { href: "/", label: "Generator", icon: Home },
    { href: "/history", label: "History", icon: Clock },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card/30 backdrop-blur-md">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg border border-primary/20">
            <Compass className="w-6 h-6 text-primary" />
          </div>
          <span className="font-serif text-xl font-bold tracking-tight">DiploCaption</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-primary" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          <span className="font-serif text-lg font-bold">DiploCaption</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-foreground">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm md:hidden flex flex-col"
          >
            <div className="p-4 flex justify-end">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-foreground">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 px-6 py-8 space-y-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-xl text-lg",
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    {item.label}
                  </Link>
                );
              })}
              <button 
                onClick={handleLogout}
                className="flex items-center gap-4 px-4 py-4 w-full text-left rounded-xl text-destructive text-lg mt-8"
              >
                <LogOut className="w-6 h-6" />
                Logout
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none -z-10" />
        <div className="max-w-6xl mx-auto p-4 md:p-8 lg:p-12 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
