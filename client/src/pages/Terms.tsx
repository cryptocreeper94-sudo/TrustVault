import { Link } from "wouter";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_UPDATED = "February 18, 2026";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Terms of Service | TrustVault</title>
        <meta name="description" content="TrustVault terms of service. Read the terms and conditions for using our platform." />
        <meta property="og:title" content="Terms of Service | TrustVault" />
        <meta property="og:description" content="Read the terms and conditions for using TrustVault." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://dw-media-studio.replit.app/terms" />
        <meta property="og:image" content="/icon-512.png" />
        <meta property="og:site_name" content="TrustVault" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Terms of Service | TrustVault" />
        <meta name="twitter:description" content="Read the terms and conditions for using TrustVault." />
        <meta name="twitter:image" content="/icon-512.png" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b glass-morphism">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" data-testid="button-terms-back">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-base theme-gradient-text" data-testid="text-terms-title">Terms of Service</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert prose-sm max-w-none space-y-6"
        >
          <p className="text-xs text-muted-foreground" data-testid="text-terms-updated">Last updated: {LAST_UPDATED}</p>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using TrustVault ("the Service"), a product of Dark Wave Studios,
              you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these
              Terms, you may not access or use the Service. These Terms apply to all users, including
              visitors, registered users, and subscribers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              TrustVault is a universal media vault platform that allows users to upload, store,
              organize, edit, and preview digital media files including images, audio, video, and documents.
              The Service includes media editing tools, AI-powered features, collection management,
              and integration with the broader TrustLayer/Dark Wave Studios ecosystem.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">3. User Accounts</h2>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>You must be at least 13 years old to use the Service</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for all activity that occurs under your account</li>
              <li>You must notify us immediately of any unauthorized use of your account</li>
              <li>Accounts are created via invitation only; sharing invite codes is at your discretion but
                each code may only be used once</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">4. Subscriptions and Payments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service offers multiple subscription tiers (Free, Personal, Pro, and Studio).
              Paid subscriptions are billed monthly or annually through Stripe. By subscribing to a
              paid plan, you agree to the following:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Subscription fees are charged in advance on a recurring basis</li>
              <li>You authorize us to charge your payment method on file for all applicable fees</li>
              <li>Prices are listed in US Dollars and may be updated with notice</li>
              <li>You may cancel your subscription at any time through the Stripe Customer Portal</li>
              <li>Cancellation takes effect at the end of the current billing period</li>
              <li>Refunds are handled on a case-by-case basis; contact support for assistance</li>
              <li>Downgrading may result in loss of access to features available in higher tiers</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">5. Acceptable Use</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Upload content that infringes on intellectual property rights of others</li>
              <li>Upload malicious files, malware, or any harmful content</li>
              <li>Attempt to access other users' tenant spaces or data</li>
              <li>Use the Service for any illegal purpose</li>
              <li>Interfere with or disrupt the Service's infrastructure</li>
              <li>Reverse engineer or attempt to extract source code from the Service</li>
              <li>Use automated tools to scrape or extract data from the Service</li>
              <li>Share your account credentials with unauthorized individuals</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">6. Your Content</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain all ownership rights to the content you upload to the Service. By uploading
              content, you grant us a limited license to store, process, and display your content
              solely for the purpose of providing the Service to you. We do not claim ownership
              of your media files. You are solely responsible for ensuring you have the right to
              upload and store any content you add to the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">7. AI-Powered Features</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The Service includes AI-powered features such as auto-tagging, smart search, caption
              generation, and content suggestions. These features process your media to provide
              functionality. AI-generated results are provided "as-is" and may not always be accurate.
              By using AI features, you acknowledge that your media may be processed by third-party
              AI services (OpenAI) in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">8. SMS Communications</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you opt in to SMS notifications, you agree to receive text messages from TrustVault.
              Message frequency varies. Message and data rates may apply. You can opt out at any time
              by texting STOP. For help, text HELP or contact support. See our{" "}
              <Link href="/sms-optin" className="text-primary/80 hover:text-primary transition-colors underline">SMS opt-in page</Link>{" "}
              for full details on our messaging program.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">9. TrustLayer Ecosystem</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              TrustVault is part of the TrustLayer / Dark Wave Studios ecosystem. Paid subscribers
              may receive TrustLayer membership benefits. Cross-platform single sign-on (SSO) is available
              across ecosystem applications. Use of other ecosystem services is governed by their
              respective terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">10. Service Availability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted access to the
              Service. We may perform scheduled maintenance, updates, or modifications that temporarily
              affect availability. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">11. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these Terms.
              You may delete your account at any time by contacting support. Upon termination, your
              right to use the Service ceases immediately. We may retain certain data as required
              by law or for legitimate business purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">12. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, DARK WAVE STUDIOS SHALL NOT BE LIABLE FOR ANY
              INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR
              USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN
              THE TWELVE MONTHS PRECEDING THE CLAIM.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">13. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will provide notice of
              significant changes by updating the "Last updated" date and, where possible, notifying
              you via email or in-app notification. Your continued use of the Service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-bold text-foreground">14. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these Terms, contact us at:
            </p>
            <p className="text-sm text-muted-foreground">
              Dark Wave Studios<br />
              Email: legal@darkwavestudios.io<br />
              Web: <a href="https://darkwavestudios.io" target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary transition-colors">darkwavestudios.io</a>
            </p>
          </section>

          <div className="pt-6 border-t border-border/50 flex items-center gap-4 flex-wrap">
            <Link href="/privacy">
              <Button variant="outline" size="sm" data-testid="link-to-privacy">Privacy Policy</Button>
            </Link>
            <Link href="/sms-optin">
              <Button variant="outline" size="sm" data-testid="link-to-sms">SMS Notifications</Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="link-to-home">Back to TrustVault</Button>
            </Link>
          </div>
        </motion.article>
      </main>
    </div>
  );
}
