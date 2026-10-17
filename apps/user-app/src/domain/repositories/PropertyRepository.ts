import type { Listing, Property, SearchQuery } from "../models";
export interface PropertyRepository {
  listReviews(propertyId: string, page: number): Promise<import('../propertyFeedback').PublicReview[]>;
  videoUrl(path: string): Promise<string>;
  search(query: SearchQuery): Promise<Listing[]>;
  get(id: string): Promise<Property | null>;
}
