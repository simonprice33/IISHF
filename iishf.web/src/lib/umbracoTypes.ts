export type DeliveryItem = {
  id: string;
  name: string;
  contentType: string;
  route?: {
    path?: string;
  };
  properties?: Record<string, unknown>;
};

export type DeliveryPagedResponse<T> = {
  total: number;
  items: T[];
};

export function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

export function asBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return undefined;
}
