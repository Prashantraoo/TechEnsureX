import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.7 }}
          className="relative rounded-[2.5rem] overflow-hidden bg-foreground text-background p-10 sm:p-16 lg:p-20 text-center"
        >
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/5 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Limited launch offer
            </div>
            <h2 className="display-text text-4xl sm:text-5xl lg:text-7xl font-extrabold max-w-4xl mx-auto leading-[1]">
              Ready to settle claims<br />
              <span className="font-serif-italic font-normal">in minutes,</span> not weeks?
            </h2>
            <p className="mt-6 text-lg text-white/85 max-w-2xl mx-auto">
              Join 95,000+ patients and 200+ insurers transforming healthcare claims with AI.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3 justify-center">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 h-12 px-8 text-base font-semibold">
                <Link to="/sign-up">Start free trial <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-transparent border-2 border-white/40 text-white hover:bg-white hover:text-primary h-12 px-8 text-base">
                <Link to="/dashboard">Book a demo</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-white/70 font-mono">No credit card · Cancel anytime · 14-day trial</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
