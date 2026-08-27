import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";
import DashboardLayout from "./components/dashboard/DashboardLayout.tsx";
import DashboardHome from "./pages/dashboard/DashboardHome.tsx";
import InsurancePlans from "./pages/dashboard/InsurancePlans.tsx";
import Claims from "./pages/dashboard/Claims.tsx";
import HealthReport from "./pages/dashboard/HealthReport.tsx";
import Settlement from "./pages/dashboard/Settlement.tsx";
import MedicalHistory from "./pages/dashboard/MedicalHistory.tsx";
import Assistant from "./pages/dashboard/Assistant.tsx";
import Notifications from "./pages/dashboard/Notifications.tsx";
import Billing from "./pages/dashboard/Billing.tsx";
import SettingsPage from "./pages/dashboard/Settings.tsx";
import Admin from "./pages/dashboard/Admin.tsx";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Lenis-driven inertial smooth scroll powers the marketing page's
                GSAP ScrollTrigger reveals/parallax and is scoped to just that
                route — everywhere else (auth, dashboard) needs plain native
                scrolling so nested scroll containers like the sidebar nav and
                AI chat panes respond correctly to wheel/trackpad input instead
                of having it hijacked by a document-level smooth-scroll. */}
            <Route path="/" element={<SmoothScroll><Index /></SmoothScroll>} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="plans" element={<InsurancePlans />} />
              <Route path="claims" element={<Claims />} />
              <Route path="health-report" element={<HealthReport />} />
              <Route path="settlement" element={<Settlement />} />
              <Route path="history" element={<MedicalHistory />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
