export type NavigationItem = {
  badge?: string;
  disabled?: boolean;
  href: string;
  label: string;
  type?: "item";
};

export type NavigationHeading = {
  label: string;
  type: "heading";
};

export type NavigationNode = NavigationHeading | NavigationItem;
