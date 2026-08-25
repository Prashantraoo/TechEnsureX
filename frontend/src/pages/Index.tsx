import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import Features from "@/components/site/Features";
import About from "@/components/site/About";
import HowItWorks from "@/components/site/HowItWorks";
import Security from "@/components/site/Security";
import Stats from "@/components/site/Stats";
import Testimonials from "@/components/site/Testimonials";
import Pricing from "@/components/site/Pricing";
import CTA from "@/components/site/CTA";
import Footer from "@/components/site/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main>
        <h1 className="sr-only">TechEnsureX — AI-Powered Medical Insurance & Smart Claim Settlement</h1>
        <Hero />
        <Features />
        <HowItWorks />
        <Security />
        <About />
        <Stats />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
