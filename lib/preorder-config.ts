export type PreorderRequiredFields = {
  shirtName: boolean;
  shirtNumber: boolean;
  shippingAddress: boolean;
  note: boolean;
  paymentNote: boolean;
};

export type PreorderConfig = {
  unitPrice: number;
  coverImageUrl: string;
  productImageUrl: string;
  teamImageUrls: Record<string, string>;
  customFieldsEnabled: boolean;
  requiredFields: PreorderRequiredFields;
};

export const DEFAULT_PREORDER_CONFIG: PreorderConfig = {
  unitPrice: 390,
  coverImageUrl: "",
  productImageUrl: "",
  teamImageUrls: {
    photha: "",
    benjamarachutit: "",
    daruna: "",
    sarasit: "",
  },
  customFieldsEnabled: true,
  requiredFields: {
    shirtName: true,
    shirtNumber: true,
    shippingAddress: true,
    note: false,
    paymentNote: false,
  },
};

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePrice(value: unknown) {
  const price = Number(value);

  return Number.isFinite(price) && price > 0
    ? Math.round(price)
    : DEFAULT_PREORDER_CONFIG.unitPrice;
}

function parseConfig(rawValue: unknown) {
  if (!rawValue) return {};

  if (typeof rawValue === "string") {
    try {
      return JSON.parse(rawValue) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof rawValue === "object") {
    return rawValue as Record<string, unknown>;
  }

  return {};
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePreorderConfig(
  rawValue: unknown,
  legacyCustomFieldsEnabled?: boolean,
): PreorderConfig {
  const parsed = parseConfig(rawValue);
  const requiredFields =
    typeof parsed.requiredFields === "object" && parsed.requiredFields
      ? (parsed.requiredFields as Record<string, unknown>)
      : {};
  const teamImageUrls =
    typeof parsed.teamImageUrls === "object" && parsed.teamImageUrls
      ? (parsed.teamImageUrls as Record<string, unknown>)
      : {};
  const customFieldsEnabled = normalizeBoolean(
    parsed.customFieldsEnabled,
    legacyCustomFieldsEnabled ?? DEFAULT_PREORDER_CONFIG.customFieldsEnabled,
  );

  return {
    unitPrice: normalizePrice(parsed.unitPrice),
    coverImageUrl:
      normalizeText(parsed.coverImageUrl) || normalizeText(parsed.productImageUrl),
    productImageUrl: normalizeText(parsed.productImageUrl),
    teamImageUrls: {
      photha: normalizeText(teamImageUrls.photha),
      benjamarachutit: normalizeText(teamImageUrls.benjamarachutit),
      daruna: normalizeText(teamImageUrls.daruna),
      sarasit: normalizeText(teamImageUrls.sarasit),
    },
    customFieldsEnabled,
    requiredFields: {
      shirtName: customFieldsEnabled
        ? normalizeBoolean(
            requiredFields.shirtName,
            DEFAULT_PREORDER_CONFIG.requiredFields.shirtName,
          )
        : false,
      shirtNumber: customFieldsEnabled
        ? normalizeBoolean(
            requiredFields.shirtNumber,
            DEFAULT_PREORDER_CONFIG.requiredFields.shirtNumber,
          )
        : false,
      shippingAddress: normalizeBoolean(
        requiredFields.shippingAddress,
        DEFAULT_PREORDER_CONFIG.requiredFields.shippingAddress,
      ),
      note: normalizeBoolean(
        requiredFields.note,
        DEFAULT_PREORDER_CONFIG.requiredFields.note,
      ),
      paymentNote: normalizeBoolean(
        requiredFields.paymentNote,
        DEFAULT_PREORDER_CONFIG.requiredFields.paymentNote,
      ),
    },
  };
}
