import type { SessionData } from "@/session/sessionData.js";

export type SessionProvider = {
  get(): Promise<SessionData>;
  refresh(): Promise<SessionData>;
};
