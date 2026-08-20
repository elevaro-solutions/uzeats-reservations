import type { FormInstance } from 'antd';

export type ImportedRestaurantData = {
  source: 'doordash' | 'ubereats' | 'unknown';
  name?: string;
  description?: string;
  cuisine?: string;
  priceRange?: number;
  phone?: string;
  website?: string;
  address?: {
    line1?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  menuItems?: Array<{ name: string; description?: string; price?: number; category?: string }>;
};

export function restaurantImportFormValues(data: ImportedRestaurantData) {
  return {
    name: data.name,
    cuisine: data.cuisine,
    priceRange: data.priceRange,
    description: data.description,
    phone: data.phone,
    website: data.website,
    ...(data.address?.line1 ? { line1: data.address.line1 } : {}),
    ...(data.address?.city ? { city: data.address.city } : {}),
    ...(data.address?.state ? { state: data.address.state } : {}),
    ...(data.address?.zip ? { zip: data.address.zip } : {}),
  };
}

export function applyRestaurantImportToForm(
  form: FormInstance,
  data: ImportedRestaurantData,
  currentValues?: Record<string, unknown>,
) {
  const next = restaurantImportFormValues(data);
  form.setFieldsValue({
    name: next.name ?? currentValues?.name ?? form.getFieldValue('name'),
    cuisine: next.cuisine ?? currentValues?.cuisine ?? form.getFieldValue('cuisine'),
    priceRange: next.priceRange ?? currentValues?.priceRange ?? form.getFieldValue('priceRange'),
    description: next.description ?? currentValues?.description ?? form.getFieldValue('description'),
    phone: next.phone ?? currentValues?.phone ?? form.getFieldValue('phone'),
    website: next.website ?? currentValues?.website ?? form.getFieldValue('website'),
    ...(next.line1 ? { line1: next.line1 } : {}),
    ...(next.city ? { city: next.city } : {}),
    ...(next.state ? { state: next.state } : {}),
    ...(next.zip ? { zip: next.zip } : {}),
  });
}

export function isSupportedDeliveryImportUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.toLowerCase();
    return (
      (host === 'doordash.com'
        || host.endsWith('.doordash.com')
        || host === 'ubereats.com'
        || host.endsWith('.ubereats.com'))
      && /\/store\//i.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}
