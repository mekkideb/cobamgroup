-- 1. Create the explicit product subcategories table.
CREATE TABLE "product_subcategories" (
    "id" BIGSERIAL NOT NULL,
    "category_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subtitle" VARCHAR(255),
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "description_seo" TEXT,
    "image_media_id" BIGINT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_subcategories_pkey" PRIMARY KEY ("id")
);

-- 2. Migrate former child categories into explicit subcategories.
INSERT INTO "product_subcategories" (
    "id",
    "category_id",
    "name",
    "subtitle",
    "slug",
    "description",
    "description_seo",
    "image_media_id",
    "sort_order",
    "is_active",
    "created_at",
    "updated_at"
)
SELECT
    child."id",
    child."parent_id",
    child."name",
    child."subtitle",
    child."slug",
    child."description",
    child."description_seo",
    child."image_media_id",
    child."sort_order",
    child."is_active",
    child."created_at",
    child."updated_at"
FROM "product_types" AS child
WHERE child."parent_id" IS NOT NULL;

SELECT setval(
    pg_get_serial_sequence('"product_subcategories"', 'id'),
    COALESCE((SELECT MAX("id") FROM "product_subcategories"), 1),
    true
);

-- 3. Create the new family <-> subcategory relation table and preserve previous
--    family links that were pointing to child categories.
CREATE TABLE "_ProductFamilySubcategories" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_ProductFamilySubcategories_AB_pkey" PRIMARY KEY ("A","B")
);

INSERT INTO "_ProductFamilySubcategories" ("A", "B")
SELECT DISTINCT relation."A", relation."B"
FROM "_ProductFamilyCategories" AS relation
INNER JOIN "product_types" AS child
    ON child."id" = relation."B"
WHERE child."parent_id" IS NOT NULL;

-- 4. Remove old child categories from the root table so product_types becomes
--    root-only, then drop the generic parent/child structure.
DELETE FROM "product_types"
WHERE "parent_id" IS NOT NULL;

ALTER TABLE "product_types" DROP CONSTRAINT "product_types_parent_id_fkey";
ALTER TABLE "product_types" DROP COLUMN "parent_id";

-- 5. Drop the old generic family/category relation table.
ALTER TABLE "_ProductFamilyCategories" DROP CONSTRAINT "_ProductFamilyCategories_A_fkey";
ALTER TABLE "_ProductFamilyCategories" DROP CONSTRAINT "_ProductFamilyCategories_B_fkey";
DROP TABLE "_ProductFamilyCategories";

-- 6. Add indexes and foreign keys for the new structure.
CREATE INDEX "product_subcategories_category_id_idx" ON "product_subcategories"("category_id");
CREATE INDEX "product_subcategories_image_media_id_idx" ON "product_subcategories"("image_media_id");
CREATE INDEX "product_subcategories_sort_order_idx" ON "product_subcategories"("sort_order");
CREATE INDEX "product_subcategories_is_active_idx" ON "product_subcategories"("is_active");
CREATE UNIQUE INDEX "product_subcategories_category_id_slug_key" ON "product_subcategories"("category_id", "slug");
CREATE INDEX "_ProductFamilySubcategories_B_index" ON "_ProductFamilySubcategories"("B");

ALTER TABLE "product_subcategories"
    ADD CONSTRAINT "product_subcategories_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "product_types"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_subcategories"
    ADD CONSTRAINT "product_subcategories_image_media_id_fkey"
    FOREIGN KEY ("image_media_id") REFERENCES "media"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "_ProductFamilySubcategories"
    ADD CONSTRAINT "_ProductFamilySubcategories_A_fkey"
    FOREIGN KEY ("A") REFERENCES "product_families"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductFamilySubcategories"
    ADD CONSTRAINT "_ProductFamilySubcategories_B_fkey"
    FOREIGN KEY ("B") REFERENCES "product_subcategories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
