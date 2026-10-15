export interface Env {
  DB?: D1Database;
  R2_BUCKET?: R2Bucket;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
}

export interface AuthUser {
  email: string;
  sub?: string;
}

