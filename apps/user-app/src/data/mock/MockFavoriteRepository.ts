import type { FavoriteRepository, Favorite } from '../../domain/repositories/FavoriteRepository';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { mockProperties } from './fixtures';
export class MockFavoriteRepository implements FavoriteRepository {
  private readonly users = new Map<string, Map<string, Favorite>>();
  constructor(private readonly auth: AuthRepository) {}
  private async records() {
    const session = await this.auth.getSession();
    if (!session) throw new Error('Silakan masuk kembali.');
    const id = session.user.id;
    if (!this.users.has(id)) this.users.set(id, new Map());
    return this.users.get(id)!;
  }
  async list(page: number) {
    if (!Number.isSafeInteger(page) || page < 0) throw new Error('Halaman tidak valid.');
    return [...(await this.records()).values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.propertyId.localeCompare(a.propertyId))
      .slice(page * 20, page * 20 + 21).map(row => ({ ...row }));
  }
  async has(id: string) { return (await this.records()).has(id); }
  async set(id: string, saved: boolean) {
    const records = await this.records();
    if (!saved) { records.delete(id); return; }
    const property = mockProperties.find(p => p.id === id);
    if (!property) throw new Error('Kos tidak tersedia.');
    if (!records.has(id)) records.set(id, { propertyId: id, name: property.name, available: true, createdAt: new Date().toISOString() });
  }
}
