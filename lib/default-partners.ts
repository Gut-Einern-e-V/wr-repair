export type Partner = {
  id: string;
  name: string;
  websiteUrl: string;
  logoUrl: string;
};

export const defaultPartners: Partner[] = [
  { id: "bergische-gesellschaft", name: "Bergische Gesellschaft", websiteUrl: "https://bergische-gesellschaft.de/", logoUrl: "/partners/bergische-gesellschaft.png" },
  { id: "uni-wuppertal", name: "Bergische Universität Wuppertal", websiteUrl: "https://www.uni-wuppertal.de/de/", logoUrl: "/partners/uni-wuppertal.png" },
  { id: "cscp", name: "CSCP", websiteUrl: "https://www.cscp.org/", logoUrl: "/partners/cscp.png" },
  { id: "gut-einern", name: "Gut Einern e.V.", websiteUrl: "https://www.gut-einern.org/", logoUrl: "/partners/gut-einern.png" },
  { id: "gruenderschmiede", name: "Gründerschmiede Remscheid", websiteUrl: "https://gruenderschmiede.org/", logoUrl: "/partners/gruenderschmiede.png" },
  { id: "glaeserne-werkstatt", name: "Gläserne Werkstatt Solingen", websiteUrl: "https://www.glaeserne-werkstatt-solingen.de/", logoUrl: "/partners/glaeserne-werkstatt.png" },
  { id: "iat", name: "Institut Arbeit und Technik", websiteUrl: "https://www.iat.eu/", logoUrl: "/partners/iat.png" },
  { id: "wuppertal-institut", name: "Wuppertal Institut", websiteUrl: "https://wupperinst.org/", logoUrl: "/partners/wuppertal-institut.png" },
];
