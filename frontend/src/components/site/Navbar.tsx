import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/#pricing" },
  { label: "About", href: "/#about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled ? "py-3" : "py-5"
      }`}
    >
      <nav className={`container flex items-center justify-between rounded-2xl transition-all duration-500 ${
        scrolled ? "glass-strong shadow-card px-5 py-2.5" : "px-2 py-2"
      }`}>
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-primary blur-md opacity-50 -z-10" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-tight">
            Tech<span className="text-gradient-primary">EnsureX</span>
          </span>
        </Link>

        <ul className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-0 after:h-0.5 after:bg-primary after:transition-all hover:after:w-full"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-soft">
            <Link to="/sign-up">Get Started</Link>
          </Button>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass border-t border-border"
        >
          <div className="container py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)} className="py-2 text-sm font-medium">
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" className="flex-1"><Link to="/sign-in">Sign in</Link></Button>
              <Button asChild className="flex-1 bg-gradient-primary"><Link to="/sign-up">Get Started</Link></Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
