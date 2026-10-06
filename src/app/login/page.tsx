"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [tab, setTab] = useState<"signIn" | "signUp">("signIn");

  // Sign In fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = loginEmail.trim().toLowerCase();
    try {
      await signIn("password", {
        email: cleanEmail,
        password: loginPassword,
        flow: "signIn",
      });
      toast.success("Welcome back!");
      router.push("/courses");
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (
        msg.includes("InvalidAccountId") ||
        msg.includes("InvalidSecret") ||
        msg.includes("Invalid credentials") ||
        msg.includes("Invalid password")
      ) {
        toast.error("Invalid email or password. Please check your credentials or sign up.");
      } else {
        toast.error("Sign in failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();

    if (!cleanName) {
      toast.error("Please enter your name");
      return;
    }
    if (signupPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      await signIn("password", {
        name: cleanName,
        email: cleanEmail,
        password: signupPassword,
        flow: "signUp",
      });
      toast.success("Account created! Welcome to Classly.");
      router.push("/courses");
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("already exists")) {
        toast.error("An account with this email already exists. Please log in.");
        setTab("signIn");
        setLoginEmail(cleanEmail);
      } else {
        toast.error(
          err instanceof Error ? err.message : "Could not create account. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <Card className="w-full max-w-md shadow-lg border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-1">
            <GraduationCap className="size-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Classly</CardTitle>
          <CardDescription>
            Interactive learning portal — sign in to continue or create a new student account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signIn" | "signUp")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signIn" className="gap-2">
                <LogIn className="size-3.5" />
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signUp" className="gap-2">
                <UserPlus className="size-3.5" />
                Sign Up
              </TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signIn" className="space-y-4 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="student@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <PasswordInput
                    id="login-password"
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("signUp");
                      if (loginEmail) setSignupEmail(loginEmail);
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign up now
                  </button>
                </p>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signUp" className="space-y-4 pt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Your name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="student@example.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password (min 8 characters)</Label>
                  <PasswordInput
                    id="signup-password"
                    required
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account…" : "Create Student Account"}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-2">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setTab("signIn");
                      if (signupEmail) setLoginEmail(signupEmail);
                    }}
                    className="text-primary font-medium hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
