import { Shield, ChevronRight, HeartPulse, Droplet, Activity, Brain, CheckCircle2, Clock } from "lucide-react";
import { PhoneCarousel, type PhoneSlide } from "@/components/ui/phone-mockups-1-utils/phone-carousel";

function PlanRow({ tone, name, price }: { tone: "primary" | "destructive"; name: string; price: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0">
      <div className="flex items-center gap-2.5">
        <div
          className={
            tone === "primary"
              ? "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"
              : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive"
          }
        >
          <Shield className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-foreground">{name}</p>
          <p className="text-[9px] text-muted-foreground">{price}</p>
        </div>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
    </div>
  );
}

function ClaimRow({ hospital, amount, status }: { hospital: string; amount: string; status: "approved" | "processing" }) {
  const approved = status === "approved";
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary/15 text-secondary">
          {approved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
        </div>
        <div>
          <p className="text-[11px] font-semibold text-foreground">{hospital}</p>
          <p
            className={
              approved
                ? "text-[9px] font-medium text-success"
                : "text-[9px] font-medium text-warning"
            }
          >
            {approved ? "Approved" : "Processing"}
          </p>
        </div>
      </div>
      <p className="text-[10px] font-bold text-foreground">{amount}</p>
    </div>
  );
}

function VitalCard({ icon: Icon, label, value, tag }: { icon: typeof HeartPulse; label: string; value: string; tag: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/40 p-2.5">
      <div className="grid h-6 w-6 place-items-center rounded-md bg-accent/15 text-accent">
        <Icon className="h-3 w-3" />
      </div>
      <p className="mt-1.5 text-[8px] text-muted-foreground">{label}</p>
      <p className="text-[11px] font-bold text-foreground">{value}</p>
      <p className="text-[7px] font-medium text-success">{tag}</p>
    </div>
  );
}

function RiskBar({ label, pct, tag }: { label: string; pct: number; tag: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium text-foreground">{label}</span>
        <span className="text-[9px] font-semibold text-success">{tag}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-gradient-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const techEnsureXSlides: PhoneSlide[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    activeTab: 0,
    body: (
      <div className="flex h-full flex-col">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <p className="text-[8px] text-muted-foreground">Claims this year</p>
            <p className="text-base font-extrabold text-foreground">3</p>
          </div>
          <div className="rounded-xl bg-secondary/10 p-2.5">
            <p className="text-[8px] text-muted-foreground">Approved</p>
            <p className="text-base font-extrabold text-foreground">92%</p>
          </div>
        </div>
        <p className="mt-3 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Recent activity</p>
        <div className="mt-1">
          <ClaimRow hospital="Apollo Hospital" amount="₹45,000" status="approved" />
          <ClaimRow hospital="Max Healthcare" amount="₹12,000" status="processing" />
          <ClaimRow hospital="Fortis" amount="₹68,500" status="approved" />
        </div>
      </div>
    ),
  },
  {
    id: "plans",
    title: "Plans",
    activeTab: 3,
    body: (
      <div>
        <PlanRow tone="primary" name="Optima" price="₹10 L" />
        <PlanRow tone="primary" name="Suraksha" price="₹7.5 L" />
        <PlanRow tone="destructive" name="Complete Health" price="₹15 L" />
        <PlanRow tone="primary" name="ReAssure 2.0" price="₹10 L" />
      </div>
    ),
  },
  {
    id: "ai-report",
    title: "AI Report",
    activeTab: 2,
    body: (
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Vitals snapshot</p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <VitalCard icon={HeartPulse} label="Heart rate" value="73 bpm" tag="Normal" />
          <VitalCard icon={Droplet} label="Blood pressure" value="119/75" tag="Normal" />
          <VitalCard icon={Activity} label="Glucose" value="103 mg/dL" tag="Borderline" />
          <VitalCard icon={Brain} label="Stress index" value="Low" tag="Good" />
        </div>
        <p className="mt-3 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Risk assessment</p>
        <div className="mt-1.5 space-y-2.5">
          <RiskBar label="Cardiovascular" pct={18} tag="Low (18%)" />
          <RiskBar label="Hypertension" pct={17} tag="Low (17%)" />
        </div>
      </div>
    ),
  },
];

interface PhoneMockupProps {
  slides?: PhoneSlide[];
  className?: string;
}

/** TechEnsureX's product phone mockup, pre-loaded with real app screens. */
export default function PhoneMockup({ slides = techEnsureXSlides, className }: PhoneMockupProps) {
  return <PhoneCarousel slides={slides} className={className} />;
}
