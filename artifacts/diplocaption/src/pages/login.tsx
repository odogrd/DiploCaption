import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Compass, Loader2, Eye, EyeOff, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  const [serverDown, setServerDown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useLogin();
  const queryClient = useQueryClient();

  const isNetworkError = (err: unknown): boolean =>
    err instanceof Error &&
    !("status" in err) &&
    (err.message.toLowerCase().includes("fetch") ||
      err.message.toLowerCase().includes("network") ||
      err.message.toLowerCase().includes("failed"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setServerDown(false);

    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          setLocation("/");
        },
        onError: (err: unknown) => {
          if (isNetworkError(err)) {
            setServerDown(true);
            setError("");
          } else {
            const status = err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : null;
            if (status === 401) {
              setError("Invalid credentials. Please try again.");
            } else {
              setError("Something went wrong. Please try again.");
            }
          }
        }
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background image loaded via Vite public directory */}
      <img 
        src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
        alt="Abstract Intelligence Dashboard Background" 
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 glass-panel rounded-3xl"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
            <Compass className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-4xl font-bold mb-3 tracking-tight">DiploCaption</h1>
          <p className="text-muted-foreground font-sans text-sm tracking-wide uppercase">Strategic Intelligence Suite</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {serverDown && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-sm">
              <div className="flex items-center gap-2 mb-1">
                <ServerCrash className="w-4 h-4 shrink-0" />
                <span className="font-semibold">Server is starting up</span>
              </div>
              <p className="text-amber-400/80 text-xs leading-relaxed">
                The API server is coming online. Wait a few seconds, then try again.
              </p>
            </div>
          )}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Operator ID
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans placeholder:text-white/20"
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Passcode
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-12 text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-sans placeholder:text-white/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-bold tracking-wide mt-4" 
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "AUTHENTICATE"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
