export type SessionData = {
  cookie: string;
  anonId: string | null;
  // Cloudflare ties cf_clearance to the user agent that solved the challenge.
  // Sending a different one on later calls throws the clearance away.
  userAgent: string | null;
};
