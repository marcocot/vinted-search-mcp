export type LogLevel = "debug" | "info" | "warn" | "error";

export type Sink = (line: string) => void;

export type Logger = Record<
  LogLevel,
  (message: string, fields?: Record<string, unknown>) => void
>;
