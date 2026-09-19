import type { SessionProvider } from "@/session/sessionProvider.js";
import type { Logger } from "@/logger/logger.js";

// Solving a challenge costs about twenty seconds, and whoever is waiting for an
// answer pays them. An occasional idle round buys them back, at a traffic cost
// low enough to matter here.
export const keepSessionWarm = (
  session: SessionProvider,
  intervalMs: number,
  logger: Logger,
): (() => void) => {
  const timer = setInterval(() => {
    session.get().catch((error: unknown) => {
      logger.warn("session not refreshed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, intervalMs);
  // A timer must not hold up a process that has finished.
  timer.unref();
  return () => {
    clearInterval(timer);
  };
};
