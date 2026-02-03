export type DeliveryRoute = {
  path?: string | null;
};

export type DeliveryItem = {
  id: string;
  name: string;
  contentType: string;
  route?: DeliveryRoute;
  properties?: Record<string, unknown> & {
    umbracoNaviHide?: unknown; // can be boolean/number/string depending on editor/history
  };
};

export type DeliveryPagedResponse<T> = {
  total: number;
  items: T[];
};
