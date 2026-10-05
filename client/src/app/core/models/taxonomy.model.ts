export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  icon?: string;
  cover?: string;
  parent?: string | null;
  order: number;
  isActive: boolean;
  showInMenu: boolean;
  articlesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Compact category projection populated onto articles. */
export interface CategoryRef {
  _id: string;
  name: string;
  slug: string;
  color?: string;
  icon?: string;
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  usageCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  cover?: string;
  parent?: string | null;
  order?: number;
  isActive?: boolean;
  showInMenu?: boolean;
}

export interface TagPayload {
  name: string;
  slug?: string;
  description?: string;
}