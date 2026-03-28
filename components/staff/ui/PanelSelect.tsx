import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_SELECT_VALUE = "__staff_empty__";

export type StaffSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type StaffSelectGroupedOption = {
  label: string
  items: StaffSelectOption[]
}

export default function PanelSelect({
  value,
  onValueChange,
  options,
  groupedOptions,
  placeholder,
  emptyLabel,
  disabled = false,
  fullWidth = false,
  triggerClassName,
  contentClassName,
  id
}: {
  id?: string
  value: string;
  onValueChange: (value: string) => void;
  options?: StaffSelectOption[];
  groupedOptions?: StaffSelectGroupedOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  
}) {
  const selectValue = value === "" ? EMPTY_SELECT_VALUE : value;

  return (
    <Select
      value={selectValue}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
      }
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "!h-12 rounded-md border border-slate-300 bg-white px-4",
          fullWidth ? "!w-full" : "!w-auto",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("rounded-sm", contentClassName)}>
        {emptyLabel ? (
          <SelectItem value={EMPTY_SELECT_VALUE}>{emptyLabel}</SelectItem>
        ) : null}

        {
          groupedOptions ?
            groupedOptions.map((group, groupIndex) => (
                  <div key={group.label}>
                    <SelectGroup>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {groupIndex < groupedOptions.length - 1 ? (
                      <SelectSeparator />
                    ) : null}
                  </div>
                ))
              :
            options ? options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </SelectItem>
            )) : null

        }

      </SelectContent>
    </Select>
  );
}
