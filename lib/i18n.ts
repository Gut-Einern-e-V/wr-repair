export const messages = {
  de: {
    navigation: { stories: "Geschichten", project: "Projekt", supporters: "Unterstützung", lottery: "Gewinnspiel", live: "Live-Stand", submit: "Einreichen" },
    footer: { privacy: "Datenschutz", imprint: "Impressum", accessibility: "Barrierefreiheit", easyLanguage: "Leichte Sprache" },
  },
  en: {
    navigation: { stories: "Stories", project: "Project", supporters: "Supporters", lottery: "Prize draw", live: "Live status", submit: "Submit" },
    footer: { privacy: "Privacy", imprint: "Legal notice", accessibility: "Accessibility", easyLanguage: "Easy language" },
  },
} as const;

export type Locale = keyof typeof messages;

export function getMessages(locale: Locale = "de") {
  return messages[locale];
}