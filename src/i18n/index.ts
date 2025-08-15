/**
 * Internationalization setup
 */
import type {
  Locales,
  Translation,
  TranslationFunctions,
} from "./i18n-types.js";

// Import dictionaries
import eng from "./eng/index.js";
import swa from "./swa/index.js";

// Create translation dictionaries
const dictionaries = {
  eng,
  swa,
};

export const defaultLocale: Locales = "eng";
export const locales: Locales[] = Object.keys(dictionaries) as Locales[];

// Export for use in app
export const translations = dictionaries;

// Types
export type { Locales, Translation, TranslationFunctions };
