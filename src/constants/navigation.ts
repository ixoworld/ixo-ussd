export const EVENT_TYPES = {
  START: "START",
  INPUT: "INPUT",
} as const;

export const EVENT_INPUTS = {
  BACK: "0",
  EXIT: "*",
} as const;

export const EXIT_ALIASES = ["*", "exit", "cancel"] as const;
export const BACK_ALIASES = ["back", "0"] as const;
