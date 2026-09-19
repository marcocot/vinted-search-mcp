import type { Marketplace } from "@/marketplace/marketplace.js";
import { UnknownMarketplaceError } from "@/vinted/errors/unknownMarketplaceError.js";

type Definition = {
  domain: string;
  locale: string;
  currency: string;
};

const DEFINITIONS: Readonly<Record<string, Definition>> = {
  it: { domain: "vinted.it", locale: "it-IT", currency: "EUR" },
  fr: { domain: "vinted.fr", locale: "fr-FR", currency: "EUR" },
  es: { domain: "vinted.es", locale: "es-ES", currency: "EUR" },
  de: { domain: "vinted.de", locale: "de-DE", currency: "EUR" },
  at: { domain: "vinted.at", locale: "de-AT", currency: "EUR" },
  be: { domain: "vinted.be", locale: "fr-BE", currency: "EUR" },
  nl: { domain: "vinted.nl", locale: "nl-NL", currency: "EUR" },
  pt: { domain: "vinted.pt", locale: "pt-PT", currency: "EUR" },
  ie: { domain: "vinted.ie", locale: "en-IE", currency: "EUR" },
  lu: { domain: "vinted.lu", locale: "fr-LU", currency: "EUR" },
  uk: { domain: "vinted.co.uk", locale: "en-GB", currency: "GBP" },
  pl: { domain: "vinted.pl", locale: "pl-PL", currency: "PLN" },
  cz: { domain: "vinted.cz", locale: "cs-CZ", currency: "CZK" },
  sk: { domain: "vinted.sk", locale: "sk-SK", currency: "EUR" },
  se: { domain: "vinted.se", locale: "sv-SE", currency: "SEK" },
  dk: { domain: "vinted.dk", locale: "da-DK", currency: "DKK" },
  fi: { domain: "vinted.fi", locale: "fi-FI", currency: "EUR" },
  ro: { domain: "vinted.ro", locale: "ro-RO", currency: "RON" },
  hu: { domain: "vinted.hu", locale: "hu-HU", currency: "HUF" },
  gr: { domain: "vinted.gr", locale: "el-GR", currency: "EUR" },
  lt: { domain: "vinted.lt", locale: "lt-LT", currency: "EUR" },
  com: { domain: "vinted.com", locale: "en-US", currency: "USD" },
};

export const getMarketplace = (id: string): Marketplace => {
  const found = DEFINITIONS[id];
  if (found === undefined) {
    throw new UnknownMarketplaceError(id, Object.keys(DEFINITIONS));
  }
  return {
    id,
    host: `www.${found.domain}`,
    apiHost: `api.${found.domain}`,
    locale: found.locale,
    currency: found.currency,
  };
};
