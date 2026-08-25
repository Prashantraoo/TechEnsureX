import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { label: "Product", href: "/#product" },
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how" },
  { label: "Security", href: "/#security" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
        <Link to="/" className="flex items-center gap-2.5 group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary shadow-soft grid place-items-center transition-transform duration-300 group-hover:scale-105">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <span className="font-display font-extrabold text-lg tracking-tight">
            Tech<span className="text-primary">EnsureX</span>
          </span>
        </Link>

        <ul className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="block px-3.5 py-2 rounded-full text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out-strong hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden lg:flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link to="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-soft">
            <Link to="/sign-up">Get Started</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <button
            className="p-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }}
            className="lg:hidden glass-strong border-t border-border overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-2.5 px-3 -mx-3 rounded-lg text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex gap-2 pt-3">
                <Button asChild variant="outline" className="flex-1"><Link to="/sign-in">Sign in</Link></Button>
                <Button asChild className="flex-1 bg-gradient-primary"><Link to="/sign-up">Get Started</Link></Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
