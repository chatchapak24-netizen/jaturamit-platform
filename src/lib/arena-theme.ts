export const ARENA_SCHOOLS = {
  DARUNA: {
    key: "DARUNA",
    label: "Daruna (ดรุณา)",
    shortLabel: "DARUNA",
    kingdom: "Hawk Kingdom",
    kingdomLabel: "Hawk Kingdom (อาณาจักรเหยี่ยว)",
    mascot: "Hawk",
    colors: {
      primary: "#c1121f",
      secondary: "#ffffff",
      accent: "#f7c948",
      dark: "#30040a",
      ink: "#fff7e6",
    },
    gradient:
      "linear-gradient(145deg, #30040a 0%, #8f0713 38%, #c1121f 62%, #f7c948 100%)",
    glow: "rgba(247, 201, 72, 0.42)",
  },
  PHOTHA: {
    key: "PHOTHA",
    label: "Photha (โพธา)",
    shortLabel: "PHOTHA",
    kingdom: "Deer Empire",
    kingdomLabel: "Deer Empire (จักรวรรดิกวาง)",
    mascot: "Deer",
    colors: {
      primary: "#ffd400",
      secondary: "#1746a2",
      accent: "#ffffff",
      dark: "#071a45",
      ink: "#fffbe6",
    },
    gradient:
      "linear-gradient(145deg, #071a45 0%, #1746a2 42%, #ffd400 78%, #fff7b0 100%)",
    glow: "rgba(255, 212, 0, 0.44)",
  },
  SARASIT: {
    key: "SARASIT",
    label: "Sarasit (สารสิทธิ์)",
    shortLabel: "SARASIT",
    kingdom: "Blue Dynasty",
    kingdomLabel: "Blue Dynasty (ราชวงศ์น้ำเงิน)",
    mascot: "Blue Dynasty",
    colors: {
      primary: "#0f5bd7",
      secondary: "#f3c547",
      accent: "#cfe7ff",
      dark: "#061633",
      ink: "#edf6ff",
    },
    gradient:
      "linear-gradient(145deg, #061633 0%, #0f3f96 40%, #0f5bd7 68%, #f3c547 100%)",
    glow: "rgba(15, 91, 215, 0.5)",
  },
  BENJ: {
    key: "BENJ",
    label: "Benj (เบญจ)",
    shortLabel: "BENJ",
    kingdom: "Pink Wolf Pack",
    kingdomLabel: "Pink Wolf Pack (ฝูงหมาป่าสีชมพู)",
    mascot: "Wolf",
    colors: {
      primary: "#ff4fb8",
      secondary: "#f4c95d",
      accent: "#101947",
      dark: "#18051b",
      ink: "#fff0fb",
    },
    gradient:
      "linear-gradient(145deg, #18051b 0%, #101947 34%, #ff4fb8 70%, #f4c95d 100%)",
    glow: "rgba(255, 79, 184, 0.46)",
  },
} as const;

export const ARENA_RARITIES = {
  common: {
    key: "common",
    label: "Common (ธรรมดา)",
    accent: "#d4d4d8",
    foil: "#71717a",
    glow: "rgba(212, 212, 216, 0.22)",
    frame:
      "linear-gradient(145deg, #71717a 0%, #f4f4f5 46%, #52525b 100%)",
  },
  rare: {
    key: "rare",
    label: "Rare (หายาก)",
    accent: "#38bdf8",
    foil: "#0ea5e9",
    glow: "rgba(56, 189, 248, 0.34)",
    frame:
      "linear-gradient(145deg, #075985 0%, #38bdf8 48%, #e0f2fe 100%)",
  },
  elite: {
    key: "elite",
    label: "Elite (ชั้นยอด)",
    accent: "#22c55e",
    foil: "#16a34a",
    glow: "rgba(34, 197, 94, 0.34)",
    frame:
      "linear-gradient(145deg, #14532d 0%, #22c55e 44%, #dcfce7 100%)",
  },
  epic: {
    key: "epic",
    label: "Epic (มหากาพย์)",
    accent: "#c084fc",
    foil: "#9333ea",
    glow: "rgba(192, 132, 252, 0.38)",
    frame:
      "linear-gradient(145deg, #581c87 0%, #c084fc 48%, #f5d0fe 100%)",
  },
  legend: {
    key: "legend",
    label: "Legend (ตำนาน)",
    accent: "#f59e0b",
    foil: "#facc15",
    glow: "rgba(250, 204, 21, 0.42)",
    frame:
      "linear-gradient(145deg, #78350f 0%, #f59e0b 42%, #fff7ed 100%)",
  },
  mythic: {
    key: "mythic",
    label: "Mythic (เทพตำนาน)",
    accent: "#fb7185",
    foil: "#f0abfc",
    glow: "rgba(251, 113, 133, 0.48)",
    frame:
      "linear-gradient(145deg, #4c0519 0%, #fb7185 35%, #f0abfc 70%, #fef3c7 100%)",
  },
} as const;

export type ArenaSchoolKey = keyof typeof ARENA_SCHOOLS;
export type ArenaRarityKey = keyof typeof ARENA_RARITIES;
export type ArenaSchoolTheme = (typeof ARENA_SCHOOLS)[ArenaSchoolKey];
export type ArenaRarityTheme = (typeof ARENA_RARITIES)[ArenaRarityKey];

export function getArenaSchoolTheme(school: string): ArenaSchoolTheme {
  const normalized = school.trim().toUpperCase();

  if (normalized in ARENA_SCHOOLS) {
    return ARENA_SCHOOLS[normalized as ArenaSchoolKey];
  }

  if (normalized.includes("DARUNA") || normalized.includes("ดรุณ")) {
    return ARENA_SCHOOLS.DARUNA;
  }

  if (normalized.includes("PHOTHA") || normalized.includes("โพธ")) {
    return ARENA_SCHOOLS.PHOTHA;
  }

  if (normalized.includes("SARASIT") || normalized.includes("สารสิทธิ")) {
    return ARENA_SCHOOLS.SARASIT;
  }

  if (normalized.includes("BENJ") || normalized.includes("เบญ")) {
    return ARENA_SCHOOLS.BENJ;
  }

  return ARENA_SCHOOLS.DARUNA;
}

export function getArenaRarityTheme(rarity: string): ArenaRarityTheme {
  const normalized = rarity.trim().toLowerCase();

  if (normalized in ARENA_RARITIES) {
    return ARENA_RARITIES[normalized as ArenaRarityKey];
  }

  return ARENA_RARITIES.common;
}
