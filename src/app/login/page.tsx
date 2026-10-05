"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await signIn("email-otp", { email: cleanEmail });
      setStep("code");
      toast.success("Login code sent! Please check your inbox (and spam folder).");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not send login code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await signIn("email-otp", { email: cleanEmail, code: code.trim() });
    } catch {
      toast.error("Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  async function loginPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      await signIn("password", { email: cleanEmail, password, flow: "signIn" });
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      if (msg.includes("InvalidAccountId")) {
        toast.error(
          "Account not found or password login not set up for this email. Please contact your instructor.",
        );
      } else {
        toast.error("Invalid email or password.");
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
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Classly</CardTitle>
          <CardDescription>
            Calculus course portal — sign in with the email your instructor added.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="code">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="code">Email code</TabsTrigger>
              <TabsTrigger value="password">Password</TabsTrigger>
            </TabsList>
            <TabsContent value="code" className="space-y-4 pt-4">
              {step === "email" ? (
                <form onSubmit={sendCode} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Send login code
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyCode} className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Code sent to <strong>{email}</strong>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="code">6-digit code</Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    Sign in
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setStep("email")}
                  >
                    Use a different email
                  </Button>
                </form>
              )}
            </TabsContent>
            <TabsContent value="password" className="space-y-4 pt-4">
              <form onSubmit={loginPassword} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pw-email">Email</Label>
                  <Input
                    id="pw-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw">Password</Label>
                  <PasswordInput
                    id="pw"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Sign in
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
