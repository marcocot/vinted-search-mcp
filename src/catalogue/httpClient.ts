// What CatalogueSource leans on: a request to Vinted already dressed in a
// session. VintedHttp is only the implementation that goes to the network.
export type HttpClient = {
  get(url: string, accept: string): Promise<Response>;
};
