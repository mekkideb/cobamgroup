"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import SecurityForm from "@/components/staff/ui/SecurityForm";
import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";
import { StaffPageHeader } from "@/components/staff/ui";

export default function SecurityPage() {
  const [state, setState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmation: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!state.newPassword || state.newPassword !== state.confirmation) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setIsSaving(true);

    try {
      const res = await staffApiFetch("/api/auth/staff/password", {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: state.currentPassword,
          newPassword: state.newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Erreur lors de la mise à jour");
      }

      toast.success("Mot de passe mis à jour");
      setState({ currentPassword: "", newPassword: "", confirmation: "" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la mise à jour";
      setError(message);
      toast.error("Erreur lors de la mise à jour", {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <StaffPageHeader
        eyebrow="Sécurité"
        title="Mot de passe"
      >
        <AnimatedUIButton
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          loading={isSaving}
          loadingText="Enregistrement..."
          icon="save"
          variant="secondary"
        >
          Enregistrer
        </AnimatedUIButton>
      </StaffPageHeader>

      <SecurityForm
        state={state}
        onChange={(patch) => setState((prev) => ({ ...prev, ...patch }))}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
