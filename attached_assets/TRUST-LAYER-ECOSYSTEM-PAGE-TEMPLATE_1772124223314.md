# Trust Layer Ecosystem Page — Universal Template

**For:** Any DarkWave Studios app that needs a Trust Layer Ecosystem directory page.
**Reference implementation:** GarageBot `/ecosystem` route.

---

## What This Is

A dedicated, non-intrusive page that displays the DarkWave Studios ecosystem directory widget. It's branded as "Trust Layer Ecosystem", serves as a quick reference for users to see all connected apps, and explains the SSO / blockchain verification / API features that tie the ecosystem together.

**Design principles:**
- Premium dark UI with subtle gradients and glow effects
- Fully mobile responsive (stacks cleanly on all screen sizes)
- Not floating, not a modal, not a sidebar — it's a proper page at `/ecosystem`
- Linked from the footer as "Trust Layer" (not shoved in the main nav)

---

## The Embed Widget

This is the core embed snippet from dwsc.io. It loads the ecosystem directory dynamically:

```html
<div id="dw-ecosystem-directory"></div>
<script src="https://dwsc.io/api/ecosystem/directory.js" data-theme="dark"></script>
```

For React/SPA apps, you must inject this dynamically via `useEffect` (see code below). For static HTML or server-rendered apps, you can drop it directly into the page markup.

---

## React/TypeScript Implementation (Copy-Paste Ready)

Replace `{{APP_NAME}}` with your app name (e.g., "Verdara", "ORBIT", "TrustShield").
Replace `{{APP_ROUTE}}` with your home route (usually "/").
Replace `{{PRIMARY_COLOR}}` with your app's primary accent color class (e.g., "cyan", "emerald", "violet", "amber").

```tsx
import { useEffect, useRef } from "react";
import { Link } from "wouter"; // or your router's Link component
import { ArrowLeft, Shield, Globe, ExternalLink, Fingerprint, Code2, Zap } from "lucide-react";

export default function Ecosystem() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Reset container and inject widget
    containerRef.current.innerHTML = '<div id="dw-ecosystem-directory"></div>';

    // Remove any existing script to prevent duplicates
    const existingScript = document.querySelector(
      'script[src="https://dwsc.io/api/ecosystem/directory.js"]'
    );
    if (existingScript) existingScript.remove();

    // Inject fresh script
    const script = document.createElement("script");
    script.src = "https://dwsc.io/api/ecosystem/directory.js";
    script.setAttribute("data-theme", "dark");
    script.async = true;
    containerRef.current.appendChild(script);

    // Cleanup on unmount
    return () => {
      const s = document.querySelector(
        'script[src="https://dwsc.io/api/ecosystem/directory.js"]'
      );
      if (s) s.remove();
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background, #0a0a0a)" }}>
      <div style={{ position: "relative", overflow: "hidden" }}>
        {/* Ambient glow - adjust color to match your app's primary */}
        <div
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(6,182,212,0.05), transparent, transparent)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 600, height: 300,
            background: "rgba(6,182,212,0.05)",
            borderRadius: "50%", filter: "blur(120px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", position: "relative", zIndex: 10 }}>

          {/* ---- HEADER ---- */}
          <div style={{ marginBottom: "2.5rem" }}>
            <Link href="{{APP_ROUTE}}" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#888", marginBottom: 24 }}>
              <ArrowLeft style={{ width: 16, height: 16 }} />
              Back to {{APP_NAME}}
            </Link>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
              {/* Trust Layer icon badge */}
              <div style={{
                width: 56, height: 56, borderRadius: 12,
                background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2))",
                border: "1px solid rgba(6,182,212,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 8px 24px rgba(6,182,212,0.1)",
              }}>
                <Shield style={{ width: 28, height: 28, color: "#22d3ee" }} />
              </div>
              <div>
                <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)", fontWeight: 700, letterSpacing: "-0.025em" }}>
                  <span style={{ background: "linear-gradient(to right, #22d3ee, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Trust Layer
                  </span>{" "}
                  <span style={{ color: "rgba(255,255,255,0.8)" }}>Ecosystem</span>
                </h1>
                <p style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)", color: "#888", marginTop: 4 }}>
                  Powered by DarkWave Studios
                </p>
              </div>
            </div>

            <p style={{ fontSize: "clamp(0.875rem, 2.5vw, 1rem)", color: "#888", maxWidth: 640, lineHeight: 1.6 }}>
              {{APP_NAME}} is part of the Trust Layer ecosystem — a network of apps built on
              verified identity, shared credentials, and blockchain-backed trust. Your single
              login works across every connected platform.
            </p>
          </div>

          {/* ---- DIRECTORY WIDGET ---- */}
          <div style={{
            background: "rgba(255,255,255,0.03)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(6,182,212,0.15)",
            borderRadius: 12, padding: "clamp(1rem, 3vw, 1.5rem)",
            marginBottom: "2.5rem",
            boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <Globe style={{ width: 16, height: 16, color: "#22d3ee" }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, textTransform: "uppercase", color: "#22d3ee", letterSpacing: "0.05em" }}>
                Connected Apps
              </h2>
            </div>
            <div ref={containerRef} style={{ minHeight: 200 }} />
          </div>

          {/* ---- FEATURE CARDS (3-column, stacks on mobile) ---- */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "clamp(0.75rem, 2vw, 1rem)",
            marginBottom: "2.5rem",
          }}>
            {/* SSO Card */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12, padding: "clamp(1rem, 3vw, 1.25rem)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <Fingerprint style={{ width: 16, height: 16, color: "#22d3ee" }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Single Sign-On</h3>
              <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                One set of credentials across all DarkWave apps. No redirects — each app
                has its own login, synced behind the scenes.
              </p>
            </div>

            {/* Blockchain Card */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12, padding: "clamp(1rem, 3vw, 1.25rem)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <Zap style={{ width: 16, height: 16, color: "#a78bfa" }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Blockchain Verified</h3>
              <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                Identity and credentials anchored on Solana. Tamper-proof verification
                for users, organizations, and digital assets.
              </p>
            </div>

            {/* API Card */}
            <div style={{
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 12, padding: "clamp(1rem, 3vw, 1.25rem)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <Code2 style={{ width: 16, height: 16, color: "#34d399" }} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Open API</h3>
              <p style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>
                Ecosystem API lets connected apps share data and alerts securely
                via JWT-authenticated endpoints.
              </p>
            </div>
          </div>

          {/* ---- FOOTER LINKS ---- */}
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.3)", paddingBottom: 16 }}>
            <a href="https://dwsc.io" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              dwsc.io
            </a>
            <span style={{ margin: "0 8px" }}>&bull;</span>
            <a href="https://tlid.io" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none" }}>
              tlid.io
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Plain HTML Version (No Framework)

For apps without React, or for static sites:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Trust Layer Ecosystem — {{APP_NAME}}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a; color: #e5e5e5;
      min-height: 100vh;
    }
    .ecosystem-page {
      max-width: 960px; margin: 0 auto;
      padding: clamp(1.5rem, 4vw, 3rem) 1rem;
    }
    .ecosystem-back {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 14px; color: #888; text-decoration: none;
      margin-bottom: 24px;
    }
    .ecosystem-back:hover { color: #22d3ee; }
    .ecosystem-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
    .ecosystem-icon {
      width: 56px; height: 56px; border-radius: 12px; flex-shrink: 0;
      background: linear-gradient(135deg, rgba(6,182,212,0.2), rgba(139,92,246,0.2));
      border: 1px solid rgba(6,182,212,0.3);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(6,182,212,0.1);
    }
    .ecosystem-icon svg { width: 28px; height: 28px; color: #22d3ee; }
    .ecosystem-title {
      font-size: clamp(1.5rem, 4vw, 1.875rem); font-weight: 700;
      letter-spacing: -0.025em;
    }
    .ecosystem-title .tl {
      background: linear-gradient(to right, #22d3ee, #67e8f9);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    .ecosystem-title .eco { color: rgba(255,255,255,0.8); }
    .ecosystem-subtitle { font-size: clamp(0.75rem, 2vw, 0.875rem); color: #888; margin-top: 4px; }
    .ecosystem-desc {
      font-size: clamp(0.875rem, 2.5vw, 1rem); color: #888;
      max-width: 640px; line-height: 1.6; margin-bottom: 2.5rem;
    }
    .ecosystem-widget-card {
      background: rgba(255,255,255,0.03); backdrop-filter: blur(8px);
      border: 1px solid rgba(6,182,212,0.15); border-radius: 12px;
      padding: clamp(1rem, 3vw, 1.5rem); margin-bottom: 2.5rem;
      box-shadow: 0 16px 48px rgba(0,0,0,0.2);
    }
    .ecosystem-widget-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px; padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      font-size: 14px; font-weight: 600; text-transform: uppercase;
      color: #22d3ee; letter-spacing: 0.05em;
    }
    .ecosystem-features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: clamp(0.75rem, 2vw, 1rem); margin-bottom: 2.5rem;
    }
    .ecosystem-feature-card {
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 12px; padding: clamp(1rem, 3vw, 1.25rem);
      transition: border-color 0.2s;
    }
    .ecosystem-feature-card:hover { border-color: rgba(6,182,212,0.2); }
    .ecosystem-feature-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
    }
    .ecosystem-feature-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
    .ecosystem-feature-card p { font-size: 12px; color: #888; line-height: 1.5; }
    .ecosystem-footer {
      text-align: center; font-size: 12px; color: rgba(255,255,255,0.3);
      padding-bottom: 16px;
    }
    .ecosystem-footer a { color: inherit; text-decoration: none; }
    .ecosystem-footer a:hover { color: #22d3ee; }
  </style>
</head>
<body>
  <div class="ecosystem-page">
    <a href="/" class="ecosystem-back">&larr; Back to {{APP_NAME}}</a>

    <div class="ecosystem-header">
      <div class="ecosystem-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <div>
        <h1 class="ecosystem-title">
          <span class="tl">Trust Layer</span> <span class="eco">Ecosystem</span>
        </h1>
        <p class="ecosystem-subtitle">Powered by DarkWave Studios</p>
      </div>
    </div>

    <p class="ecosystem-desc">
      {{APP_NAME}} is part of the Trust Layer ecosystem — a network of apps built on
      verified identity, shared credentials, and blockchain-backed trust. Your single
      login works across every connected platform.
    </p>

    <div class="ecosystem-widget-card">
      <div class="ecosystem-widget-header">Connected Apps</div>
      <div id="dw-ecosystem-directory"></div>
      <script src="https://dwsc.io/api/ecosystem/directory.js" data-theme="dark"></script>
    </div>

    <div class="ecosystem-features">
      <div class="ecosystem-feature-card">
        <div class="ecosystem-feature-icon" style="background:rgba(6,182,212,0.1);border:1px solid rgba(6,182,212,0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2"><path d="M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M2 21a8 8 0 0 1 10.434-7.62"/><path d="M15 21v-4a2 2 0 0 1 4 0v4"/><path d="M19 17h-4"/></svg>
        </div>
        <h3>Single Sign-On</h3>
        <p>One set of credentials across all DarkWave apps. No redirects — each app has its own login, synced behind the scenes.</p>
      </div>
      <div class="ecosystem-feature-card">
        <div class="ecosystem-feature-icon" style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h3>Blockchain Verified</h3>
        <p>Identity and credentials anchored on Solana. Tamper-proof verification for users, organizations, and digital assets.</p>
      </div>
      <div class="ecosystem-feature-card">
        <div class="ecosystem-feature-icon" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
        </div>
        <h3>Open API</h3>
        <p>Ecosystem API lets connected apps share data and alerts securely via JWT-authenticated endpoints.</p>
      </div>
    </div>

    <div class="ecosystem-footer">
      <a href="https://dwsc.io" target="_blank">dwsc.io</a>
      <span style="margin:0 8px">&bull;</span>
      <a href="https://tlid.io" target="_blank">tlid.io</a>
    </div>
  </div>
</body>
</html>
```

---

## Integration Checklist

For any DarkWave app adding this page:

1. **Create the page** using the React or HTML template above
2. **Replace `{{APP_NAME}}`** with the app's name (e.g., "Verdara", "ORBIT", "TrustShield")
3. **Replace `{{APP_ROUTE}}`** with the app's home route (usually "/")
4. **Register the route** at `/ecosystem` in your router
5. **Add a footer link** labeled "Trust Layer" with a shield icon pointing to `/ecosystem`
6. **Do NOT** put it in the main navigation — footer only, it's a reference page
7. **Theme:** Always use `data-theme="dark"` on the embed script
8. **Mobile:** The template is mobile-first — `clamp()` for font sizes, `auto-fit` grid for cards, responsive padding throughout. No fixed widths except max-width on the container.

## Design Specs

| Element | Value |
|---------|-------|
| Max container width | 960px |
| Background | App's dark background (#0a0a0a or equivalent) |
| Primary accent | Cyan (#22d3ee) for Trust Layer branding |
| Secondary accent | Purple (#a78bfa) for blockchain |
| Tertiary accent | Emerald (#34d399) for API |
| Ambient glow | Cyan at 5% opacity, 120px blur |
| Card backgrounds | White at 2-3% opacity with backdrop blur |
| Card borders | White at 5% opacity, cyan at 15% for widget card |
| Typography | System font stack or app's font |
| Mobile breakpoint | Cards stack at < 250px each (auto-fit handles it) |
| Footer link label | "Trust Layer" with Shield icon |

## Notes

- The embed widget at `https://dwsc.io/api/ecosystem/directory.js` is maintained centrally — when new apps are added to the ecosystem, all pages update automatically.
- The page should feel like a "passport" or "about our network" reference, not a primary feature.
- Keep it clean and minimal. Don't add extra CTAs or marketing copy beyond what's in the template.
