"use client";

import { motion } from "framer-motion";
import type { ComponentProps, CSSProperties } from "react";
import AnimatedIcon, {
  type AnimatedIconName,
} from "@/components/ui/custom/AnimatedIcon";
import {
  getActiveColors,
  getDefaultColors,
  getHoverColors,
  getReadableHexSolidTextColor,
  getReadableHexTextColor,
  getStaffBadgeSizeStyles,
  hexToRgba,
  isHexColor,
  mixHexColors,
  prefixStateClasses,
  type AnimatedUISize,
  type StaffColorName,
} from "@/components/ui/custom/animated-ui.shared";
import { cn } from "@/lib/utils";

type StaffBadgeHexVariables = CSSProperties & {
  "--staff-badge-outline"?: string;
  "--staff-badge-bg"?: string;
  "--staff-badge-text"?: string;
  "--staff-badge-outline-hover"?: string;
  "--staff-badge-bg-hover"?: string;
  "--staff-badge-text-hover"?: string;
  "--staff-badge-outline-active"?: string;
  "--staff-badge-bg-active"?: string;
  "--staff-badge-text-active"?: string;
};

type StaffBadgeProps = Omit<
  ComponentProps<"span">,
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
> & {
  size?: AnimatedUISize;
  color?: StaffColorName | string;
  icon?: AnimatedIconName;
  iconPosition?: "left" | "right";
  iconClassName?: string;
};

export default function StaffBadge({
  children,
  size = "md",
  color = "default",
  icon,
  iconPosition = "left",
  className,
  iconClassName,
  ...props
}: StaffBadgeProps) {
  const { px, py, textSize, rounded, gap } = getStaffBadgeSizeStyles(size);
  const isCustomHexColor = isHexColor(color);
  const textColor = isCustomHexColor ? getReadableHexTextColor(color) : null;
  const badgeStyle: StaffBadgeHexVariables | undefined = isCustomHexColor
    ? {
        "--staff-badge-outline": hexToRgba(color, 0.24),
        "--staff-badge-bg": hexToRgba(color, 0.12),
        "--staff-badge-text": textColor ?? color,
        "--staff-badge-outline-hover": hexToRgba(color, 0.36),
        "--staff-badge-bg-hover": hexToRgba(color, 0.18),
        "--staff-badge-text-hover": mixHexColors(textColor ?? color, "#0f172a", 0.08),
        "--staff-badge-outline-active": hexToRgba(color, 0.92),
        "--staff-badge-bg-active": mixHexColors(color, "#ffffff", 0.06),
        "--staff-badge-text-active": getReadableHexSolidTextColor(color),
      }
    : undefined;
  const defaultColors = isCustomHexColor
    ? {
        outlineColor: "border-[var(--staff-badge-outline)]",
        bgColor: "bg-[var(--staff-badge-bg)]",
        textColor: "text-[var(--staff-badge-text)]",
        iconColor: "text-[var(--staff-badge-text)]",
      }
    : getDefaultColors(color as StaffColorName);
  const hoverColors = isCustomHexColor
    ? {
        outlineColor: "border-[var(--staff-badge-outline-hover)]",
        bgColor: "bg-[var(--staff-badge-bg-hover)]",
        textColor: "text-[var(--staff-badge-text-hover)]",
        iconColor: "text-[var(--staff-badge-text-hover)]",
      }
    : getHoverColors(color as StaffColorName);
  const activeColors = isCustomHexColor
    ? {
        outlineColor: "border-[var(--staff-badge-outline-active)]",
        bgColor: "bg-[var(--staff-badge-bg-active)]",
        textColor: "text-[var(--staff-badge-text-active)]",
        iconColor: "text-[var(--staff-badge-text-active)]",
      }
    : getActiveColors(color as StaffColorName);

  const iconNode = icon ? (
    <AnimatedIcon
      icon={icon}
      size={size}
      mode="asBadgeChild"
      color={isCustomHexColor ? "default" : color}
      customColor={isCustomHexColor ? textColor ?? color : undefined}
      className={iconClassName}
    />
  ) : null;

  return (
    <motion.span
      initial="rest"
      animate="rest"
      whileHover="hover"
      style={badgeStyle}
      className={cn(
        "group/badge inline-flex w-fit shrink-0 items-center justify-center border font-medium whitespace-nowrap transition-colors duration-200",
        px,
        py,
        textSize,
        rounded,
        gap,
        defaultColors.outlineColor,
        defaultColors.bgColor,
        defaultColors.textColor,
        prefixStateClasses("hover", hoverColors.outlineColor),
        prefixStateClasses("hover", hoverColors.bgColor),
        prefixStateClasses("hover", hoverColors.textColor),
        prefixStateClasses("active", activeColors.outlineColor),
        prefixStateClasses("active", activeColors.bgColor),
        prefixStateClasses("active", activeColors.textColor),
        className,
      )}
      {...props}
    >
      {iconPosition === "left" ? iconNode : null}
      {children != null ? <span>{children}</span> : null}
      {iconPosition === "right" ? iconNode : null}
    </motion.span>
  );
}
