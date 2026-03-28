// /app/login/staff/page.tsx

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, HelpCircle } from "lucide-react";
import { staffApiFetch } from "@/lib/api/auth/staff/api-fetch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnimatedUIButton } from "@/components/ui/custom/Buttons";



export default function StaffLoginPage() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const accessToken = localStorage.getItem("staff_access_token");

        if (!accessToken) {
          setIsCheckingSession(false);
          return;
        }

        const res = await staffApiFetch("/api/staff/me", {
          method: "GET",
          auth: true,
        });

        const data = await res.json();

        if (res.ok && data?.ok && data?.user?.portal === "STAFF") {
          router.replace("/espace/staff/accueil/tableau-de-bord");
          return;
        }
      } catch {
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkExistingSession();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      const email = String(formData.get("username") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      const res = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Erreur de connexion");
      }

      localStorage.setItem("staff_access_token", data.accessToken);
      localStorage.setItem("staff_auth_user", JSON.stringify(data.user));

      router.replace("/espace/staff//accueil/tableau-de-bord");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCheckingSession) {
    return null;
  }

  return (
    <main className="min-h-screen bg-cobam-light-bg flex flex-col justify-center py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-[0.25em] uppercase text-cobam-water-blue mb-2">
            Espace professionnel
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold text-cobam-dark-blue"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            Connexion au portail COBAM
          </h1>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-3xl bg-white shadow-[0_20px_70px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col md:flex-row"
        >
          <div className="relative md:w-1/2 min-h-[220px] md:min-h-[420px] bg-cobam-dark-blue">
            <Image
              src="/images/login/staff/staff-login.png"
              alt="Espace professionnel COBAM"
              fill
              className="object-cover"
            />
            <div className="relative z-10 h-full flex flex-col justify-end p-8 sm:p-10">
              <h2
                className="text-2xl sm:text-3xl font-bold text-white mb-2"
                style={{ fontFamily: "var(--font-playfair), serif" }}
              >
                Portail des équipes & partenaires
              </h2>
              <p className="text-sm text-white/80">
                Gérez le contenu du site, les produits et les marques depuis une
                interface dédiée aux équipes COBAM GROUP.
              </p>
            </div>
          </div>

          <div className="md:w-1/2 p-8 sm:p-10 flex flex-col justify-center">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-cobam-dark-blue mb-1">
                Connexion sécurisée
              </h3>
              <p className="text-sm text-cobam-carbon-grey">
                Page de connexion privée pour les comptes administrateurs et
                membres de l&apos;équipe.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-sm font-semibold text-cobam-dark-blue flex items-center gap-1.5"
                >
                  <Mail size={14} className="text-cobam-water-blue" />
                  Adresse e-mail
                </label>
                <input
                  id="username"
                  name="username"
                  type="email"
                  autoComplete="username"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-cobam-light-bg px-4 py-3 text-sm text-cobam-dark-blue focus:outline-none focus:ring-2 focus:ring-cobam-water-blue/60 focus:border-cobam-water-blue transition-all"
                  placeholder="votre@email.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-cobam-dark-blue flex items-center gap-1.5"
                >
                  <Lock size={14} className="text-cobam-water-blue" />
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-cobam-light-bg px-4 py-3 text-sm text-cobam-dark-blue focus:outline-none focus:ring-2 focus:ring-cobam-water-blue/60 focus:border-cobam-water-blue transition-all"
                  placeholder="Mot de passe"
                />
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      id="remember"
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-gray-300 text-cobam-water-blue focus:ring-cobam-water-blue"
                    />
                    <label
                      htmlFor="remember"
                      className="text-xs text-cobam-carbon-grey"
                    >
                      Se souvenir de moi
                    </label>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-semibold text-cobam-water-blue hover:text-cobam-dark-blue transition-colors"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex justify-end">
                <AnimatedUIButton
                  type="submit"
                  disabled={isSubmitting}
                  variant="primary"
                  loading={isSubmitting}
                  icon="arrow-right"
                  loadingText="Connexion en cours..."
                >
                  {isSubmitting ? "Connexion en cours..." : "Se connecter"}
                </AnimatedUIButton>
              </div>

            </form>
          </div>
        </motion.section>

        <section className="mt-10 sm:mt-12">
          <div className="mb-4 flex items-center gap-2">
            <HelpCircle size={18} className="text-cobam-water-blue" />
            <h2 className="text-sm font-semibold tracking-[0.18em] text-cobam-dark-blue uppercase">
              Questions fréquentes
            </h2>
          </div>

          <Accordion
            type="single"
            collapsible
            className="bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <AccordionItem value="item-1" className="px-4">
              <AccordionTrigger className="text-sm text-cobam-dark-blue">
                Je n&apos;ai pas de compte.
              </AccordionTrigger>
              <AccordionContent className="text-sm text-cobam-carbon-grey pb-4">
                Cette page est un espace de connexion privé. Seuls les membres du
                personnel et les administrateurs peuvent demander la création
                d&apos;un compte.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="px-4">
              <AccordionTrigger className="text-sm text-cobam-dark-blue">
                Je suis membre du personnel, comment me connecter ?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-cobam-carbon-grey pb-4">
                Normalement, nous vous avons envoyé un e-mail avec votre nom
                d&apos;utilisateur et votre mot de passe préconfigurés. Utilisez
                ces informations pour vous connecter à cet espace.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="px-4">
              <AccordionTrigger className="text-sm text-cobam-dark-blue">
                Je suis membre du personnel, j&apos;ai oublié mon mot de passe ou
                je n&apos;ai pas reçu d&apos;e-mail.
              </AccordionTrigger>
              <AccordionContent className="text-sm text-cobam-carbon-grey pb-4">
                Cliquez sur « Mot de passe oublié ? », puis saisissez votre
                adresse e-mail professionnelle. Un e-mail automatique vous sera
                envoyé avec un lien pour réinitialiser votre mot de passe.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="px-4">
              <AccordionTrigger className="text-sm text-cobam-dark-blue">
                Comment demander un compte ?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-cobam-carbon-grey pb-4">
                Si vous êtes membre du personnel, envoyez-nous un e-mail depuis
                votre adresse professionnelle. Notre équipe créera votre compte
                et vous transmettra vos identifiants de connexion.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </main>
  );
}
