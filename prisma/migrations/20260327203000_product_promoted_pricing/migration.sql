-- DropForeignKey
ALTER TABLE "product_promotion_brand_links" DROP CONSTRAINT "product_promotion_brand_links_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_brand_links" DROP CONSTRAINT "product_promotion_brand_links_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_category_links" DROP CONSTRAINT "product_promotion_category_links_category_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_category_links" DROP CONSTRAINT "product_promotion_category_links_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_collection_links" DROP CONSTRAINT "product_promotion_collection_links_collection_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_collection_links" DROP CONSTRAINT "product_promotion_collection_links_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_family_links" DROP CONSTRAINT "product_promotion_family_links_family_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_family_links" DROP CONSTRAINT "product_promotion_family_links_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_variant_links" DROP CONSTRAINT "product_promotion_variant_links_promotion_id_fkey";

-- DropForeignKey
ALTER TABLE "product_promotion_variant_links" DROP CONSTRAINT "product_promotion_variant_links_variant_id_fkey";

-- DropForeignKey
ALTER TABLE "product_variant_prices" DROP CONSTRAINT "product_variant_prices_variant_id_fkey";

-- AlterTable
ALTER TABLE "product_families"
ADD COLUMN "is_promoted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_variants"
ADD COLUMN "base_price_amount" DECIMAL(12,2),
ADD COLUMN "currency_code" CHAR(3) NOT NULL DEFAULT 'EUR',
ADD COLUMN "current_price_amount" DECIMAL(12,2),
ADD COLUMN "is_promoted" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "product_promotion_brand_links";

-- DropTable
DROP TABLE "product_promotion_category_links";

-- DropTable
DROP TABLE "product_promotion_collection_links";

-- DropTable
DROP TABLE "product_promotion_family_links";

-- DropTable
DROP TABLE "product_promotion_variant_links";

-- DropTable
DROP TABLE "product_promotions";

-- DropTable
DROP TABLE "product_variant_prices";

-- DropEnum
DROP TYPE "ProductPromotionKind";

-- CreateIndex
CREATE INDEX "product_families_is_promoted_idx" ON "product_families"("is_promoted");

-- CreateIndex
CREATE INDEX "product_variants_is_promoted_idx" ON "product_variants"("is_promoted");
