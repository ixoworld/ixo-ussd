/**
 * English translations
 */
import type { BaseTranslation } from "../i18n-types.js";

const eng: BaseTranslation = {
  welcome: {
    title: "Welcome!",
    menu: {
      account: "My Account",
      services: "Services",
      help: "Help",
    },
  },
  account: {
    title: "Account Information",
    info: "Phone: {phone}",
    menu: {
      balance: "Balance",
      profile: "Profile",
      back: "Back",
    },
  },
  balance: {
    title: "Balance",
    info: "Your current balance is: {amount} {currency}",
    back: "Back",
  },
  profile: {
    title: "Profile",
    phone: "Phone: {phone}",
    language: "Language: {language}",
    back: "Back",
  },
  services: {
    title: "Available Services",
    menu: {
      transfer: "Transfer",
      payments: "Payments",
      claims: "Claims",
      back: "Back",
    },
  },
  help: {
    title: "Help",
    contact: "Need help? Contact support at: {phone}",
    back: "Back",
  },
  common: {
    error: "An error occurred. Please try again later.",
    invalidInput: "Invalid input. Please try again.",
    back: "Back to main menu",
  },
};

export default eng;
