// app/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const categories = [
  {
    title: "Produits de Base",
    description:
      "Matériaux de construction fiables pour fondations, structures et gros œuvre.",
    href: "#",
  },
  {
    title: "Produits de Finition",
    description:
      "Carrelage, marbre et finitions premium pour des intérieurs élégants.",
    href: "#",
  },
];

const products = [
  { name: "AMB ARENISCA PERLA", href: "#", tag: "Nouveau" },
  { name: "FAEDO", href: "#", tag: "Tendance" },
  { name: "BOIS", href: "#", tag: "Classique" },
  { name: "TESSINO", href: "#", tag: "Premium" },
];

const clients = [
  "Visavis Immobilier",
  "Merdiana",
  "Polyclinique Djerba",
  "Polyclinique Arij",
];

const partners = [
  "Marazzi Group",
  "Carthago Ceramic",
  "Pam",
  "Head Home",
];

const blogPosts = [
  {
    category: "Matériaux de construction",
    date: "6 mois ago",
    title:
      "Les 7 erreurs à éviter dans le choix de vos fournisseurs de matériaux de construction",
  },
  {
    category: "Faïence",
    date: "7 mois ago",
    title:
      "Grès cérame, faïence ou marbre ? Le guide d’expert 2025 qui va révolutionner votre choix",
  },
];

const showrooms = [
  "Cobam Houmt Souk",
  "Cobam Central",
  "Cobam Céram",
  "Cobam Midoun",
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b border-white/10 bg-neutral-950/80 backdrop-blur z-20 sticky top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-amber-500" />
            <span className="font-semibold tracking-wide text-sm">
              COBAM GROUP
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <a href="#hero" className="hover:text-white">
              Accueil
            </a>
            <a href="#categories" className="hover:text-white">
              Produits
            </a>
            <a href="#blog" className="hover:text-white">
              Conseils
            </a>
            <a href="#showrooms" className="hover:text-white">
              Showrooms
            </a>
            <a href="#footer" className="hover:text-white">
              Contact
            </a>
          </nav>
          <Button size="sm" className="bg-amber-500 text-neutral-950">
            Contactez-nous
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section
          id="hero"
          className="relative border-b border-white/5 bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900"
        >
          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-[2fr,1.3fr] gap-12">
            <div className="space-y-6">
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/40">
                Depuis 1994 · Matériaux premium en Tunisie
              </Badge>
              <h1 className="text-3xl md:text-5xl font-semibold leading-tight">
                Créez des espaces uniques avec des matériaux{" "}
                <span className="text-amber-400">haut de gamme</span>.
              </h1>
              <p className="text-neutral-300 text-sm md:text-base max-w-xl">
                Carrelage, marbre, sanitaire et robinetterie sélectionnés avec
                soin pour répondre aux exigences des particuliers, architectes
                et professionnels du bâtiment.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-amber-500 text-neutral-950 px-6">
                  Découvrir nos produits
                </Button>
                <Button
                  variant="outline"
                  className="border-neutral-700 text-neutral-100"
                >
                  Visiter nos showrooms
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 pt-4 text-xs text-neutral-400">
                <div>
                  +30 ans d&apos;expertise
                  <div className="text-neutral-200 font-medium">
                    Bâtiments & maisons de rêve
                  </div>
                </div>
                <div>
                  Réseau national
                  <div className="text-neutral-200 font-medium">
                    Showrooms & partenaires
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-amber-500/10 blur-2xl" />
              <Card className="relative h-full bg-neutral-900/60 border-neutral-800">
                <CardHeader>
                  <CardTitle className="text-sm text-neutral-300">
                    Nos catégories
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.map((cat) => (
                    <div
                      key={cat.title}
                      className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {cat.title}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">
                          {cat.description}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="outline"
                        className="border-neutral-700 text-xs rounded-full"
                      >
                        →
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Categories / Nos Catégories */}
        <section
          id="categories"
          className="border-b border-white/5 bg-neutral-950"
        >
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="text-center space-y-2 mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                Nos catégories
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold">
                Matériaux de construction fiables et innovants
              </h2>
              <p className="text-neutral-300 text-sm max-w-2xl mx-auto">
                De la maison aux grandes infrastructures, trouvez le matériau
                adapté à chaque étape de vos projets, y compris une vaste
                sélection de marbres.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {categories.map((cat) => (
                <Card
                  key={cat.title}
                  className="bg-neutral-900/60 border-neutral-800 hover:border-amber-500/60 transition-colors"
                >
                  <CardHeader>
                    <CardTitle>{cat.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-4">
                    <p className="text-sm text-neutral-300">
                      {cat.description}
                    </p>
                    <Button variant="outline" size="sm" className="text-xs">
                      Voir plus
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Nouveaux produits */}
        <section className="border-b border-white/5 bg-neutral-945">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                  Nouvelles collections
                </p>
                <h2 className="text-xl md:text-2xl font-semibold">
                  Sélection récente
                </h2>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Voir la boutique
              </Button>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {products.map((p) => (
                <Card
                  key={p.name}
                  className="bg-neutral-900/60 border-neutral-800 hover:border-amber-500/50 transition-colors"
                >
                  <CardHeader className="space-y-1">
                    <Badge className="w-fit bg-amber-500/10 text-amber-400 border-amber-500/40 text-[10px]">
                      {p.tag}
                    </Badge>
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900" />
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[11px]"
                    >
                      Demander un devis
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Clients & partenaires */}
        <section className="border-b border-white/5 bg-neutral-950">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid md:grid-cols-2 gap-10">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                Nos clients de prestige
              </p>
              <h2 className="text-xl md:text-2xl font-semibold mt-1">
                Votre succès, notre priorité
              </h2>
              <p className="text-sm text-neutral-300 mt-3">
                Des promoteurs immobiliers, architectes et cliniques réputées
                nous font confiance pour la qualité et la durabilité de nos
                matériaux.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {clients.map((c) => (
                  <div
                    key={c}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-200"
                  >
                    {c}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                Nos partenaires
              </p>
              <h2 className="text-xl md:text-2xl font-semibold mt-1">
                L&apos;excellence, ensemble
              </h2>
              <p className="text-sm text-neutral-300 mt-3">
                Une sélection de fabricants internationaux pour offrir des
                collections exclusives de carrelage, marbre et produits
                sanitaires.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-6">
                {partners.map((p) => (
                  <div
                    key={p}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-200"
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Témoignages */}
        <section className="border-b border-white/5 bg-neutral-945">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="text-center mb-8 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                Témoignages
              </p>
              <h2 className="text-xl md:text-2xl font-semibold">
                La confiance de nos clients
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-4 text-sm">
              {[
                {
                  name: "Lassad Ben Mimoun",
                  content:
                    "Une équipe solide avec une grande confiance et professionnalisme au niveau du service.",
                },
                {
                  name: "Cyrine Dridi Ep Essid",
                  content:
                    "Un accueil chaleureux et une équipe à l'écoute et très serviable.",
                },
                {
                  name: "Bm Mouheb",
                  content: "Excellent team and service.",
                },
                {
                  name: "Sabra Bho",
                  content: "Macha Allah, tout est raffiné. Bonne continuation.",
                },
              ].map((t) => (
                <Card
                  key={t.name}
                  className="bg-neutral-900/60 border-neutral-800"
                >
                  <CardContent className="pt-6 space-y-4">
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      {t.content}
                    </p>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 text-xs">
                        <AvatarFallback>
                          {t.name
                            .split(" ")
                            .map((x) => x[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-xs font-medium text-neutral-100">
                        {t.name}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Blog / Conseils */}
        <section id="blog" className="border-b border-white/5 bg-neutral-950">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                  Nos conseils
                </p>
                <h2 className="text-xl md:text-2xl font-semibold mt-1">
                  Articles récents
                </h2>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Voir tous les articles
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {blogPosts.map((post) => (
                <Card
                  key={post.title}
                  className="bg-neutral-900/60 border-neutral-800 hover:border-amber-500/60 transition-colors"
                >
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>{post.category}</span>
                      <span className="h-0.5 w-4 bg-neutral-700" />
                      <span>{post.date}</span>
                    </div>
                    <div className="text-sm font-medium text-neutral-50">
                      {post.title}
                    </div>
                    <Button variant="link" className="px-0 text-xs">
                      Lire l&apos;article →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Showrooms */}
        <section
          id="showrooms"
          className="border-b border-white/5 bg-neutral-945"
        >
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="text-center mb-8 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
                Visitez nos showrooms
              </p>
              <h2 className="text-xl md:text-2xl font-semibold">
                Découvrez nos espaces d&apos;inspiration
              </h2>
            </div>

            <div className="grid md:grid-cols-4 gap-4 text-sm">
              {showrooms.map((s) => (
                <Card
                  key={s}
                  className="bg-neutral-900/60 border-neutral-800"
                >
                  <CardContent className="pt-6 space-y-3">
                    <div className="aspect-video rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900" />
                    <div className="font-medium text-neutral-100">{s}</div>
                    <Button variant="link" className="px-0 text-xs">
                      Voir le showroom →
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-10 text-center space-y-2">
              <p className="text-xs text-neutral-400">
                Nous serions ravis de coopérer pour bâtir des maisons de rêve.
              </p>
              <Button className="bg-amber-500 text-neutral-950">
                Contacter notre équipe
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        id="footer"
        className="bg-neutral-950 border-t border-white/10"
      >
        <div className="max-w-6xl mx-auto px-4 py-10 text-sm text-neutral-300 grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-amber-500" />
              <span className="text-sm font-semibold tracking-wide">
                COBAM GROUP
              </span>
            </div>
            <p className="text-xs text-neutral-400 max-w-xs">
              Matériaux de construction, carrelage, marbre, sanitaire et
              robinetterie pour des projets durables et inspirants.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-3">
              Nos produits
            </h3>
            <ul className="space-y-1 text-xs">
              <li>Marbre</li>
              <li>Carrelage</li>
              <li>Finition</li>
              <li>Matériaux de construction</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400 mb-3">
              Liens utiles
            </h3>
            <ul className="space-y-1 text-xs">
              <li>Accueil</li>
              <li>Produits</li>
              <li>Notre histoire</li>
              <li>À propos de nous</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Contact
            </h3>
            <div className="text-xs space-y-1">
              <div>E-mail : contact@cobamgroup.com</div>
              <div>Tél : +216 26 833 101</div>
            </div>
            <div className="flex gap-2 pt-1">
              <div className="h-7 w-7 rounded-full bg-neutral-800" />
              <div className="h-7 w-7 rounded-full bg-neutral-800" />
              <div className="h-7 w-7 rounded-full bg-neutral-800" />
              <div className="h-7 w-7 rounded-full bg-neutral-800" />
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 text-[11px] text-neutral-500 py-3 text-center">
          © {new Date().getFullYear()} COBAM GROUP (clone demo). Tous droits
          réservés.
        </div>
      </footer>
    </div>
  );
}
