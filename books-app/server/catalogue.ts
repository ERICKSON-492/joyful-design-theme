import { getStorefrontProducts } from "./storefront";

export async function getCatalogue() {
  return getStorefrontProducts();
}
