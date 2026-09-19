import { parseItemPage } from "@/catalogue/parseItemPage.js";
import { parseSearchResponse } from "@/catalogue/parseSearchResponse.js";
import { searchUrl } from "@/catalogue/searchUrl.js";
import type { HttpClient } from "@/catalogue/httpClient.js";
import type { Marketplace } from "@/marketplace/marketplace.js";
import type { Metrics } from "@/metrics/metrics.js";
import { ItemNotFoundError } from "@/vinted/errors/itemNotFoundError.js";
import { ParseError } from "@/vinted/errors/parseError.js";
import { UpstreamError } from "@/vinted/errors/upstreamError.js";
import type { ItemSource } from "@/vinted/itemSource.js";
import type { SearchParams, SearchResult } from "@/vinted/search.js";
import type { ItemDetail } from "@/vinted/vintedItem.js";

type CatalogueSourceOptions = {
  http: HttpClient;
  marketplace: Marketplace;
  metrics: Metrics;
};

const JSON_ACCEPT = "application/json, text/plain, */*";
const HTML_ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

export class CatalogueSource implements ItemSource {
  private readonly http: HttpClient;
  private readonly marketplace: Marketplace;
  private readonly metrics: Metrics;

  constructor(options: CatalogueSourceOptions) {
    this.http = options.http;
    this.marketplace = options.marketplace;
    this.metrics = options.metrics;
  }

  async search(params: SearchParams): Promise<SearchResult> {
    const url = searchUrl(this.marketplace, params);
    const response = await this.http.get(url, JSON_ACCEPT);
    if (!response.ok) {
      this.metrics.increment("upstream_errors_total");
      throw new UpstreamError(response.status, url);
    }
    return parseSearchResponse(await this.json(response), this.marketplace);
  }

  async getItem(id: string): Promise<ItemDetail> {
    const url = `https://${this.marketplace.host}/items/${id}`;
    const response = await this.http.get(url, HTML_ACCEPT);
    if (response.status === 404 || response.status === 410) {
      throw new ItemNotFoundError(id);
    }
    if (!response.ok) {
      this.metrics.increment("upstream_errors_total");
      throw new UpstreamError(response.status, url);
    }
    return parseItemPage(await response.text(), id, this.marketplace);
  }

  private async json(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      this.metrics.increment("parse_errors_total");
      throw new ParseError("search", "the body is not valid JSON");
    }
  }
}
