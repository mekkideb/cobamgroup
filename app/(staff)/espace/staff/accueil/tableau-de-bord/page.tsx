"use client";

import { ExternalLink } from "lucide-react";
import Loading from "@/components/staff/Loading";
import Panel from "@/components/staff/ui/Panel";
import { StaffBadge } from "@/components/staff/ui";
import { useStaffSessionContext } from "@/features/auth/client/staff-session-provider";

const usefulLinks = [
  { label: "Voir le site public", href: "/" },
  { label: "Documentation interne", href: "#" },
  { label: "Support technique", href: "#" },
];

const recentActions = [
  {
    label: 'Article "Nouvelle collection 2026" publié',
    time: "Il y a 2 heures",
  },
  {
    label: 'Produit "Carrelage Tessino Gris" mis à jour',
    time: "Hier",
  },
  {
    label: 'Marque "Geberit" ajoutée au portail marques',
    time: "Il y a 3 jours",
  },
  {
    label: 'Média "Showroom Houmt Souk" importé',
    time: "Il y a 1 semaine",
  },
];

export default function EspaceStaffPage() {
  const { user, isLoading, error } = useStaffSessionContext();

  if (isLoading) {
    return <Loading />;
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold text-cobam-dark-blue">
          Session invalide
        </h1>
        <p className="mb-4 text-sm text-slate-600">
          {error || "Votre session a expiré. Veuillez vous reconnecter."}
        </p>
        <a
          href="/login/staff"
          className="inline-flex items-center justify-center rounded-xl bg-cobam-dark-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobam-water-blue"
        >
          Retour à la connexion
        </a>
      </div>
    );
  }

  if (user.status === "BANNED") {
    return (
      <Panel
        pretitle="Compte"
        title="Accès restreint"
        description="Votre compte est actuellement banni. Vous pouvez encore consulter et mettre à jour vos informations personnelles."
      >
        <StaffBadge size="lg" color="amber" icon="warning">
          Statut : banni
        </StaffBadge>
        {user.banDetails?.summary ? (
          <p className="text-sm leading-6 text-slate-600">
            Motif :{" "}
            <span className="font-semibold text-slate-700">
              {user.banDetails.summary}
            </span>
          </p>
        ) : null}
      </Panel>
    );
  }

  const accessColor =
    user.powerType === "ROOT"
      ? "rose"
      : user.powerType === "ADMIN"
        ? "violet"
        : "blue";
  const accessIcon =
    user.powerType === "STAFF" ? "user" : "shield";

  return (
    <>
      <section className="grid items-start gap-6 lg:grid-cols-[1.4fr_1.3fr]">
        <Panel
          pretitle={`Bonjour, ${
            user.profile?.firstName || user.profile?.lastName || user.email
          }`}
          title="Bienvenue dans l'espace professionnel"
          description="Gérez les contenus et les opérations autorisées selon votre niveau d'accès."
        >
          <StaffBadge size="lg" color={accessColor} icon={accessIcon}>
            Accès : {user.roleLabel}
          </StaffBadge>
        </Panel>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h3 className="mb-4 text-sm font-semibold text-cobam-dark-blue">
            Actions récentes
          </h3>
          <ul className="space-y-3 text-sm">
            {recentActions.map((action) => (
              <li
                key={`${action.label}:${action.time}`}
                className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-slate-700">{action.label}</p>
                <p className="whitespace-nowrap text-[11px] text-slate-400">
                  {action.time}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h3 className="mb-4 text-sm font-semibold text-cobam-dark-blue">
            Liens utiles
          </h3>
          <ul className="space-y-2 text-sm">
            {usefulLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-cobam-water-blue"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
