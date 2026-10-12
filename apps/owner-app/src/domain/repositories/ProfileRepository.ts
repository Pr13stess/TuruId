import { Profile } from "../models";
export interface ProfileRepository {
  uploadAvatar(input: { base64: string; mime: string }): Promise<void>;
  get(): Promise<Profile>;
  save(input: Pick<Profile, "full_name" | "phone" | "address">): Promise<void>;
  submitVerification(evidence: string): Promise<void>;
  acceptPolicies(): Promise<void>;
  requestDeletion(reason: string): Promise<void>;
  resetDemo?(): Promise<void>;
}
