import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import PanelTitle from "./PanelTitle";

export default function Panel({
    pretitle = "",
    title,
    description = "",
    children,
    className,
    allowOverflow = false,
}: {
    className?: string;
    pretitle: string;
    title: string;
    description?: string;
    children: ReactNode[] | ReactNode;
    allowOverflow?: boolean;
}) {
    return (
    <section className={cn(
        "max-w-256 rounded-2xl border border-slate-200 bg-white shadow-sm",
        className
    )}>
        <PanelTitle pretitle={pretitle} title={title} description={description} />
        <div
            className={cn(
                "space-y-5 p-5 sm:p-6",
                allowOverflow ? "overflow-visible" : "overflow-hidden",
            )}
        >
            {children}
        </div>
    </section>
    );
}
