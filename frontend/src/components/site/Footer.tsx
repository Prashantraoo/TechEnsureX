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
    <footer className="bg-foreground text-background pt-20 pb-8">
      <div className="container">
        <div className="grid lg:grid-cols-6 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg">TechEnsureX</span>
            </div>
            <p className="mt-4 text-sm text-background/70 max-w-xs">
              AI-powered medical insurance & blockchain-verified smart claims for the next billion patients.
            </p>
            <form className="mt-6 flex gap-2 max-w-sm" onSubmit={(e) => e.preventDefault()}>
              <Input placeholder="Your work email" className="bg-background/10 border-background/20 text-background placeholder:text-background/50" />
              <Button className="bg-gradient-primary shrink-0"><Mail className="w-4 h-4" /></Button>
            </form>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-semibold text-sm mb-4">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-background/70 hover:text-background transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-background/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-background/60">© {new Date().getFullYear()} TechEnsureX. All rights reserved. Backed by IIT Bombay.</p>
          <div className="flex items-center gap-3">
            {[Twitter, Linkedin, Github].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-background/10 hover:bg-background/20 grid place-items-center transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
