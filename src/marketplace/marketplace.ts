export type Marketplace = {
  readonly id: string;
  readonly host: string;
  // The catalogue moved off the site onto the sibling api. host:
  // www.vinted.xx/api/v2/... has answered 404 since api.vinted.xx/svc-catalogue
  // replaced it.
  readonly apiHost: string;
  readonly locale: string;
  readonly currency: string;
};
