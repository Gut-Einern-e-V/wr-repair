export const messages = {
  de: {
    navigation: { stories: "Geschichten", project: "Projekt", supporters: "Unterstützer", live: "Live-Stand", submit: "Einreichen" },
    footer: { privacy: "Datenschutz", imprint: "Impressum", accessibility: "Barrierefreiheit" },
  },
  en: {
    navigation: { stories: "Stories", project: "Project", supporters: "Supporters", live: "Live status", submit: "Submit" },
    footer: { privacy: "Privacy", imprint: "Legal notice", accessibility: "Accessibility" },
  },
} as const;

export type Locale = keyof typeof messages;

export function getMessages(locale: Locale = "de") {
  return messages[locale];
}