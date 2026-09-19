export type TransportHandle = {
  close(): Promise<void>;
  // The port actually bound, which the system picks when VIN_HTTP_PORT=0.
  // Null when the transport listens nowhere.
  port: number | null;
};
