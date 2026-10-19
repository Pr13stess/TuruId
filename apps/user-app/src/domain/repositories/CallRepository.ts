export type CallStatus = 'RINGING' | 'CONNECTED' | 'COMPLETED' | 'MISSED' | 'DECLINED' | 'CANCELLED' | 'FAILED';
export type CallAction = 'accept' | 'decline' | 'end' | 'fail';
export interface VoiceCall {
  id: string;
  conversation_id: string;
  caller_id: string;
  receiver_id: string;
  call_type: 'VOICE' | 'VIDEO';
  status: CallStatus;
  created_at: string;
  answered_at?: string | null;
  duration_seconds: number;
}
export interface CallCredentials { appId: string; token: string; channel: string; uid: number }
export interface CallRepository {
  list(): Promise<VoiceCall[]>;
  start(conversationId: string): Promise<VoiceCall>;
  update(id: string, action: CallAction): Promise<void>;
  heartbeat(id: string): Promise<void>;
  token(id: string): Promise<CallCredentials>;
}
export const activeCall = (status: CallStatus) => status === 'RINGING' || status === 'CONNECTED';
export const callLabel: Record<CallStatus, string> = {
  RINGING: 'Menunggu jawaban…', CONNECTED: 'Panggilan berlangsung', COMPLETED: 'Panggilan selesai',
  MISSED: 'Tidak terjawab', DECLINED: 'Panggilan ditolak', CANCELLED: 'Panggilan dibatalkan', FAILED: 'Panggilan terputus',
};
