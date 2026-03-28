-- Preserve existing product family/category assignments while moving to many-to-many.
CREATE TABLE "_ProductFamilyCategories" (
    "A" BIGINT NOT NULL,
    "B" BIGINT NOT NULL,

    CONSTRAINT "_ProductFamilyCategories_AB_pkey" PRIMARY KEY ("A","B")
);

INSERT INTO "_ProductFamilyCategories" ("A", "B")
SELECT "category_id", "id"
FROM "product_families"
WHERE "category_id" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX "_ProductFamilyCategories_B_index" ON "_ProductFamilyCategories"("B");

ALTER TABLE "_ProductFamilyCategories"
ADD CONSTRAINT "_ProductFamilyCategories_A_fkey"
FOREIGN KEY ("A") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductFamilyCategories"
ADD CONSTRAINT "_ProductFamilyCategories_B_fkey"
FOREIGN KEY ("B") REFERENCES "product_families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_families" DROP CONSTRAINT "product_families_category_id_fkey";
DROP INDEX "product_families_brand_id_category_id_name_key";
DROP INDEX "product_families_category_id_idx";
ALTER TABLE "product_families" DROP COLUMN "category_id";

CREATE UNIQUE INDEX "product_families_brand_id_name_key"
ON "product_families"("brand_id", "name");
