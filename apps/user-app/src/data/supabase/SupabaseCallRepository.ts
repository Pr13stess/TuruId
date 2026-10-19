import type { SupabaseClient } from '@supabase/supabase-js';
import type { CallAction, CallCredentials, CallRepository, VoiceCall } from '../../domain/repositories/CallRepository';

export class SupabaseCallRepository implements CallRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(name, args);
    if (error) throw new Error(error.code === 'PGRST202'
      ? 'Backend panggilan belum tersedia. Hubungi pengelola demo.' : error.message);
    return data as T;
  }
  async list() {
    // Existing participant-scoped RPC also expires unanswered/disconnected calls.
    const data = await this.rpc<VoiceCall[]>('owner_read', { section: 'calls' });
    if (!Array.isArray(data)) throw new Error('Status panggilan tidak valid. Coba lagi.');
    return data;
  }
  async start(conversationId: string) {
    const call = await this.rpc<VoiceCall>('communication_start', { cid: conversationId, kind: 'VOICE' });
    if (!call?.id) throw new Error('Panggilan belum dapat dimulai. Periksa riwayat sebelum mencoba lagi.');
    return call;
  }
  async update(id: string, action: CallAction) {
    await this.rpc('communication_call', { call_id: id, action });
  }
  async heartbeat(id: string) {
    await this.rpc('communication_call', { call_id: id, action: 'ping' });
  }
  async token(id: string): Promise<CallCredentials> {
    const { data, error } = await this.client.functions.invoke('agora-token', { body: { call_id: id } });
    if (error) {
      let detail = '';
      try { detail = (await error.context?.json())?.error ?? ''; } catch { /* Non-JSON gateway error. */ }
      throw new Error(detail || 'Token panggilan gagal dimuat. Periksa koneksi dan konfigurasi Agora DEV.');
    }
    if (data?.error) throw new Error(data.error);
    if (!data?.appId || !data?.token || !data?.channel || !Number.isInteger(data.uid) || data.uid <= 0)
      throw new Error('Token panggilan tidak valid.');
    return data;
  }
}
