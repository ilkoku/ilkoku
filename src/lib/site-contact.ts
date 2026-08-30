export const siteContact = {
  generalEmail: "ilkoku@ilkoku.com",
  supportEmail: "destek@ilkoku.com",
  socialLinks: [
    {
      id: "x",
      label: "X",
      shortLabel: "X",
      href: "https://x.com/ilkokucom",
      handle: "@ilkokucom",
    },
    {
      id: "instagram",
      label: "Instagram",
      shortLabel: "IG",
      href: "https://www.instagram.com/ilkokucom/",
      handle: "@ilkokucom",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      shortLabel: "in",
      href: "https://www.linkedin.com/in/ilkoku-com-58021a428/",
      handle: "İlkOku.com",
    },
  ],
} as const;

export const siteSocialUrls = siteContact.socialLinks.map((social) => social.href);
