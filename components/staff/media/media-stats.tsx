import { Database, FileText, HardDrive, ImageIcon, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { MediaListResult } from "@/features/media/types";
import { formatBytes } from "./utils";

type MediaStatsProps = {
  stats: MediaListResult["stats"] | null;
};

const statItems = [
  {
    key: "total",
    label: "Fichiers",
    icon: Database,
  },
  {
    key: "images",
    label: "Images",
    icon: ImageIcon,
  },
  {
    key: "videos",
    label: "Videos",
    icon: Video,
  },
  {
    key: "documents",
    label: "Documents",
    icon: FileText,
  },
] as const;

export default function MediaStats({ stats }: MediaStatsProps) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border border-slate-200">
      <CardContent className="grid gap-5 px-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,2fr)] md:px-6">
          <div className="flex flex-col justify-center ml-4">
            <p className="inline-flex text-sm font-medium text-slate-500 gap-2 items-center">
            <HardDrive className="h-4 w-4" />
            Volume cumulé
            </p>
            <p className="mt-2 text-2xl font-bold text-cobam-dark-blue">
              {formatBytes(stats?.totalSizeBytes ?? 0)}
            </p>
          </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {statItems.map((item) => {
            const Icon = item.icon;
            const value = stats?.[item.key] ?? 0;

            return (
              <div
                key={item.key}
                className="rounded-3xl border border-slate-200 bg-white px-4 py-4"
              >
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
                <p className="mt-2 text-2xl font-bold text-cobam-dark-blue">
                  {value}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
