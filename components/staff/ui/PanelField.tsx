import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export default function PanelField({
  id,
  label,
  hint,
  children,
  className
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string
}) {
  return (
    <div className={cn("space-y-2 w-full", className)}>
      <Label
        htmlFor={id}
        className="text-[15px] overflow-visible font-semibold text-cobam-dark-blue block text-nowrap"
      >
        {label}
      </Label>
      {children}
      {hint ? <p className="text-sm leading-6 text-slate-400">{hint}</p> : null}
    </div>
  );
}