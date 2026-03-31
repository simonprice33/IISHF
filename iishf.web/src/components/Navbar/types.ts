export type NavGroupKey = "europeanCups" | "europeanChampionships" | "noneTitleEvents" | string;

export type NavItem = {
  title: string;
  url: string;               // content route path
  children?: NavItem[];
  navGroupKey?: NavGroupKey; // used for tournaments mega columns
  fileExt?: string;          // pdf | docx | xlsx … used for doc icons
  fileUrl?: string;          // raw media URL from Umbraco e.g. /media/xxx/file.pdf
};
