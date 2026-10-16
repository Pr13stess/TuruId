export interface Favorite {
  propertyId: string;
  name: string;
  available: boolean;
  createdAt: string;
}
export interface FavoriteRepository {
  list(page: number): Promise<Favorite[]>;
  has(propertyId: string): Promise<boolean>;
  set(propertyId: string, saved: boolean): Promise<void>;
}
