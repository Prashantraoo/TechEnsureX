import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative text-center max-w-lg"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 16, stiffness: 260 }}
          className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-primary grid place-items-center"
        >
          <Shield className="w-10 h-10 text-primary-foreground" />
        </motion.div>

        <p className="display-text text-7xl sm:text-8xl font-extrabold text-primary mb-2">404</p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-3">This page took an unscheduled leave</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page <span className="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">{location.pathname}</span> doesn't
          exist, or you may not have access to it.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 shadow-soft">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" /> Back to home
            </Link>
          </Button>
          <Button size="lg" variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Go back
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
