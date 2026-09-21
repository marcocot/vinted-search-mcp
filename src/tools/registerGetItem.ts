import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Marketplace } from "@/marketplace/marketplace.js";
import type { Logger } from "@/logger/logger.js";
import { logToolCall } from "@/tools/logToolCall.js";
import { logToolFailure } from "@/tools/logToolFailure.js";
import { nullable } from "@/tools/nullable.js";
import { toolError } from "@/tools/toolError.js";
import type { ItemService } from "@/vinted/itemService.js";

type RegisterGetItemOptions = {
  server: McpServer;
  service: ItemService;
  marketplace: Marketplace;
  logger: Logger;
};

export const registerGetItem = (options: RegisterGetItemOptions): void => {
  const { server, service, marketplace, logger } = options;
  server.registerTool(
    "get_item",
    {
      title: "Read a Vinted listing",
      description:
        `Reads a single listing on ${marketplace.host} from its id or from a URL someone ` +
        "pasted. Read-only. Compared to search_items it adds the seller's own description, " +
        "the category and the colour, and says whether the listing is still available; it " +
        "does not report favourites, views and seller, which exist only in search results. A " +
        "sold or withdrawn listing answers NOT_FOUND or available=false.",
      inputSchema: {
        // A number is as natural a way to send an id as a string, and a
        // client that picks the wrong one deserves an answer, not a schema
        // error it cannot see past.
        item: z
          .union([z.string().min(1), z.number().int().positive()])
          .describe(
            `Listing id, as a number or a string, or the full URL ` +
              `(https://${marketplace.host}/items/...).`,
          ),
      },
      outputSchema: {
        id: z.string(),
        title: z.string(),
        url: z.string(),
        description: nullable(z.string()),
        brand: nullable(z.string()),
        price: nullable(z.object({ amount: z.number(), currency: z.string() })),
        condition: nullable(z.string()),
        category: nullable(z.string()),
        colour: nullable(z.string()),
        image: nullable(z.string()),
        available: nullable(z.boolean()),
      },
    },
    async (args) => {
      const started = Date.now();
      try {
        const { value: detail, cached } = await service.getItem(
          String(args.item),
        );
        logToolCall(logger, {
          tool: "get_item",
          summary: detail.title,
          cached,
          ms: Date.now() - started,
        });
        const price =
          detail.price === null
            ? "price unavailable"
            : `${detail.price.amount} ${detail.price.currency}`;
        return {
          content: [
            { type: "text" as const, text: `${detail.title} — ${price}` },
          ],
          structuredContent: detail,
        };
      } catch (error) {
        logToolFailure(logger, "get_item", error);
        return toolError(error);
      }
    },
  );
};
