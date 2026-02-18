import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_UPDATED = "February 18, 2026";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Privacy Policy | DW Media Studio</title>
        <meta name="description" content="DW Media Studio privacy policy. Learn how we collect, use, and protect your personal information." />
        <meta property="og:title" content="Privacy Policy | DW Media Studio" />
        <meta property="og:description" content="Learn how DW Media Studio collects, uses, and protects your personal information." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dw-media-studio.replit.app/privacy" />
        <meta property="og:image" content="/icon-512.png" />
        <meta property="og:site_name" content="DW Media Studio" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Privacy Policy | DW Media Studio" />
        <meta name="twitter:description" content="Learn how DW Media Studio collects, uses, and protects your personal information." />
        <meta name="twitter:image" content="/icon-512.png" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b glass-morphism">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" data-testid="button-privacy-back">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-base theme-gradient-text" data-testid="text-privacy-title">Privacy Policy</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert prose-sm max-w-none space-y-6"
        >
          <p className="text-xs text-muted-foreground" data-testid="text-privacy-updated">Last updated: {LAST_UPDATED}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground" data-testid="text-section-intro">Introduction</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              DW Media Studio ("we," "our," or "us"), a product of Dark Wave Studios, is committed to protecting
              your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our media vault platform, related services, and mobile applications
              (collectively, the "Service").
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Information We Collect</h2>
            <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Name and email address when you create an account</li>
              <li>Payment information processed securely through Stripe (we do not store card details)</li>
              <li>Phone number if you opt in to SMS notifications</li>
              <li>Profile information you choose to provide</li>
            </ul>

            <h3 className="text-sm font-semibold text-foreground">Usage Data</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Media files you upload to your vault (stored securely in your private tenant space)</li>
              <li>Metadata associated with your media (tags, descriptions, collections)</li>
              <li>Device information, browser type, and IP address</li>
              <li>Usage patterns and feature interactions for service improvement</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">How We Use Your Information</h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>To provide, maintain, and improve the Service</li>
              <li>To process subscriptions and payments through Stripe</li>
              <li>To send transactional emails (purchase confirmations, subscription changes)</li>
              <li>To send SMS notifications if you have opted in</li>
              <li>To provide AI-powered features (auto-tagging, smart search, captions)</li>
              <li>To provide customer support and respond to inquiries</li>
              <li>To detect, prevent, and address technical issues or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Data Storage and Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your media files are stored in secure cloud object storage with tenant isolation. Each user's
              data is separated and cannot be accessed by other users. We use industry-standard encryption
              for data in transit (TLS/SSL) and implement secure authentication with hashed passwords.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Payment processing is handled entirely by Stripe, a PCI DSS Level 1 certified payment
              processor. We never store your credit card numbers or sensitive payment details on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Multi-Tenant Architecture</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              DW Media Studio uses a multi-tenant architecture where each user's data is logically isolated.
              Your media files, collections, and personal data are accessible only to you and authorized
              administrators. Admin users may access tenant spaces for support and maintenance purposes only.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Third-Party Services</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">We integrate with the following third-party services:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li><strong>Stripe</strong> — Payment processing and subscription management</li>
              <li><strong>OpenAI</strong> — AI-powered features (auto-tagging, smart search, content generation)</li>
              <li><strong>ElevenLabs</strong> — Text-to-speech for the Spinny AI assistant</li>
              <li><strong>Resend</strong> — Transactional email delivery</li>
              <li><strong>Twilio</strong> — SMS notifications (opt-in only)</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each service processes data according to their own privacy policies. We recommend reviewing
              their policies for complete information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate personal information</li>
              <li>Request deletion of your account and associated data</li>
              <li>Opt out of SMS communications at any time by texting STOP</li>
              <li>Export your media files at any time</li>
              <li>Cancel your subscription through the Stripe Customer Portal</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Children's Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service is not directed to individuals under the age of 13. We do not knowingly collect
              personal information from children under 13. If we learn that we have collected personal
              information from a child under 13, we will take steps to delete such information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new Privacy Policy on this page and updating the "Last updated" date. Your
              continued use of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-sm text-muted-foreground">
              Dark Wave Studios<br />
              Email: privacy@darkwavestudios.io<br />
              Web: <a href="https://darkwavestudios.io" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors">darkwavestudios.io</a>
            </p>
          </section>

          <div className="pt-6 border-t border-border/50 flex items-center gap-4 flex-wrap">
            <Link href="/terms">
              <Button variant="outline" size="sm" data-testid="link-to-terms">Terms of Service</Button>
            </Link>
            <Link href="/sms-optin">
              <Button variant="outline" size="sm" data-testid="link-to-sms">SMS Notifications</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-to-home">Back to DW Media Studio</Button>
            </Link>
          </div>
        </motion.article>
      </main>
    </div>
  );
}
