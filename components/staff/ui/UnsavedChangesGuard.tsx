"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PendingNavigation =
  | { type: "href"; href: string }
  | { type: "history-back" }
  | null;

const GUARD_HISTORY_KEY = "__staff_unsaved_changes_guard__";

function canInterceptAnchor(anchor: HTMLAnchorElement, currentHref: string) {
  if (!anchor.href) {
    return false;
  }

  if (anchor.target && anchor.target !== "_self") {
    return false;
  }

  if (anchor.hasAttribute("download")) {
    return false;
  }

  if (
    anchor.protocol === "mailto:" ||
    anchor.protocol === "tel:" ||
    anchor.protocol === "javascript:"
  ) {
    return false;
  }

  return anchor.href !== currentHref;
}

export default function UnsavedChangesGuard({
  isDirty,
  onSaveAndContinue,
}: {
  isDirty: boolean;
  onSaveAndContinue: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation>(null);

  const bypassNextPopstateRef = useRef(false);
  const isDirtyRef = useRef(isDirty);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isDirty) {
      setIsOpen(false);
      setPendingNavigation(null);
    }
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const currentState =
      typeof window.history.state === "object" && window.history.state !== null
        ? window.history.state
        : {};

    if (!currentState[GUARD_HISTORY_KEY]) {
      window.history.pushState(
        { ...currentState, [GUARD_HISTORY_KEY]: true },
        "",
        window.location.href,
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      if (bypassNextPopstateRef.current) {
        bypassNextPopstateRef.current = false;
        return;
      }

      if (event.state?.[GUARD_HISTORY_KEY]) {
        return;
      }

      if (!isDirtyRef.current || isOpenRef.current) {
        return;
      }

      setPendingNavigation({ type: "history-back" });
      setIsOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (!canInterceptAnchor(anchor, window.location.href)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setPendingNavigation({ type: "href", href: anchor.href });
      setIsOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [isDirty]);

  const restoreHistoryGuardIfNeeded = () => {
    if (pendingNavigation?.type !== "history-back") {
      return;
    }

    const currentState =
      typeof window.history.state === "object" && window.history.state !== null
        ? window.history.state
        : {};

    window.history.pushState(
      { ...currentState, [GUARD_HISTORY_KEY]: true },
      "",
      window.location.href,
    );
  };

  const closeDialog = () => {
    restoreHistoryGuardIfNeeded();
    setPendingNavigation(null);
    setIsOpen(false);
  };

  const leaveWithoutSaving = () => {
    const target = pendingNavigation;
    setPendingNavigation(null);
    setIsOpen(false);

    if (!target) {
      return;
    }

    if (target.type === "history-back") {
      bypassNextPopstateRef.current = true;
      window.history.back();
      return;
    }

    const nextUrl = new URL(target.href, window.location.href);

    if (nextUrl.origin === window.location.origin) {
      router.push(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      return;
    }

    window.location.href = target.href;
  };

  const saveAndLeave = async () => {
    setIsSavingAndLeaving(true);

    try {
      const didSave = await onSaveAndContinue();

      if (!didSave) {
        return;
      }

      leaveWithoutSaving();
    } finally {
      setIsSavingAndLeaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          closeDialog();
        }
      }}
    >
      <DialogContent className="w-[min(96vw,560px)] flex flex-col gap-6" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Quitter sans enregistrer ?</DialogTitle>
          <DialogDescription>
            Cette page contient des modifications non enregistrées. Vous pouvez
            rester ici, quitter sans enregistrer, ou enregistrer avant de
            quitter.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <AnimatedUIButton
            type="button"
            variant="outline"
            color="error"
            icon="close"
            iconPosition="left"
            onClick={leaveWithoutSaving}
            disabled={isSavingAndLeaving}
          >
            Quitter sans enregistrer
          </AnimatedUIButton>
          <AnimatedUIButton
            type="button"
            variant="primary"
            icon="save"
            iconPosition="left"
            onClick={() => void saveAndLeave()}
            loading={isSavingAndLeaving}
            loadingText="Enregistrement..."
          >
            Enregistrer et quitter
          </AnimatedUIButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
