"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { StaffSelectOption } from "./PanelSelect";

const EMPTY_SELECT_VALUE = "__staff_search_select_empty__";

export default function StaffSearchSelect({
  value,
  onValueChange,
  options,
  placeholder = "Sélectionner...",
  emptyLabel,
  searchPlaceholder = "Rechercher...",
  noResultsLabel = "Aucun résultat",
  disabled = false,
  fullWidth = false,
  triggerClassName,
  contentClassName,
  id,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: StaffSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  noResultsLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  id?: string
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  const handleSelect = (nextValue: string) => {
    onValueChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-12 justify-between rounded-md border-slate-300 bg-white px-4 text-left font-normal text-slate-700 hover:bg-white",
            fullWidth ? "w-full" : "w-auto min-w-[16rem]",
            triggerClassName,
          )}
        >
          <span className="truncate">
            {selectedOption?.label ?? (value ? `#${value}` : emptyLabel ?? placeholder)}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0",
          contentClassName,
        )}
      >
        <div className="border-b border-slate-200 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 border-slate-300 pl-9"
            />
          </div>
        </div>

        <div id={id} className="max-h-72 overflow-y-auto p-1.5">
          {emptyLabel ? (
            <button
              type="button"
              onClick={() => handleSelect(EMPTY_SELECT_VALUE)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-100"
            >
              <span>{emptyLabel}</span>
              {value === "" ? <Check className="h-4 w-4 text-cobam-water-blue" /> : null}
            </button>
          ) : null}

          {filteredOptions.length === 0 ? (
            <div className="px-3 py-5 text-sm text-slate-500">{noResultsLabel}</div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                    option.disabled
                      ? "cursor-not-allowed opacity-45"
                      : "text-slate-700 hover:bg-slate-100",
                    isSelected ? "bg-slate-100 text-cobam-dark-blue" : "",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <Check className="ml-3 h-4 w-4 shrink-0 text-cobam-water-blue" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
