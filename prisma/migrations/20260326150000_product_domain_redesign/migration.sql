-- CreateEnum
CREATE TYPE "ProductLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductVisibility" AS ENUM ('HIDDEN', 'PUBLIC');

-- CreateEnum
CREATE TYPE "ProductCommercialMode" AS ENUM ('REFERENCE_ONLY', 'QUOTE_ONLY', 'SELLABLE');

-- CreateEnum
CREATE TYPE "ProductPriceVisibility" AS ENUM ('HIDDEN', 'VISIBLE');

-- CreateEnum
CREATE TYPE "ProductAttributeScope" AS ENUM ('FAMILY', 'VARIANT');

-- CreateEnum
CREATE TYPE "ProductAttributeDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'ENUM', 'COLOR', 'JSON');

-- CreateEnum
CREATE TYPE "ProductPromotionKind" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT', 'CONTENT_ONLY');

-- DropForeignKey
ALTER TABLE "product_media_links" DROP CONSTRAINT "product_media_links_media_id_fkey";

-- DropForeignKey
ALTER TABLE "product_media_links" DROP CONSTRAINT "product_media_links_product_id_fkey";

-- DropForeignKey
ALTER TABLE "product_model_media_links" DROP CONSTRAINT "product_model_media_links_media_id_fkey";

-- DropForeignKey
ALTER TABLE "product_model_media_links" DROP CONSTRAINT "product_model_media_links_model_id_fkey";

-- DropForeignKey
ALTER TABLE "product_model_tag_links" DROP CONSTRAINT "product_model_tag_links_model_id_fkey";

-- DropForeignKey
ALTER TABLE "product_model_tag_links" DROP CONSTRAINT "product_model_tag_links_tag_id_fkey";

-- DropForeignKey
ALTER TABLE "product_models" DROP CONSTRAINT "product_models_brand_id_fkey";

-- DropForeignKey
ALTER TABLE "product_models" DROP CONSTRAINT "product_models_product_type_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_color_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_finish_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_material_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_model_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_size_id_fkey";

-- AlterTable
ALTER TABLE "product_types" DROP COLUMN "image_url",
DROP COLUMN "image_url_hd";

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "avatar_url";

-- DropTable
DROP TABLE "colors";

-- DropTable
DROP TABLE "finishes";

-- DropTable
DROP TABLE "materials";

-- DropTable
DROP TABLE "product_media_links";

-- DropTable
DROP TABLE "product_model_media_links";

-- DropTable
DROP TABLE "product_model_tag_links";

-- DropTable
DROP TABLE "product_models";

-- DropTable
DROP TABLE "products";

-- DropTable
DROP TABLE "sizes";

-- DropEnum
DROP TYPE "WorkflowStatus";

-- CreateTable
CREATE TABLE "product_families" (
    "id" BIGSERIAL NOT NULL,
    "brand_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,
    "default_variant_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(255),
    "excerpt" TEXT,
    "description" TEXT,
    "description_seo" TEXT,
    "lifecycle_status" "ProductLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ProductVisibility" NOT NULL DEFAULT 'HIDDEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" BIGSERIAL NOT NULL,
    "family_id" BIGINT NOT NULL,
    "sku" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(255),
    "description" TEXT,
    "lifecycle_status" "ProductLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "ProductVisibility" NOT NULL DEFAULT 'HIDDEN',
    "commercial_mode" "ProductCommercialMode" NOT NULL DEFAULT 'REFERENCE_ONLY',
    "price_visibility" "ProductPriceVisibility" NOT NULL DEFAULT 'HIDDEN',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_family_tag_links" (
    "family_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,

    CONSTRAINT "product_family_tag_links_pkey" PRIMARY KEY ("family_id","tag_id")
);

-- CreateTable
CREATE TABLE "product_family_media_links" (
    "family_id" BIGINT NOT NULL,
    "media_id" BIGINT NOT NULL,
    "role" "MediaLinkRole" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_family_media_links_pkey" PRIMARY KEY ("family_id","media_id")
);

-- CreateTable
CREATE TABLE "product_variant_media_links" (
    "variant_id" BIGINT NOT NULL,
    "media_id" BIGINT NOT NULL,
    "role" "MediaLinkRole" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_variant_media_links_pkey" PRIMARY KEY ("variant_id","media_id")
);

-- CreateTable
CREATE TABLE "product_variant_prices" (
    "id" BIGSERIAL NOT NULL,
    "variant_id" BIGINT NOT NULL,
    "currency_code" CHAR(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "compare_at_amount" DECIMAL(12,2),
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variant_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collections" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_collection_family_links" (
    "collection_id" BIGINT NOT NULL,
    "family_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_collection_family_links_pkey" PRIMARY KEY ("collection_id","family_id")
);

-- CreateTable
CREATE TABLE "product_collection_variant_links" (
    "collection_id" BIGINT NOT NULL,
    "variant_id" BIGINT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_collection_variant_links_pkey" PRIMARY KEY ("collection_id","variant_id")
);

-- CreateTable
CREATE TABLE "product_promotions" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "kind" "ProductPromotionKind" NOT NULL,
    "amount" DECIMAL(12,2),
    "label" VARCHAR(120),
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_promotion_family_links" (
    "promotion_id" BIGINT NOT NULL,
    "family_id" BIGINT NOT NULL,

    CONSTRAINT "product_promotion_family_links_pkey" PRIMARY KEY ("promotion_id","family_id")
);

-- CreateTable
CREATE TABLE "product_promotion_variant_links" (
    "promotion_id" BIGINT NOT NULL,
    "variant_id" BIGINT NOT NULL,

    CONSTRAINT "product_promotion_variant_links_pkey" PRIMARY KEY ("promotion_id","variant_id")
);

-- CreateTable
CREATE TABLE "product_promotion_category_links" (
    "promotion_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,

    CONSTRAINT "product_promotion_category_links_pkey" PRIMARY KEY ("promotion_id","category_id")
);

-- CreateTable
CREATE TABLE "product_promotion_brand_links" (
    "promotion_id" BIGINT NOT NULL,
    "brand_id" BIGINT NOT NULL,

    CONSTRAINT "product_promotion_brand_links_pkey" PRIMARY KEY ("promotion_id","brand_id")
);

-- CreateTable
CREATE TABLE "product_promotion_collection_links" (
    "promotion_id" BIGINT NOT NULL,
    "collection_id" BIGINT NOT NULL,

    CONSTRAINT "product_promotion_collection_links_pkey" PRIMARY KEY ("promotion_id","collection_id")
);

-- CreateTable
CREATE TABLE "product_attribute_definitions" (
    "id" BIGSERIAL NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "scope" "ProductAttributeScope" NOT NULL,
    "data_type" "ProductAttributeDataType" NOT NULL,
    "unit" VARCHAR(50),
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "is_variant_axis" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_options" (
    "id" BIGSERIAL NOT NULL,
    "attribute_id" BIGINT NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255) NOT NULL,
    "color_hex" VARCHAR(32),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category_attribute_links" (
    "category_id" BIGINT NOT NULL,
    "attribute_id" BIGINT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_category_attribute_links_pkey" PRIMARY KEY ("category_id","attribute_id")
);

-- CreateTable
CREATE TABLE "product_family_attribute_values" (
    "family_id" BIGINT NOT NULL,
    "attribute_id" BIGINT NOT NULL,
    "option_id" BIGINT,
    "value_text" TEXT,
    "value_number" DECIMAL(18,4),
    "value_boolean" BOOLEAN,
    "value_json" JSONB,

    CONSTRAINT "product_family_attribute_values_pkey" PRIMARY KEY ("family_id","attribute_id")
);

-- CreateTable
CREATE TABLE "product_variant_attribute_values" (
    "variant_id" BIGINT NOT NULL,
    "attribute_id" BIGINT NOT NULL,
    "option_id" BIGINT,
    "value_text" TEXT,
    "value_number" DECIMAL(18,4),
    "value_boolean" BOOLEAN,
    "value_json" JSONB,

    CONSTRAINT "product_variant_attribute_values_pkey" PRIMARY KEY ("variant_id","attribute_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_families_slug_key" ON "product_families"("slug");

-- CreateIndex
CREATE INDEX "product_families_brand_id_idx" ON "product_families"("brand_id");

-- CreateIndex
CREATE INDEX "product_families_category_id_idx" ON "product_families"("category_id");

-- CreateIndex
CREATE INDEX "product_families_default_variant_id_idx" ON "product_families"("default_variant_id");

-- CreateIndex
CREATE INDEX "product_families_lifecycle_status_idx" ON "product_families"("lifecycle_status");

-- CreateIndex
CREATE INDEX "product_families_visibility_idx" ON "product_families"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "product_families_brand_id_category_id_name_key" ON "product_families"("brand_id", "category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_slug_key" ON "product_variants"("slug");

-- CreateIndex
CREATE INDEX "product_variants_family_id_idx" ON "product_variants"("family_id");

-- CreateIndex
CREATE INDEX "product_variants_lifecycle_status_idx" ON "product_variants"("lifecycle_status");

-- CreateIndex
CREATE INDEX "product_variants_visibility_idx" ON "product_variants"("visibility");

-- CreateIndex
CREATE INDEX "product_variants_commercial_mode_idx" ON "product_variants"("commercial_mode");

-- CreateIndex
CREATE INDEX "product_variants_price_visibility_idx" ON "product_variants"("price_visibility");

-- CreateIndex
CREATE INDEX "product_family_tag_links_tag_id_idx" ON "product_family_tag_links"("tag_id");

-- CreateIndex
CREATE INDEX "product_family_media_links_media_id_idx" ON "product_family_media_links"("media_id");

-- CreateIndex
CREATE INDEX "product_variant_media_links_media_id_idx" ON "product_variant_media_links"("media_id");

-- CreateIndex
CREATE INDEX "product_variant_prices_variant_id_idx" ON "product_variant_prices"("variant_id");

-- CreateIndex
CREATE INDEX "product_variant_prices_currency_code_idx" ON "product_variant_prices"("currency_code");

-- CreateIndex
CREATE INDEX "product_variant_prices_is_active_idx" ON "product_variant_prices"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_collections_slug_key" ON "product_collections"("slug");

-- CreateIndex
CREATE INDEX "product_collections_sort_order_idx" ON "product_collections"("sort_order");

-- CreateIndex
CREATE INDEX "product_collections_is_active_idx" ON "product_collections"("is_active");

-- CreateIndex
CREATE INDEX "product_collection_family_links_family_id_idx" ON "product_collection_family_links"("family_id");

-- CreateIndex
CREATE INDEX "product_collection_variant_links_variant_id_idx" ON "product_collection_variant_links"("variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_promotions_slug_key" ON "product_promotions"("slug");

-- CreateIndex
CREATE INDEX "product_promotions_is_active_idx" ON "product_promotions"("is_active");

-- CreateIndex
CREATE INDEX "product_promotion_family_links_family_id_idx" ON "product_promotion_family_links"("family_id");

-- CreateIndex
CREATE INDEX "product_promotion_variant_links_variant_id_idx" ON "product_promotion_variant_links"("variant_id");

-- CreateIndex
CREATE INDEX "product_promotion_category_links_category_id_idx" ON "product_promotion_category_links"("category_id");

-- CreateIndex
CREATE INDEX "product_promotion_brand_links_brand_id_idx" ON "product_promotion_brand_links"("brand_id");

-- CreateIndex
CREATE INDEX "product_promotion_collection_links_collection_id_idx" ON "product_promotion_collection_links"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_definitions_key_key" ON "product_attribute_definitions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_definitions_slug_key" ON "product_attribute_definitions"("slug");

-- CreateIndex
CREATE INDEX "product_attribute_definitions_scope_idx" ON "product_attribute_definitions"("scope");

-- CreateIndex
CREATE INDEX "product_attribute_definitions_data_type_idx" ON "product_attribute_definitions"("data_type");

-- CreateIndex
CREATE INDEX "product_attribute_definitions_sort_order_idx" ON "product_attribute_definitions"("sort_order");

-- CreateIndex
CREATE INDEX "product_attribute_options_sort_order_idx" ON "product_attribute_options"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_options_attribute_id_value_key" ON "product_attribute_options"("attribute_id", "value");

-- CreateIndex
CREATE INDEX "product_category_attribute_links_attribute_id_idx" ON "product_category_attribute_links"("attribute_id");

-- CreateIndex
CREATE INDEX "product_category_attribute_links_sort_order_idx" ON "product_category_attribute_links"("sort_order");

-- CreateIndex
CREATE INDEX "product_family_attribute_values_option_id_idx" ON "product_family_attribute_values"("option_id");

-- CreateIndex
CREATE INDEX "product_variant_attribute_values_option_id_idx" ON "product_variant_attribute_values"("option_id");

-- AddForeignKey
ALTER TABLE "product_families" ADD CONSTRAINT "product_families_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "product_brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_families" ADD CONSTRAINT "product_families_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_families" ADD CONSTRAINT "product_families_default_variant_id_fkey" FOREIGN KEY ("default_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_tag_links" ADD CONSTRAINT "product_family_tag_links_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_tag_links" ADD CONSTRAINT "product_family_tag_links_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_media_links" ADD CONSTRAINT "product_family_media_links_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_media_links" ADD CONSTRAINT "product_family_media_links_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_media_links" ADD CONSTRAINT "product_variant_media_links_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_media_links" ADD CONSTRAINT "product_variant_media_links_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_prices" ADD CONSTRAINT "product_variant_prices_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection_family_links" ADD CONSTRAINT "product_collection_family_links_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "product_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection_family_links" ADD CONSTRAINT "product_collection_family_links_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection_variant_links" ADD CONSTRAINT "product_collection_variant_links_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "product_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_collection_variant_links" ADD CONSTRAINT "product_collection_variant_links_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_family_links" ADD CONSTRAINT "product_promotion_family_links_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "product_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_family_links" ADD CONSTRAINT "product_promotion_family_links_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_variant_links" ADD CONSTRAINT "product_promotion_variant_links_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "product_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_variant_links" ADD CONSTRAINT "product_promotion_variant_links_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_category_links" ADD CONSTRAINT "product_promotion_category_links_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "product_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_category_links" ADD CONSTRAINT "product_promotion_category_links_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_brand_links" ADD CONSTRAINT "product_promotion_brand_links_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "product_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_brand_links" ADD CONSTRAINT "product_promotion_brand_links_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "product_brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_collection_links" ADD CONSTRAINT "product_promotion_collection_links_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "product_promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_promotion_collection_links" ADD CONSTRAINT "product_promotion_collection_links_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "product_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_attribute_options" ADD CONSTRAINT "product_attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category_attribute_links" ADD CONSTRAINT "product_category_attribute_links_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category_attribute_links" ADD CONSTRAINT "product_category_attribute_links_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_attribute_values" ADD CONSTRAINT "product_family_attribute_values_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_attribute_values" ADD CONSTRAINT "product_family_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family_attribute_values" ADD CONSTRAINT "product_family_attribute_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "product_attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_attribute_values" ADD CONSTRAINT "product_variant_attribute_values_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_attribute_values" ADD CONSTRAINT "product_variant_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attribute_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variant_attribute_values" ADD CONSTRAINT "product_variant_attribute_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "product_attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
