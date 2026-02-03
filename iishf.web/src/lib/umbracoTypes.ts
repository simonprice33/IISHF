export interface DeliveryItem {
  id: string;
  name: string;

  route?: {
    path?: string;
  };

  properties?: {
    umbracoNaviHide?: boolean;
  };

  children?: DeliveryItem[];
}

export interface DeliveryPagedResponse<T> {
  total: number;
  items: T[];
}
