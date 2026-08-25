import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  /** Optional right-aligned control, e.g. the password show/hide toggle. */
  rightSlot?: React.ReactNode;
}

/** A labeled-icon input used across the auth forms (email, password, name) — one place for the consistent height, icon placement, and focus treatment. */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon: Icon, rightSlot, className, ...props }, ref) => (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={ref}
        className={cn(
          "h-[52px] rounded-xl pl-10 transition-colors focus-visible:border-primary",
          rightSlot && "pr-11",
          className,
        )}
        {...props}
      />
      {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
    </div>
  ),
);
AuthInput.displayName = "AuthInput";
