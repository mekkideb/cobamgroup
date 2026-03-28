"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import type { ProductMediaDto } from "@/features/products/types";
import { cn } from "@/lib/utils";
import ProductMediaPickerDialog from "./ProductMediaPickerDialog";
import ProductMediaTile from "./ProductMediaTile";

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function ProductMediaGrid({
  items,
  onChange,
  title = "Médias",
  description = "Optionnel : ajoutez des médias si nécessaire, puis glissez-les pour réorganiser leur ordre.",
}: {
  items: ProductMediaDto[];
  onChange: (items: ProductMediaDto[]) => void;
  title?: string;
  description?: string;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-cobam-dark-blue">{title}</p>
        <p className="text-sm leading-6 text-slate-500">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((media, index) => (
          <ProductMediaTile
            key={media.id}
            media={media}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            onRemove={() =>
              onChange(items.filter((item) => item.id !== media.id))
            }
            onDragStart={() => {
              setDraggedIndex(index);
              setDragOverIndex(index);
            }}
            onDragOver={() => setDragOverIndex(index)}
            onDrop={() => {
              if (draggedIndex == null) {
                return;
              }

              onChange(moveItem(items, draggedIndex, index));
              setDraggedIndex(null);
              setDragOverIndex(null);
            }}
            onDragEnd={() => {
              setDraggedIndex(null);
              setDragOverIndex(null);
            }}
          />
        ))}

        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className={cn(
            "group flex aspect-square flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center transition hover:border-cobam-water-blue hover:bg-cobam-water-blue/5",
            items.length === 0 ? "min-h-52" : "",
          )}
        >
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-cobam-water-blue shadow-sm transition group-hover:border-cobam-water-blue/30">
            <ImagePlus className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold text-cobam-dark-blue">
            Ajouter un média
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Optionnel : image, vidéo ou document
          </p>
        </button>
      </div>

      <ProductMediaPickerDialog
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        title="Ajouter un média de variante"
        description="Optionnel : choisissez un média existant ou importez-en un nouveau pour cette variante."
        excludedMediaIds={items.map((item) => item.id)}
        onSelect={(media) => {
          onChange([...items, media]);
          setIsPickerOpen(false);
        }}
      />
    </div>
  );
}
