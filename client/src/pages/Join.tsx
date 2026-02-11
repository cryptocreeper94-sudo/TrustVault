import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Lock, Eye, EyeOff, UserPlus, Mail, Loader2, Heart, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import trustlayerEmblem from "@assets/images/trustvault-emblem.png";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function Join() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { claimAccount, isClaimingAccount } = useAuth();
  const urlCode = new URLSearchParams(window.location.search).get("code") || "";
  const [inviteMode, setInviteMode] = useState(!!urlCode);
  const [inviteCode, setInviteCode] = useState(urlCode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter your name");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Please enter your email");
      return;
    }
    if (!password) {
      setErrorMsg("Please create a password");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords don't match");
      return;
    }

    if (inviteMode) {
      if (!inviteCode.trim()) {
        setErrorMsg("Please enter your invite code");
        return;
      }
      setIsSubmitting(true);
      try {
        await apiRequest("POST", "/api/join", {
          inviteCode: inviteCode.trim(),
          name: name.trim(),
          password,
          email: email.trim() || undefined,
        });
        toast({ title: "Welcome!", description: "Your vault is ready." });
        navigate("/");
      } catch (err: any) {
        let msg = "Something went wrong. Please try again.";
        try {
          if (typeof err?.message === "string") {
            const parsed = JSON.parse(err.message);
            msg = parsed.message || msg;
          }
        } catch {
          msg = err?.message || msg;
        }
        setErrorMsg(msg);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(true);
      try {
        await claimAccount({ name: name.trim(), password, email: email.trim() });
        toast({ title: "Welcome to the family vault!", description: "Your private space is ready." });
        navigate("/");
      } catch (err: any) {
        let msg = "Something went wrong. Please try again.";
        try {
          if (typeof err?.message === "string") {
            const parsed = JSON.parse(err.message);
            msg = parsed.message || msg;
          }
        } catch {
          msg = err?.message || msg;
        }
        if (msg.toLowerCase().includes("no account found")) {
          setErrorMsg("No family account found for that name. If you have an invite code, tap the link below to use it.");
        } else {
          setErrorMsg(msg);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const isBusy = isSubmitting || isClaimingAccount;

  return (
    <>
      <Helmet>
        <title>Join the Family Vault | DW Media Studio</title>
        <meta name="description" content="Set up your private media vault — a personal space for your photos, videos, and memories." />
      </Helmet>

      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px]" />
        </div>

        <div className="relative z-10 max-w-md mx-auto px-5 py-10 sm:py-16 flex flex-col items-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-8"
          >
            <img src={trustlayerEmblem} alt="DW Media Studio" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">DW Media Studio</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight mb-3" data-testid="text-join-title">
              {inviteMode ? "Create Your Vault" : "Welcome to the Family Vault"}
            </h1>
            {inviteMode ? (
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Enter your invite code to set up your private media space.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                  I built this for us. A private place to store and share our photos, videos, music, and memories. Your own personal space, always secure.
                </p>
                <p className="text-sm text-muted-foreground/70 flex items-center justify-center gap-1.5" data-testid="text-join-love-dad">
                  <Heart className="w-3.5 h-3.5 text-destructive" />
                  <span>Love, Dad</span>
                </p>
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full"
          >
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {inviteMode && (
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="Invite code"
                      className="pl-10 h-12 text-base font-mono tracking-widest uppercase"
                      data-testid="input-join-code"
                      disabled={isBusy}
                      autoFocus
                    />
                  </div>
                )}

                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your first name"
                    className="pl-10 h-12 text-base"
                    data-testid="input-join-name"
                    disabled={isBusy}
                    autoFocus={!inviteMode}
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    className="pl-10 h-12 text-base"
                    data-testid="input-join-email"
                    disabled={isBusy}
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    className="pl-10 pr-10 h-12 text-base"
                    data-testid="input-join-password"
                    disabled={isBusy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    data-testid="button-join-toggle-password"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="pl-10 h-12 text-base"
                    data-testid="input-join-confirm"
                    disabled={isBusy}
                  />
                </div>

                {errorMsg && (
                  <p className="text-sm text-destructive text-center" data-testid="text-join-error">{errorMsg}</p>
                )}

                <Button type="submit" className="w-full h-12 gap-2" disabled={isBusy} data-testid="button-join-submit">
                  {isBusy ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {inviteMode ? "Create My Vault" : "Set Up My Vault"}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
                  Password must be 8+ characters with at least one uppercase letter and one special character.
                </p>
              </form>
            </Card>

            <div className="flex flex-col items-center gap-2 mt-4">
              <p className="text-center text-xs text-muted-foreground">
                Already set up your account?{" "}
                <Link href="/" className="text-primary hover:underline" data-testid="link-join-login">
                  Log in
                </Link>
              </p>
              <button
                type="button"
                onClick={() => { setInviteMode(!inviteMode); setErrorMsg(""); setInviteCode(""); }}
                className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors"
                data-testid="button-join-toggle-mode"
              >
                {inviteMode ? "Family member? Set up here" : "Have an invite code?"}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
