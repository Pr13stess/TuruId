import type { CallRepository } from '../../domain/repositories/CallRepository';
const unavailable = async (): Promise<never> => { throw new Error('Panggilan suara memerlukan backend DEV dan development build. Mode mock tidak mengirim audio.'); };
export const unavailableCalls: CallRepository = {
  list: async () => [], start: unavailable, update: unavailable, heartbeat: unavailable, token: unavailable,
};
