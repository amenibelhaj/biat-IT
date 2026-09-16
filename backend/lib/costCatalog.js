/*
 * Replacement cost catalogue.
 *
 * IMPORTANT — read before presenting any figure from this file.
 *
 * The source inventory (extraitDATAreseau.xlsx) contains no purchase
 * prices. Rather than silently inventing a number and presenting it as
 * fact, this module holds a single, visible table of ESTIMATED
 * replacement costs per equipment class, in Tunisian Dinar (TND).
 *
 * Every figure derived from this table is flagged `cost_is_estimated =
 * true` in the database and is labelled as an estimate in the interface.
 * When BIAT supplies real acquisition costs, import them into
 * `purchase_price` and those actual values take precedence.
 *
 * The numbers below are order-of-magnitude planning estimates for
 * enterprise networking hardware. Replace them with BIAT's own
 * procurement figures before this is used for real budget submissions.
 */

const CURRENCY = 'TND';

// Matched against the asset's type/description, lowercase, first match wins.
const CATALOG = [
  { match: ['firewall', 'pare-feu'],            cost: 62000, label: 'Firewall' },
  { match: ['load balancer', 'répartiteur'],    cost: 56000, label: 'Load Balancer' },
  { match: ['san', 'nas', 'stockage', 'storage'], cost: 95000, label: 'Storage' },
  { match: ['serveur', 'server'],               cost: 47000, label: 'Server' },
  { match: ['routeur', 'router'],               cost: 28000, label: 'Router' },
  { match: ['switch', 'commutateur'],           cost: 15000, label: 'Switch' },
  { match: ['access point', 'point d\'accès', 'wifi', 'borne'], cost: 4200, label: 'Access Point' },
  { match: ['gateway', 'passerelle'],           cost: 22000, label: 'Gateway' },
  { match: ['licence', 'license', 'logiciel', 'software'], cost: 12000, label: 'Software / Licence' }
];

const DEFAULT_COST = 20000;
const DEFAULT_LABEL = 'Autre équipement';

/**
 * Estimate the replacement cost of an asset from its type/description.
 * Returns { cost, label, estimated } — `estimated` is always true here,
 * which is what the caller records in cost_is_estimated.
 */
function estimateReplacementCost(typeOrDescription) {
  if (!typeOrDescription) {
    return { cost: DEFAULT_COST, label: DEFAULT_LABEL, estimated: true };
  }
  const haystack = String(typeOrDescription).toLowerCase();
  for (const entry of CATALOG) {
    if (entry.match.some((needle) => haystack.includes(needle))) {
      return { cost: entry.cost, label: entry.label, estimated: true };
    }
  }
  return { cost: DEFAULT_COST, label: DEFAULT_LABEL, estimated: true };
}

/** The catalogue as a plain list, for display in the interface. */
function getCatalog() {
  return {
    currency: CURRENCY,
    default_cost: DEFAULT_COST,
    entries: CATALOG.map((e) => ({ label: e.label, cost: e.cost, matches: e.match }))
  };
}

module.exports = { estimateReplacementCost, getCatalog, CURRENCY, DEFAULT_COST };
