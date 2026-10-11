import type { Listing, Property, SearchQuery } from "../models";
export interface PropertyRepository {
  videoUrl(path: string): Promise<string>;
  search(query: SearchQuery): Promise<Listing[]>;
  get(id: string): Promise<Property | null>;
}
