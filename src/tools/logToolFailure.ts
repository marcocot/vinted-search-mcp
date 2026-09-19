import type { Logger } from "@/logger/logger.js";
import { VintedMcpError } from "@/vinted/errors/vintedMcpError.js";

// Un errore che torna al chiamante e non lascia una riga nei log e' un guasto
// che chi gestisce il server scopre solo quando qualcuno si lamenta.
export const logToolFailure = (
  logger: Logger,
  tool: string,
  error: unknown,
): void => {
  if (error instanceof VintedMcpError) {
    logger.warn("tool failed", {
      tool,
      code: error.code,
      error: error.message,
    });
    return;
  }
  // Uno sconosciuto arriva da un punto che non avevamo previsto: qui lo
  // stack vale piu' del messaggio.
  logger.error("tool failed", {
    tool,
    code: "UNKNOWN",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
};
