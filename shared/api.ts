export type HealthResponse = { status: 'ok' };
export type ApiError = { error: string };
export type MemberRole = 'admin' | 'developer';
export type MemberProfile = {
  id: string;
  email: string;
  name?: string;
  role: MemberRole;
};
export type MeResponse = { user: MemberProfile };
