export type LegalLinkTarget =
  | "privacy"
  | "terms"
  | "cookies"
  | "sms"
  | "mailto-privacy"
  | "mailto-legal";

export type LegalSegment = {
  text: string;
  bold?: boolean;
  link?: LegalLinkTarget;
};

export type LegalBlock =
  | { kind: "paragraph"; segments: LegalSegment[] }
  | { kind: "bullets"; items: string[] };

export type LegalSectionContent = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  subtitle: string;
  sections: LegalSectionContent[];
  relatedRoute: "/privacy" | "/terms";
  relatedLabel: string;
  relatedDescription: string;
};
