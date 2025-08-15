/**
 * Swahili translations
 */
import type { BaseTranslation } from "../i18n-types.js";

const swa: BaseTranslation = {
  welcome: {
    title: "Karibu!",
    menu: {
      account: "Akaunti Yangu",
      services: "Huduma",
      help: "Msaada",
    },
  },
  account: {
    title: "Maelezo ya Akaunti",
    info: "Simu: {phone}",
    menu: {
      balance: "Salio",
      profile: "Wasifu",
      back: "Rudi",
    },
  },
  balance: {
    title: "Salio",
    info: "Salio lako la sasa ni: {amount} {currency}",
    back: "Rudi",
  },
  profile: {
    title: "Wasifu",
    phone: "Simu: {phone}",
    language: "Lugha: {language}",
    back: "Rudi",
  },
  services: {
    title: "Huduma Zinazopatikana",
    menu: {
      transfer: "Hamisha",
      payments: "Malipo",
      claims: "Madai",
      back: "Rudi",
    },
  },
  help: {
    title: "Msaada",
    contact: "Unahitaji msaada? Wasiliana na msaada kupitia: {phone}",
    back: "Rudi",
  },
  common: {
    error: "Hitilafu imetokea. Tafadhali jaribu tena baadaye.",
    invalidInput: "Ingizo batili. Tafadhali jaribu tena.",
    back: "Rudi kwa menyu kuu",
  },
};

export default swa;
