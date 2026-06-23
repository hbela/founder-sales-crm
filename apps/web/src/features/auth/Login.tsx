import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/useAuth";
import { ApiError } from "@/lib/api";

export function Login() {
  const { status, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authed") void navigate({ to: "/dashboard", replace: true });
  }, [status, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (status === "authed") return null;

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">F</span>
          <span className="flex flex-col leading-none">
            <span className="font-semibold">Founder CRM</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/50">Sales Engine</span>
          </span>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-semibold leading-tight">
            Close more deals,<br /><span className="text-primary">faster.</span>
          </h2>
          <p className="mt-3 max-w-sm text-sidebar-foreground/70">
            The intelligence layer for your sales organization. Manage pipelines, automate outreach, and scale revenue with precision.
          </p>
          <ul className="mt-6 space-y-3">
            {["Real-time pipeline tracking", "Automated outreach queue", "Reusable email templates"].map((feat) => (
              <li key={feat} className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
                <Check className="h-4 w-4 text-primary" /> {feat}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-sidebar-foreground/40">© {new Date().getFullYear()} Founder Sales CRM</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-semibold">
            F
          </div>
          <CardTitle>{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>
            {mode === "login" ? "Sign in to your Founder Sales CRM" : "Set up the first admin account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={mode === "register" ? 8 : 1}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                First time setup?{" "}
                <button className="text-primary underline" onClick={() => setMode("register")}>
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button className="text-primary underline" onClick={() => setMode("login")}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
