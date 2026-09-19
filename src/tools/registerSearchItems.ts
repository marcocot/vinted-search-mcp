import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Marketplace } from "@/marketplace/marketplace.js";
import type { Logger } from "@/logger/logger.js";
import { logToolFailure } from "@/tools/logToolFailure.js";
import { nullable } from "@/tools/nullable.js";
import { toolError } from "@/tools/toolError.js";
import type { SearchService } from "@/vinted/searchService.js";

const MAX_PAGE = 10;
const MAX_PER_PAGE = 96;

const money = z.object({ amount: z.number(), currency: z.string() });

const item = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  price: nullable(money),
  serviceFee: nullable(money),
  totalPrice: nullable(money),
  brand: nullable(z.string()),
  size: nullable(z.string()),
  condition: nullable(z.string()),
  favouriteCount: nullable(z.number()),
  viewCount: nullable(z.number()),
  seller: nullable(
    z.object({
      id: z.string(),
      login: nullable(z.string()),
      isBusiness: z.boolean(),
    }),
  ),
  photo: nullable(z.string()),
  promoted: z.boolean(),
});

const summarise = (shown: number, total: number): string =>
  shown === 0
    ? "No listings found."
    : `${shown} listings on this page, ${total} claimed by Vinted.`;

type RegisterSearchItemsOptions = {
  server: McpServer;
  service: SearchService;
  marketplace: Marketplace;
  logger: Logger;
};

export const registerSearchItems = (
  options: RegisterSearchItemsOptions,
): void => {
  const { server, service, marketplace, logger } = options;
  server.registerTool(
    "search_items",
    {
      title: "Search Vinted listings",
      description:
        `Searches listings for sale on ${marketplace.host}. Read-only: it never buys, makes ` +
        "an offer, or messages anyone. The marketplace is fixed when the server starts and " +
        "cannot be chosen per call. Every listing is a single second-hand item sold by one " +
        `person, not a catalogue product, so two listings never share a price. Prices are in ` +
        `${marketplace.currency}: price is what the seller asks, totalPrice adds Buyer ` +
        `Protection. Vinted serves at most ${MAX_PAGE} pages per search whatever totalEntries ` +
        "claims. The parameters below are the only filters: brand, size and condition belong " +
        "in the query text, they do not exist as parameters.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("What to search for, in the marketplace language."),
        page: z
          .number()
          .int()
          .min(1)
          .max(MAX_PAGE)
          .default(1)
          .describe(`Result page, from 1 to ${MAX_PAGE}.`),
        perPage: z
          .number()
          .int()
          .min(1)
          .max(MAX_PER_PAGE)
          .default(24)
          .describe(`Listings per page, at most ${MAX_PER_PAGE}.`),
        order: z
          .enum([
            "relevance",
            "newest_first",
            "price_low_to_high",
            "price_high_to_low",
          ])
          .default("relevance")
          .describe("How to sort the results."),
        priceFrom: z
          .number()
          .min(0)
          .optional()
          .describe(`Lowest price, in ${marketplace.currency}.`),
        priceTo: z
          .number()
          .min(0)
          .optional()
          .describe(`Highest price, in ${marketplace.currency}.`),
      },
      outputSchema: {
        items: z.array(item),
        page: z.number(),
        perPage: z.number(),
        totalEntries: z
          .number()
          .describe(
            "How many listings Vinted claims. It is a claim, not a reachable " +
              "total: pagination stops earlier.",
          ),
        totalPages: z.number(),
      },
    },
    async (args) => {
      try {
        const result = await service.search({
          query: args.query,
          page: args.page,
          perPage: args.perPage,
          order: args.order,
          ...(args.priceFrom === undefined
            ? {}
            : { priceFrom: args.priceFrom }),
          ...(args.priceTo === undefined ? {} : { priceTo: args.priceTo }),
        });
        return {
          content: [
            {
              type: "text" as const,
              text: summarise(result.items.length, result.totalEntries),
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        logToolFailure(logger, "search_items", error);
        return toolError(error);
      }
    },
  );
};
