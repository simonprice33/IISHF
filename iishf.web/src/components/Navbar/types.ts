export type NavGroupKey = "europeanCups" | "europeanChampionships" | "noneTitleEvents" | string;

export type NavItem = {
  title: string;
  url: string;               // route path OR direct file url (/media/...)
  children?: NavItem[];
  navGroupKey?: NavGroupKey; // used for tournaments mega columns
  fileExt?: string;          // used for doc icons
};
