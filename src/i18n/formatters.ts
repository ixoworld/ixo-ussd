import type { FormattersInitializer } from "typesafe-i18n";
import type { Formatters, Locales } from "./i18n-types.js";

export const initFormatters: FormattersInitializer<Locales, Formatters> = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  locale: Locales
) => {
  const formatters: Formatters = {
    // add your formatter functions here
  };

  return formatters;
};
