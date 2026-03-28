import { Loader2 } from "lucide-react";

export default function Loading(){
    return (
        <div className="min-h-[40vh] w-full flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-cobam-water-blue" />
            Chargement en cours...
        </div>
    );
}