import { Shield, Twitter, Linkedin, Github, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const cols = [
  { title: "Product", links: ["Features", "Dashboard", "Pricing", "Integrations", "Changelog"] },
  { title: "Company", links: ["About", "Careers", "Press", "Blog", "Contact"] },
  { title: "Resources", links: ["Documentation", "Help center", "API reference", "Status", "Security"] },
  { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookies", "Compliance", "DPA"] },
];

export default function Footer() {
  return (
    // Footer stays on the dark palette regardless of the site theme toggle —
    // premium sites (Stripe, Linear) keep bottom chrome dark even on a light page.
    <footer className="dark bg-background text-foreground pt-20 pb-8 border-t border-border">
      <div className="container">
        <div className="grid lg:grid-cols-6 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary shadow-soft grid place-items-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">TechEnsureX</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              AI-powered medical insurance & secure smart claims for the next billion patients.
            </p>
            <form className="mt-6 flex gap-2 max-w-sm" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="footer-email" className="sr-only">Work email</label>
              <Input id="footer-email" type="email" placeholder="Your work email" className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground" />
              <Button className="bg-gradient-primary shrink-0" aria-label="Subscribe"><Mail className="w-4 h-4" /></Button>
            </form>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-semibold text-sm mb-4">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} TechEnsureX. All rights reserved. Backed by IIT Bombay.</p>
          <div className="flex items-center gap-3">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-muted/40 hover:bg-muted/70 grid place-items-center transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
