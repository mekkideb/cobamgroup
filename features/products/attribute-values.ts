import type { ProductAttributeDataType } from "./types";

type ParsedProductAttributeValue = {
  valueText: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueJson: unknown | null;
};

export function getProductAttributeDataTypeLabel(
  dataType: ProductAttributeDataType,
) {
  switch (dataType) {
    case "TEXT":
      return "Texte";
    case "NUMBER":
      return "Nombre";
    case "BOOLEAN":
      return "Booleen";
    case "ENUM":
      return "Liste";
    case "COLOR":
      return "Couleur";
    case "JSON":
      return "JSON";
    default:
      return dataType;
  }
}

export function parseRawProductAttributeValue(
  dataType: ProductAttributeDataType,
  rawValue: string | null,
): ParsedProductAttributeValue {
  const normalized =
    typeof rawValue === "string" ? rawValue.trim() : rawValue ?? null;

  if (!normalized) {
    return {
      valueText: null,
      valueNumber: null,
      valueBoolean: null,
      valueJson: null,
    };
  }

  switch (dataType) {
    case "NUMBER": {
      const parsedNumber = Number(normalized.replace(",", "."));
      if (!Number.isFinite(parsedNumber)) {
        throw new Error("La valeur numerique d'un attribut est invalide.");
      }

      return {
        valueText: null,
        valueNumber: parsedNumber,
        valueBoolean: null,
        valueJson: null,
      };
    }

    case "BOOLEAN": {
      if (normalized !== "true" && normalized !== "false") {
        throw new Error("La valeur booleenne d'un attribut est invalide.");
      }

      return {
        valueText: null,
        valueNumber: null,
        valueBoolean: normalized === "true",
        valueJson: null,
      };
    }

    case "JSON":
      return {
        valueText: null,
        valueNumber: null,
        valueBoolean: null,
        valueJson: JSON.parse(normalized),
      };

    case "TEXT":
    case "ENUM":
    case "COLOR":
    default:
      return {
        valueText: normalized,
        valueNumber: null,
        valueBoolean: null,
        valueJson: null,
      };
  }
}

export function formatStoredProductAttributeValue(input: {
  dataType: ProductAttributeDataType;
  valueText: string | null;
  valueNumber: { toString(): string } | number | null;
  valueBoolean: boolean | null;
  valueJson: unknown | null;
}): string | null {
  switch (input.dataType) {
    case "NUMBER":
      return input.valueNumber != null ? String(input.valueNumber) : null;
    case "BOOLEAN":
      return input.valueBoolean == null ? null : String(input.valueBoolean);
    case "JSON":
      return input.valueJson == null ? null : JSON.stringify(input.valueJson);
    case "TEXT":
    case "ENUM":
    case "COLOR":
    default:
      return input.valueText;
  }
}
