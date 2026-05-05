export type PreorderCampaign = {
  id: string;
  name: string;
  description: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  terms: string | null;
  payment_bank_name: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_note: string | null;
};

export type PreorderTeam = {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  colors: string | null;
  logo_url: string | null;
};

export type PreorderProductType =
  | "jersey"
  | "shorts"
  | "socks"
  | "training_shirt"
  | "scarf"
  | "souvenir"
  | "other";

export type PreorderProduct = {
  id: string;
  campaign_id: string | null;
  team_id: string | null;
  product_type: PreorderProductType;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  requires_size: boolean;
  allows_custom_name: boolean;
  requires_custom_name: boolean;
  allows_custom_number: boolean;
  requires_custom_number: boolean;
  sort_order: number;
  team: PreorderTeam | null;
};

export const productTypeLabels: Record<PreorderProductType, string> = {
  jersey: "เสื้อแข่ง",
  shorts: "กางเกง",
  socks: "ถุงเท้า",
  training_shirt: "เสื้อซ้อม",
  scarf: "ผ้าพันคอ",
  souvenir: "ของที่ระลึก",
  other: "อื่น ๆ",
};
