"use client";

export type AnimatedUISize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";

export type StaffColorName =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "pink"
  | "rose";

export type ColorsDataSet = {
  outlineColor: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
};

type SizeContext = "badge" | "button" | "none";

export type ButtonSizeStyles = {
  px: string;
  py: string;
  textSize: string;
  rounded: string;
  gap: string;
  minHeight: string;
};

export type BadgeSizeStyles = {
  px: string;
  py: string;
  textSize: string;
  rounded: string;
  gap: string;
};

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

function normalizeHex(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed.toLowerCase();
}

export function hexToRgb(value: string) {
  const normalized = normalizeHex(value);
  const numeric = Number.parseInt(normalized.slice(1), 16);

  return {
    r: (numeric >> 16) & 255,
    g: (numeric >> 8) & 255,
    b: numeric & 255,
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((component) =>
      Math.max(0, Math.min(255, Math.round(component)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function hexToRgba(value: string, alpha: number) {
  const { r, g, b } = hexToRgb(value);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mixHexColors(base: string, target: string, amount: number) {
  const left = hexToRgb(base);
  const right = hexToRgb(target);
  const ratio = Math.max(0, Math.min(1, amount));

  return rgbToHex(
    left.r + (right.r - left.r) * ratio,
    left.g + (right.g - left.g) * ratio,
    left.b + (right.b - left.b) * ratio,
  );
}

export function getReadableHexTextColor(value: string) {
  const { r, g, b } = hexToRgb(value);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.72
    ? mixHexColors(value, "#0f172a", 0.62)
    : mixHexColors(value, "#0f172a", 0.18);
}

export function getReadableHexSolidTextColor(value: string) {
  const { r, g, b } = hexToRgb(value);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.72 ? "#0f172a" : "#ffffff";
}

function createColorSet(
  outlineColor: string,
  bgColor: string,
  textColor: string,
  iconColor: string,
): ColorsDataSet {
  return {
    outlineColor,
    bgColor,
    textColor,
    iconColor,
  };
}

export function getDefaultColors(color: StaffColorName): ColorsDataSet {
  switch (color) {
    case "primary":
      return createColorSet(
        "border-cobam-dark-blue/15",
        "bg-cobam-dark-blue/10",
        "text-cobam-dark-blue",
        "text-cobam-dark-blue",
      );
    case "secondary":
      return createColorSet(
        "border-cobam-water-blue/15",
        "bg-cobam-water-blue/10",
        "text-cobam-water-blue",
        "text-cobam-water-blue",
      );
    case "success":
    case "green":
      return createColorSet(
        "border-emerald-200",
        "bg-emerald-50",
        "text-emerald-700",
        "text-emerald-600",
      );
    case "warning":
    case "amber":
      return createColorSet(
        "border-amber-200",
        "bg-amber-50",
        "text-amber-700",
        "text-amber-600",
      );
    case "error":
    case "red":
      return createColorSet(
        "border-red-200",
        "bg-red-50",
        "text-red-700",
        "text-red-600",
      );
    case "info":
    case "cyan":
      return createColorSet(
        "border-cyan-200",
        "bg-cyan-50",
        "text-cyan-700",
        "text-cyan-600",
      );
    case "orange":
      return createColorSet(
        "border-orange-200",
        "bg-orange-50",
        "text-orange-700",
        "text-orange-600",
      );
    case "yellow":
      return createColorSet(
        "border-yellow-200",
        "bg-yellow-50",
        "text-yellow-700",
        "text-yellow-600",
      );
    case "lime":
      return createColorSet(
        "border-lime-200",
        "bg-lime-50",
        "text-lime-700",
        "text-lime-600",
      );
    case "teal":
      return createColorSet(
        "border-teal-200",
        "bg-teal-50",
        "text-teal-700",
        "text-teal-600",
      );
    case "blue":
      return createColorSet(
        "border-blue-200",
        "bg-blue-50",
        "text-blue-700",
        "text-blue-600",
      );
    case "indigo":
      return createColorSet(
        "border-indigo-200",
        "bg-indigo-50",
        "text-indigo-700",
        "text-indigo-600",
      );
    case "violet":
      return createColorSet(
        "border-violet-200",
        "bg-violet-50",
        "text-violet-700",
        "text-violet-600",
      );
    case "purple":
      return createColorSet(
        "border-purple-200",
        "bg-purple-50",
        "text-purple-700",
        "text-purple-600",
      );
    case "pink":
      return createColorSet(
        "border-pink-200",
        "bg-pink-50",
        "text-pink-700",
        "text-pink-600",
      );
    case "rose":
      return createColorSet(
        "border-rose-200",
        "bg-rose-50",
        "text-rose-700",
        "text-rose-600",
      );
    case "default":
    default:
      return createColorSet(
        "border-slate-200",
        "bg-slate-50",
        "text-slate-700",
        "text-slate-600",
      );
  }
}

export function getHoverColors(color: StaffColorName): ColorsDataSet {
  switch (color) {
    case "primary":
      return createColorSet(
        "border-cobam-dark-blue/20",
        "bg-cobam-dark-blue/15",
        "text-cobam-dark-blue",
        "text-cobam-dark-blue",
      );
    case "secondary":
      return createColorSet(
        "border-cobam-water-blue/20",
        "bg-cobam-water-blue/15",
        "text-cobam-water-blue",
        "text-cobam-water-blue",
      );
    case "success":
    case "green":
      return createColorSet(
        "border-emerald-300",
        "bg-emerald-100",
        "text-emerald-800",
        "text-emerald-700",
      );
    case "warning":
    case "amber":
      return createColorSet(
        "border-amber-300",
        "bg-amber-100",
        "text-amber-800",
        "text-amber-700",
      );
    case "error":
    case "red":
      return createColorSet(
        "border-red-300",
        "bg-red-100",
        "text-red-800",
        "text-red-700",
      );
    case "info":
    case "cyan":
      return createColorSet(
        "border-cyan-300",
        "bg-cyan-100",
        "text-cyan-800",
        "text-cyan-700",
      );
    case "orange":
      return createColorSet(
        "border-orange-300",
        "bg-orange-100",
        "text-orange-800",
        "text-orange-700",
      );
    case "yellow":
      return createColorSet(
        "border-yellow-300",
        "bg-yellow-100",
        "text-yellow-800",
        "text-yellow-700",
      );
    case "lime":
      return createColorSet(
        "border-lime-300",
        "bg-lime-100",
        "text-lime-800",
        "text-lime-700",
      );
    case "teal":
      return createColorSet(
        "border-teal-300",
        "bg-teal-100",
        "text-teal-800",
        "text-teal-700",
      );
    case "blue":
      return createColorSet(
        "border-blue-300",
        "bg-blue-100",
        "text-blue-800",
        "text-blue-700",
      );
    case "indigo":
      return createColorSet(
        "border-indigo-300",
        "bg-indigo-100",
        "text-indigo-800",
        "text-indigo-700",
      );
    case "violet":
      return createColorSet(
        "border-violet-300",
        "bg-violet-100",
        "text-violet-800",
        "text-violet-700",
      );
    case "purple":
      return createColorSet(
        "border-purple-300",
        "bg-purple-100",
        "text-purple-800",
        "text-purple-700",
      );
    case "pink":
      return createColorSet(
        "border-pink-300",
        "bg-pink-100",
        "text-pink-800",
        "text-pink-700",
      );
    case "rose":
      return createColorSet(
        "border-rose-300",
        "bg-rose-100",
        "text-rose-800",
        "text-rose-700",
      );
    case "default":
    default:
      return createColorSet(
        "border-slate-300",
        "bg-slate-100",
        "text-slate-800",
        "text-slate-700",
      );
  }
}

export function getActiveColors(color: StaffColorName): ColorsDataSet {
  switch (color) {
    case "primary":
      return createColorSet(
        "border-cobam-dark-blue",
        "bg-cobam-dark-blue",
        "text-white",
        "text-white",
      );
    case "secondary":
      return createColorSet(
        "border-cobam-water-blue",
        "bg-cobam-water-blue",
        "text-white",
        "text-white",
      );
    case "success":
    case "green":
      return createColorSet(
        "border-emerald-600",
        "bg-emerald-600",
        "text-white",
        "text-white",
      );
    case "warning":
    case "amber":
      return createColorSet(
        "border-amber-500",
        "bg-amber-500",
        "text-white",
        "text-white",
      );
    case "error":
    case "red":
      return createColorSet(
        "border-red-600",
        "bg-red-600",
        "text-white",
        "text-white",
      );
    case "info":
    case "cyan":
      return createColorSet(
        "border-cyan-600",
        "bg-cyan-600",
        "text-white",
        "text-white",
      );
    case "orange":
      return createColorSet(
        "border-orange-600",
        "bg-orange-600",
        "text-white",
        "text-white",
      );
    case "yellow":
      return createColorSet(
        "border-yellow-500",
        "bg-yellow-500",
        "text-slate-950",
        "text-slate-950",
      );
    case "lime":
      return createColorSet(
        "border-lime-600",
        "bg-lime-600",
        "text-white",
        "text-white",
      );
    case "teal":
      return createColorSet(
        "border-teal-600",
        "bg-teal-600",
        "text-white",
        "text-white",
      );
    case "blue":
      return createColorSet(
        "border-blue-600",
        "bg-blue-600",
        "text-white",
        "text-white",
      );
    case "indigo":
      return createColorSet(
        "border-indigo-600",
        "bg-indigo-600",
        "text-white",
        "text-white",
      );
    case "violet":
      return createColorSet(
        "border-violet-600",
        "bg-violet-600",
        "text-white",
        "text-white",
      );
    case "purple":
      return createColorSet(
        "border-purple-600",
        "bg-purple-600",
        "text-white",
        "text-white",
      );
    case "pink":
      return createColorSet(
        "border-pink-600",
        "bg-pink-600",
        "text-white",
        "text-white",
      );
    case "rose":
      return createColorSet(
        "border-rose-600",
        "bg-rose-600",
        "text-white",
        "text-white",
      );
    case "default":
    default:
      return createColorSet(
        "border-slate-700",
        "bg-slate-700",
        "text-white",
        "text-white",
      );
  }
}

export function prefixStateClasses(prefix: string, classes: string) {
  return classes
    .split(" ")
    .filter(Boolean)
    .map((className) => `${prefix}:${className}`)
    .join(" ");
}

export function getSizeDimensions(
  size: AnimatedUISize = "md",
  context: SizeContext = "none",
) {
  switch (context) {
    case "badge":
      switch (size) {
        case "xs":
          return {
            widthClass: "w-3",
            heightClass: "h-3",
            sizeClass: "h-3 w-3",
          };
        case "sm":
          return {
            widthClass: "w-3.5",
            heightClass: "h-3.5",
            sizeClass: "h-3.5 w-3.5",
          };
        case "lg":
          return {
            widthClass: "w-[1.125rem]",
            heightClass: "h-[1.125rem]",
            sizeClass: "h-[1.125rem] w-[1.125rem]",
          };
        case "xl":
          return {
            widthClass: "w-5",
            heightClass: "h-5",
            sizeClass: "h-5 w-5",
          };
        case "2xl":
          return {
            widthClass: "w-6",
            heightClass: "h-6",
            sizeClass: "h-6 w-6",
          };
        case "3xl":
          return {
            widthClass: "w-7",
            heightClass: "h-7",
            sizeClass: "h-7 w-7",
          };
        case "md":
        default:
          return {
            widthClass: "w-4",
            heightClass: "h-4",
            sizeClass: "h-4 w-4",
          };
      }
    case "button":
      switch (size) {
        case "xs":
          return {
            widthClass: "w-3.5",
            heightClass: "h-3.5",
            sizeClass: "h-3.5 w-3.5",
          };
        case "sm":
          return {
            widthClass: "w-4",
            heightClass: "h-4",
            sizeClass: "h-4 w-4",
          };
        case "lg":
          return {
            widthClass: "w-5",
            heightClass: "h-5",
            sizeClass: "h-5 w-5",
          };
        case "xl":
          return {
            widthClass: "w-6",
            heightClass: "h-6",
            sizeClass: "h-6 w-6",
          };
        case "2xl":
          return {
            widthClass: "w-7",
            heightClass: "h-7",
            sizeClass: "h-7 w-7",
          };
        case "3xl":
          return {
            widthClass: "w-8",
            heightClass: "h-8",
            sizeClass: "h-8 w-8",
          };
        case "md":
        default:
          return {
            widthClass: "w-[1.125rem]",
            heightClass: "h-[1.125rem]",
            sizeClass: "h-[1.125rem] w-[1.125rem]",
          };
      }
    case "none":
    default:
      switch (size) {
        case "xs":
          return {
            widthClass: "w-4",
            heightClass: "h-4",
            sizeClass: "h-4 w-4",
          };
        case "sm":
          return {
            widthClass: "w-5",
            heightClass: "h-5",
            sizeClass: "h-5 w-5",
          };
        case "lg":
          return {
            widthClass: "w-7",
            heightClass: "h-7",
            sizeClass: "h-7 w-7",
          };
        case "xl":
          return {
            widthClass: "w-8",
            heightClass: "h-8",
            sizeClass: "h-8 w-8",
          };
        case "2xl":
          return {
            widthClass: "w-9",
            heightClass: "h-9",
            sizeClass: "h-9 w-9",
          };
        case "3xl":
          return {
            widthClass: "w-10",
            heightClass: "h-10",
            sizeClass: "h-10 w-10",
          };
        case "md":
        default:
          return {
            widthClass: "w-6",
            heightClass: "h-6",
            sizeClass: "h-6 w-6",
          };
      }
  }
}

export function getAnimatedButtonSizeStyles(
  size: AnimatedUISize = "md",
): ButtonSizeStyles {
  switch (size) {
    case "xs":
      return {
        px: "px-2.5",
        py: "py-1.5",
        textSize: "text-[11px]",
        rounded: "rounded-md",
        gap: "gap-1.5",
        minHeight: "min-h-7",
      };
    case "sm":
      return {
        px: "px-3",
        py: "py-1.5",
        textSize: "text-xs",
        rounded: "rounded-md",
        gap: "gap-1.5",
        minHeight: "min-h-8",
      };
    case "lg":
      return {
        px: "px-5",
        py: "py-2.5",
        textSize: "text-base",
        rounded: "rounded-xl",
        gap: "gap-2.5",
        minHeight: "min-h-11",
      };
    case "xl":
      return {
        px: "px-6",
        py: "py-3",
        textSize: "text-lg",
        rounded: "rounded-2xl",
        gap: "gap-3",
        minHeight: "min-h-12",
      };
    case "2xl":
      return {
        px: "px-8",
        py: "py-4",
        textSize: "text-xl",
        rounded: "rounded-3xl",
        gap: "gap-4",
        minHeight: "min-h-14",
      };
    case "3xl":
      return {
        px: "px-10",
        py: "py-5",
        textSize: "text-2xl",
        rounded: "rounded-[2rem]",
        gap: "gap-4",
        minHeight: "min-h-16",
      };
    case "md":
    default:
      return {
        px: "px-4",
        py: "py-2",
        textSize: "text-sm",
        rounded: "rounded-lg",
        gap: "gap-2",
        minHeight: "min-h-10",
      };
  }
}

export function getStaffBadgeSizeStyles(
  size: AnimatedUISize = "md",
): BadgeSizeStyles {
  switch (size) {
    case "xs":
      return {
        px: "px-1.5",
        py: "py-0.5",
        textSize: "text-[10px]",
        rounded: "rounded-full",
        gap: "gap-1",
      };
    case "sm":
      return {
        px: "px-2",
        py: "py-0.5",
        textSize: "text-[11px]",
        rounded: "rounded-full",
        gap: "gap-1.5",
      };
    case "lg":
      return {
        px: "px-3",
        py: "py-1.5",
        textSize: "text-sm",
        rounded: "rounded-full",
        gap: "gap-2",
      };
    case "xl":
      return {
        px: "px-3.5",
        py: "py-2",
        textSize: "text-base",
        rounded: "rounded-full",
        gap: "gap-2",
      };
    case "2xl":
      return {
        px: "px-4",
        py: "py-2.5",
        textSize: "text-lg",
        rounded: "rounded-full",
        gap: "gap-2.5",
      };
    case "3xl":
      return {
        px: "px-5",
        py: "py-3",
        textSize: "text-xl",
        rounded: "rounded-full",
        gap: "gap-3",
      };
    case "md":
    default:
      return {
        px: "px-2.5",
        py: "py-1",
        textSize: "text-xs",
        rounded: "rounded-full",
        gap: "gap-1.5",
      };
  }
}
