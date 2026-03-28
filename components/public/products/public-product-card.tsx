import Image from "next/image";
import type { PublicProductSummary } from "@/features/products/public";

type PublicProductCardProps = {
  product: PublicProductSummary;
};

export default function PublicProductCard({ product }: PublicProductCardProps) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {product.imageThumbnailUrl ? (
          <Image
            src={product.imageThumbnailUrl}
            alt={product.imageAlt ?? product.name}
            fill
            className="object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-cobam-light-bg via-white to-cobam-light-bg px-8 text-center text-sm font-semibold text-cobam-dark-blue">
            {product.name}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6">
        <p className="text-xs font-semibold tracking-[0.28em] text-cobam-water-blue uppercase">
          {product.brandName}
        </p>

        <div className="space-y-3">
          <h2
            className="text-2xl font-bold leading-tight text-cobam-dark-blue"
            style={{ fontFamily: "var(--font-playfair), serif" }}
          >
            {product.name}
          </h2>

          {product.subtitle ? (
            <p className="text-sm font-medium text-slate-600">{product.subtitle}</p>
          ) : null}

          <p className="line-clamp-4 text-sm leading-7 text-slate-600">
            {product.excerpt}
          </p>
        </div>
      </div>
    </article>
  );
}
