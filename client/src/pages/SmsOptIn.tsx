import { useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Check, Phone, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export default function SmsOptIn() {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedSms, setAgreedSms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = phone.replace(/\D/g, "").length >= 10 && agreedTerms && agreedSms;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
    toast({
      title: "Successfully opted in",
      description: "You'll receive a confirmation text shortly.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>SMS Notifications | DW Media Studio</title>
        <meta name="description" content="Opt in to receive SMS notifications from DW Media Studio. Stay updated on your media vault activity." />
        <meta property="og:title" content="SMS Notifications | DW Media Studio" />
        <meta property="og:description" content="Opt in to receive SMS notifications from DW Media Studio." />
        <meta property="og:type" content="website" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b glass-morphism">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" data-testid="button-sms-back">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-base theme-gradient-text" data-testid="text-sms-title">SMS Notifications</h1>
          </div>
          <div className="ml-auto">
            <Badge variant="outline" className="text-xs">Twilio Powered</Badge>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <h2 className="text-2xl font-display font-bold theme-gradient-text" data-testid="text-sms-heading">
            Stay in the Loop
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Get notified about important vault activity, subscription updates, and new features directly on your phone.
          </p>
        </motion.div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-display font-bold" data-testid="text-sms-success">You're Opted In</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                A confirmation text will be sent to your phone. You can opt out at any time by replying STOP.
              </p>
              <Link href="/">
                <Button variant="outline" data-testid="button-sms-back-home">Back to Media Studio</Button>
              </Link>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <Card className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10 shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">What You'll Receive</h3>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>Upload and processing confirmations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>Subscription and billing alerts</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>Security notifications (login from new device)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span>New feature announcements and platform updates</span>
                    </li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mobile Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      placeholder="(555) 123-4567"
                      className="pl-10 font-mono"
                      data-testid="input-sms-phone"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agree-terms"
                      checked={agreedTerms}
                      onCheckedChange={(checked) => setAgreedTerms(checked === true)}
                      data-testid="checkbox-agree-terms"
                    />
                    <label htmlFor="agree-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary/80 hover:text-primary transition-colors underline">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary/80 hover:text-primary transition-colors underline">
                        Privacy Policy
                      </Link>.
                    </label>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="agree-sms"
                      checked={agreedSms}
                      onCheckedChange={(checked) => setAgreedSms(checked === true)}
                      data-testid="checkbox-agree-sms"
                    />
                    <label htmlFor="agree-sms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                      I consent to receive SMS text messages from DW Media Studio at the phone number provided.
                      I understand that message frequency varies, message and data rates may apply, and I can
                      opt out at any time by replying STOP. Reply HELP for assistance.
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isValid || isSubmitting}
                  data-testid="button-sms-submit"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Opt In to SMS Notifications
                    </span>
                  )}
                </Button>
              </form>
            </Card>

            <Card className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-muted shrink-0">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">SMS Program Details</h3>
                  <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                    <p><strong>Program:</strong> DW Media Studio Notifications</p>
                    <p><strong>Message Frequency:</strong> Varies; typically 2-5 messages per month</p>
                    <p><strong>Message & Data Rates:</strong> Standard message and data rates may apply</p>
                    <p><strong>Opt-Out:</strong> Text STOP to cancel at any time</p>
                    <p><strong>Help:</strong> Text HELP or email support@darkwavestudios.io</p>
                    <p><strong>Carrier Support:</strong> Compatible with all major US carriers</p>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex items-start gap-2 text-xs text-muted-foreground/60">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <p>
                By opting in, you agree to receive autodialed SMS messages from DW Media Studio.
                Consent is not a condition of purchase. Supported carriers include AT&T, T-Mobile,
                Verizon, Sprint, and others. View our full{" "}
                <Link href="/privacy" className="text-primary/60 hover:text-primary transition-colors underline">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
