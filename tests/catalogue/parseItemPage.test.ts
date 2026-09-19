import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseItemPage } from "@/catalogue/parseItemPage.js";
import { getMarketplace } from "@/marketplace/getMarketplace.js";
import { ParseError } from "@/vinted/errors/parseError.js";

const marketplace = getMarketplace("it");

const html = readFileSync(
  fileURLToPath(new URL("../fixtures/item-it.html", import.meta.url)),
  "utf8",
);

const page = (product: unknown): string =>
  `<html><body><script type="application/ld+json">${JSON.stringify(product)}</script></body></html>`;

describe("parseItemPage", () => {
  it("reads the JSON-LD of a real page", () => {
    const detail = parseItemPage(html, "10051317969", marketplace);

    expect(detail.id).toBe("10051317969");
    expect(detail.title.length).toBeGreaterThan(0);
    expect(detail.url).toMatch(/^https:\/\/www\.vinted\.it\/items\//);
    expect(detail.price?.currency).toBe("EUR");
    expect(detail.available).toBe(true);
  });

  it("normalises condition, image and a textual price", () => {
    const detail = parseItemPage(
      page({
        "@type": "Product",
        name: "Scarpe",
        image: ["https://img/1.webp", "https://img/2.webp"],
        brand: { name: "Nike" },
        offers: {
          price: "12.50",
          priceCurrency: "EUR",
          availability: "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/UsedCondition",
          url: "https://www.vinted.it/items/1-scarpe",
        },
      }),
      "1",
      marketplace,
    );

    expect(detail).toMatchObject({
      brand: "Nike",
      price: { amount: 12.5, currency: "EUR" },
      condition: "UsedCondition",
      image: "https://img/1.webp",
      available: false,
    });
  });

  it("reports null for the fields the page does not carry", () => {
    const detail = parseItemPage(
      page({ "@type": "Product", name: "Scarpe" }),
      "1",
      marketplace,
    );

    expect(detail).toEqual({
      id: "1",
      title: "Scarpe",
      url: "https://www.vinted.it/items/1",
      description: null,
      brand: null,
      price: null,
      condition: null,
      category: null,
      colour: null,
      image: null,
      available: null,
    });
  });

  it("uses the marketplace currency when the offer omits it", () => {
    const detail = parseItemPage(
      page({ "@type": "Product", name: "Scarpe", offers: { price: 10 } }),
      "1",
      getMarketplace("uk"),
    );

    expect(detail.price).toEqual({ amount: 10, currency: "GBP" });
  });

  it("skips unreadable blocks and blocks of another type", () => {
    const detail = parseItemPage(
      `<script type="application/ld+json">{ rotto</script>
       <script type="application/ld+json">{"@type":"BreadcrumbList"}</script>
       ${page({ "@type": "Product", name: "Scarpe" })}`,
      "1",
      marketplace,
    );

    expect(detail.title).toBe("Scarpe");
  });

  it.each([
    ["<html><body>niente</body></html>", "no JSON-LD"],
    [page({ "@type": "Product" }), "Product without name"],
    [page({ "@type": "Product", name: "" }), "empty name"],
  ])("raises ParseError: %s", (input) => {
    expect(() => parseItemPage(input, "1", marketplace)).toThrow(ParseError);
  });
});
