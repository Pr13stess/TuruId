import type { PropertyRepository } from "../../domain/repositories/PropertyRepository";
import type { SearchQuery } from "../../domain/models";
import { searchCatalog } from "../../domain/search";
import { mockProperties, mockRooms } from "./fixtures";
export class MockPropertyRepository implements PropertyRepository {
  async listReviews(_propertyId: string, page: number): Promise<import('../../domain/propertyFeedback').PublicReview[]> {
    if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
    return []; // Catalog fixtures contain aggregates, not actual review text.
  }
  async videoUrl(path: string) { return path; }
  async search(query: SearchQuery) {
    return searchCatalog(mockProperties, mockRooms, query);
  }
  async get(id: string) {
    return mockProperties.find((p) => p.id === id) ?? null;
  }
}
