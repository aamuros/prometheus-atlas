import type { MemberProfile } from '../../../shared/api';
import { loadMe, ProfileError } from '../../lib/api';

export type AuthState =
  | { status: 'authenticated'; user: MemberProfile }
  | { status: 'authentication' | 'denied' | 'unavailable' };

export async function loadProfile(): Promise<AuthState> {
  try {
    return { status: 'authenticated', user: await loadMe() };
  } catch (error) {
    return {
      status: error instanceof ProfileError ? error.reason : 'unavailable',
    };
  }
}
