"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileImage,
  FileText,
  FileVideo,
  Filter,
  Folder,
  FolderOpen,
  Globe,
  Heart,
  Home,
  ImageIcon,
  Info,
  Loader2,
  Lock,
  LockOpen,
  Mail,
  Music4,
  Package,
  Pause,
  PencilLine,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings2,
  Shield,
  Star,
  Tag,
  Tags,
  Trash2,
  Upload,
  User,
  Users,
  X,
  Copy,
  Ellipsis,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getActiveColors,
  getDefaultColors,
  getHoverColors,
  getSizeDimensions,
  type AnimatedUISize,
  type StaffColorName,
} from "./animated-ui.shared";

export type AnimatedIconName =
  | "none"
  | "loader"
  | "arrow-right"
  | "arrow-left"
  | "arrow-up"
  | "arrow-down"
  | "chevron-right"
  | "chevron-left"
  | "chevron-up"
  | "chevron-down"
  | "external-link"
  | "plus"
  | "paper-plane"
  | "restart"
  | "pause"
  | "play"
  | "save"
  | "delete"
  | "modify"
  | "check"
  | "check-circle"
  | "close"
  | "search"
  | "filter"
  | "upload"
  | "download"
  | "user"
  | "users"
  | "shield"
  | "tag"
  | "tags"
  | "package"
  | "image"
  | "image-stack"
  | "video"
  | "audio"
  | "file"
  | "file-text"
  | "warning"
  | "info"
  | "mail"
  | "phone"
  | "calendar"
  | "clock"
  | "globe"
  | "home"
  | "settings"
  | "folder"
  | "folder-open"
  | "star"
  | "heart"
  | "lock"
  | "unlock"
  | "eye"
  | "eye-off"
  | "badge-check"
  | "copy"
  | "ellipsis";

type AnimatedIconMode = "asParent" | "asButtonChild" | "asBadgeChild";

function assertNever(value: never): never {
  throw new Error(`Unsupported icon: ${value}`);
}

function renderIconNode(
  icon: AnimatedIconName,
  className: string,
): ReactNode {
  switch (icon) {
    case "none":
      return null;
    case "loader":
      return <Loader2 aria-hidden="true" className={className} />;
    case "arrow-right":
      return <ArrowRight aria-hidden="true" className={className} />;
    case "arrow-left":
      return <ArrowLeft aria-hidden="true" className={className} />;
    case "arrow-up":
      return <ArrowUp aria-hidden="true" className={className} />;
    case "arrow-down":
      return <ArrowDown aria-hidden="true" className={className} />;
    case "chevron-right":
      return <ChevronRight aria-hidden="true" className={className} />;
    case "chevron-left":
      return <ChevronLeft aria-hidden="true" className={className} />;
    case "chevron-up":
      return <ChevronUp aria-hidden="true" className={className} />;
    case "chevron-down":
      return <ChevronDown aria-hidden="true" className={className} />;
    case "external-link":
      return <ExternalLink aria-hidden="true" className={className} />;
    case "plus":
      return <Plus aria-hidden="true" className={className} />;
    case "paper-plane":
      return <Send aria-hidden="true" className={className} />;
    case "restart":
      return <RotateCcw aria-hidden="true" className={className} />;
    case "pause":
      return <Pause aria-hidden="true" className={className} />;
    case "play":
      return <Play aria-hidden="true" className={className} />;
    case "save":
      return <Save aria-hidden="true" className={className} />;
    case "delete":
      return <Trash2 aria-hidden="true" className={className} />;
    case "modify":
      return <PencilLine aria-hidden="true" className={className} />;
    case "check":
      return <Check aria-hidden="true" className={className} />;
    case "check-circle":
      return <CheckCircle2 aria-hidden="true" className={className} />;
    case "close":
      return <X aria-hidden="true" className={className} />;
    case "search":
      return <Search aria-hidden="true" className={className} />;
    case "filter":
      return <Filter aria-hidden="true" className={className} />;
    case "upload":
      return <Upload aria-hidden="true" className={className} />;
    case "download":
      return <Download aria-hidden="true" className={className} />;
    case "user":
      return <User aria-hidden="true" className={className} />;
    case "users":
      return <Users aria-hidden="true" className={className} />;
    case "shield":
      return <Shield aria-hidden="true" className={className} />;
    case "tag":
      return <Tag aria-hidden="true" className={className} />;
    case "tags":
      return <Tags aria-hidden="true" className={className} />;
    case "package":
      return <Package aria-hidden="true" className={className} />;
    case "image":
    case "image-stack":
      return icon === "image" ? (
        <ImageIcon aria-hidden="true" className={className} />
      ) : (
        <FileImage aria-hidden="true" className={className} />
      );
    case "video":
      return <FileVideo aria-hidden="true" className={className} />;
    case "audio":
      return <Music4 aria-hidden="true" className={className} />;
    case "file":
      return <File aria-hidden="true" className={className} />;
    case "file-text":
      return <FileText aria-hidden="true" className={className} />;
    case "warning":
      return <AlertTriangle aria-hidden="true" className={className} />;
    case "info":
      return <Info aria-hidden="true" className={className} />;
    case "mail":
      return <Mail aria-hidden="true" className={className} />;
    case "phone":
      return <Phone aria-hidden="true" className={className} />;
    case "calendar":
      return <Calendar aria-hidden="true" className={className} />;
    case "clock":
      return <Clock3 aria-hidden="true" className={className} />;
    case "globe":
      return <Globe aria-hidden="true" className={className} />;
    case "home":
      return <Home aria-hidden="true" className={className} />;
    case "settings":
      return <Settings2 aria-hidden="true" className={className} />;
    case "folder":
      return <Folder aria-hidden="true" className={className} />;
    case "folder-open":
      return <FolderOpen aria-hidden="true" className={className} />;
    case "star":
      return <Star aria-hidden="true" className={className} />;
    case "heart":
      return <Heart aria-hidden="true" className={className} />;
    case "lock":
      return <Lock aria-hidden="true" className={className} />;
    case "unlock":
      return <LockOpen aria-hidden="true" className={className} />;
    case "eye":
      return <Eye aria-hidden="true" className={className} />;
    case "eye-off":
      return <EyeOff aria-hidden="true" className={className} />;
    case "badge-check":
      return <BadgeCheck aria-hidden="true" className={className} />;
    case "copy":
        return <Copy aria-hidden="true" className={className} />;
    case "ellipsis":
      return <Ellipsis aria-hidden="true" className={className} />;
    default:
      return assertNever(icon);
  }
}

function getHoverVariants(icon: AnimatedIconName): Variants {
  switch (icon) {
    case "arrow-right":
    case "external-link":
    case "download":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: { x: 4, y: icon === "external-link" ? -2 : 0, rotate: 0, scale: 1.04 },
      };
    case "arrow-left":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: { x: -4, y: 0, rotate: 0, scale: 1.04 },
      };
    case "arrow-up":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: { x: 0, y: -4, rotate: 0, scale: 1.04 },
      };
    case "arrow-down":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: { x: 0, y: 4, rotate: 0, scale: 1.04 },
      };
    case "chevron-right":
      return {
        rest: { x: 0, scale: 1 },
        hover: { x: 5, scale: 1.08 },
      };
    case "chevron-left":
      return {
        rest: { x: 0, scale: 1 },
        hover: { x: -5, scale: 1.08 },
      };
    case "chevron-up":
      return {
        rest: { y: 0, scale: 1 },
        hover: { y: -4, scale: 1.08 },
      };
    case "chevron-down":
      return {
        rest: { y: 0, scale: 1 },
        hover: { y: 4, scale: 1.08 },
      };
    case "plus":
      return {
        rest: { rotate: 0, scale: 1 },
        hover: { rotate: 90, scale: 1.08 },
      };
    case "paper-plane":
    case "upload":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: { x: 4, y: -2, rotate: 10, scale: 1.04 },
      };
    case "restart":
    case "settings":
      return {
        rest: { rotate: 0, scale: 1 },
        hover: {
          rotate: icon === "settings" ? 45 : -110,
          scale: 1.06,
        },
      };
    case "pause":
    case "play":
      return {
        rest: { scale: 1, y: 0, x: 0 },
        hover: { scale: 1.08, y: -1, x: icon === "play" ? 2 : 0 },
      };
    case "save":
    case "check":
    case "check-circle":
    case "badge-check":
      return {
        rest: { y: 0, scale: 1, rotate: 0 },
        hover: {
          y: [0, -1, 0],
          scale: [1, 1.05, 1.02],
          rotate: [0, -3, 0],
          transition: {
            duration: 0.35,
            ease: "easeOut",
          },
        },
      };
    case "delete":
    case "warning":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: {
          x: [0, -2, 2, -2, 2, 0],
          rotate: [0, -4, 4, -3, 3, 0],
          scale: 1.03,
          transition: {
            duration: 0.32,
            ease: "easeInOut",
          },
        },
      };
    case "modify":
      return {
        rest: { x: 0, y: 0, rotate: 0, scale: 1 },
        hover: {
          x: [0, 1, 2, 1, 0],
          y: [0, -1, 0, 1, 0],
          rotate: [0, -6, -10, -6, 0],
          scale: 1.05,
          transition: {
            duration: 0.4,
            ease: "easeInOut",
          },
        },
      };
    case "search":
    case "eye":
    case "eye-off":
      return {
        rest: { scale: 1, x: 0, y: 0 },
        hover: { scale: 1.08, x: 1, y: -1 },
      };
    case "filter":
    case "tag":
    case "tags":
      return {
        rest: { y: 0, rotate: 0, scale: 1 },
        hover: { y: -1, rotate: 4, scale: 1.05 },
      };
    case "image":
    case "image-stack":
    case "video":
    case "audio":
    case "file":
    case "file-text":
    case "folder":
    case "folder-open":
    case "package":
      return {
        rest: { y: 0, scale: 1, rotate: 0 },
        hover: { y: -2, scale: 1.05, rotate: 2 },
      };
    case "user":
    case "users":
    case "shield":
    case "lock":
    case "unlock":
    case "info":
    case "mail":
    case "phone":
    case "calendar":
    case "clock":
    case "globe":
    case "home":
    case "star":
    case "heart":
    case "copy":
    case "ellipsis":
      return {
        rest: { y: 0, scale: 1, rotate: 0 },
        hover: { y: -1, scale: 1.06, rotate: icon === "star" ? 12 : 0 },
      };
    case "close":
      return {
        rest: { rotate: 0, scale: 1 },
        hover: { rotate: 90, scale: 1.05 },
      };
    case "loader":
    case "none":
      return {
        rest: { rotate: 0, scale: 1 },
        hover: { rotate: 0, scale: 1 },
      };
    default:
      return assertNever(icon);
  }
}

export default function AnimatedIcon({
  icon,
  size = "md",
  mode = "asParent",
  color = "default",
  customColor,
  state = "default",
  className,
  spin = false,
}: {
  icon: AnimatedIconName;
  size?: AnimatedUISize;
  mode?: AnimatedIconMode;
  color?: StaffColorName;
  customColor?: string;
  state?: "default" | "hover" | "active";
  className?: string;
  spin?: boolean;
}) {
  if (icon === "none") {
    return null;
  }

  const context =
    mode === "asButtonChild"
      ? "button"
      : mode === "asBadgeChild"
        ? "badge"
        : "none";
  const sizeClasses = getSizeDimensions(size, context);
  const colorSet =
    state === "active"
      ? getActiveColors(color)
      : state === "hover"
        ? getHoverColors(color)
        : getDefaultColors(color);

  const content = renderIconNode(
    icon,
    cn(
      "transition-colors duration-300",
      sizeClasses.sizeClass,
      customColor ? undefined : colorSet.iconColor,
      className,
    ),
  );
  const contentNode = customColor ? (
    <span style={{ color: customColor }}>{content}</span>
  ) : (
    content
  );

  if (icon === "loader" || spin) {
    return (
      <motion.span
        className="inline-flex shrink-0 items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{
          duration: 0.85,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      >
        {contentNode}
      </motion.span>
    );
  }

  if (mode === "asParent") {
    return (
      <motion.span
        initial="rest"
        animate="rest"
        whileHover="hover"
        variants={getHoverVariants(icon)}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="inline-flex shrink-0 items-center justify-center"
      >
        {contentNode}
      </motion.span>
    );
  }

  return (
    <motion.span
      variants={getHoverVariants(icon)}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="inline-flex shrink-0 items-center justify-center"
    >
      {contentNode}
    </motion.span>
  );
}
