export type Config = {
  marketplace: string;
  cacheTtlMs: number;
  rateLimitPerMinute: number;
  requestTimeoutMs: number;
  userAgent: string;
  cookie: string;
  flareSolverrUrl: string;
  sessionTtlMs: number;
  sessionKeepAlive: boolean;
  transport: "stdio" | "http";
  httpHost: string;
  httpPort: number;
  httpAllowedHosts: string[];
  mcpToken: string;
  metricsEnabled: boolean;
};
