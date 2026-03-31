import axios from "axios";

type DeliveryPagedResponse<T> = {
  total?: number;
  items?: T[];
};

type DeliveryItem = {
  id: string;
  contentType?: string;
  name?: string;
  route?: { path?: string };
  properties?: Record<string, unknown>;
};

function getSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000"
  );
}

function toAbsoluteUrl(path: string): string {
  if (typeof window !== "undefined") return path;
  return new URL(path, getSiteOrigin()).toString();
}

async function getChildrenByPath(pathKey: string, take = 200): Promise<DeliveryItem[]> {
  const path =
    `/api/umbraco/delivery/api/v2/content` +
    `?fetch=children:${encodeURIComponent(pathKey)}` +
    `&take=${take}`;

  const url = toAbsoluteUrl(path);
  try {
    const { data } = await axios.get<DeliveryPagedResponse<DeliveryItem>>(url);
    return data.items ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetches the “Mission” / “Values” section nodes under Home, then fetches the children of each section.
 * Returns an array of strings to feed into your slick slider.
 */
export async function getMissionItemsFromDelivery(): Promise<string[]> {
  // 1) Get children under home
  const homeChildren = await getChildrenByPath("home", 200);

  // 2) Find the section(s) you want
  const missionSections = homeChildren.filter((x) => x.contentType === "missionValuesSection");

  if (missionSections.length === 0) return [];

  // 3) For each section, fetch its children (by route path)
  // NOTE: your screenshot shows route.path like "/mission/" and "/values/"
  const allItems: string[] = [];

  for (const section of missionSections) {
    const sectionPath = section.route?.path;
    if (!sectionPath) continue;

    // Delivery fetch key seems to accept route path keys like "mission" (not "/mission/")
    // Your earlier calls use "children:news" style, so we’ll normalize:
    const key = sectionPath.replace(/\//g, ""); // "/mission/" -> "mission"
    const children = await getChildrenByPath(key, 200);

    for (const child of children) {
      const props = (child.properties ?? {}) as Record<string, any>;

      // TODO: adjust this to the actual field alias on the child doc type
      const text =
        (props.missionValueContent as string) ??
        (props.text as string) ??
        (props.content as string) ??
        child.name;

      if (text && typeof text === "string") {
        allItems.push(text.trim());
      }
    }
  }

  return allItems.filter(Boolean);
}
