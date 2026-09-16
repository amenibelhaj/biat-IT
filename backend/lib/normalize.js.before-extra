/*
 * Normalisation helpers for imported spreadsheet data.
 *
 * The source files use French labels, inconsistent date formats, and in
 * the case of extraitDATAreseau.xlsx a duplicated `end-of-support`
 * column (SheetJS renames the second one `end-of-support_1`). Everything
 * needed to cope with that lives here so the import logic stays readable.
 */

/** Map the many spellings of a status onto the four BIAT states. */
function normalizeStatus(status) {
  if (!status) return 'Production';
  const map = {
    'en service': 'Production',
    'production': 'Production',
    'actif': 'Production',
    'secours': 'Secours',
    'backup': 'Secours',
    'test': 'Test',
    'hors service': 'Hors service',
    'inactif': 'Hors service',
    'retired': 'Hors service'
  };
  return map[String(status).toLowerCase().trim()] || 'Production';
}

/** Map criticality onto four levels. Unknown values become Medium. */
function normalizeCriticality(crit) {
  if (!crit) return 'Medium';
  const map = {
    'critique': 'Critical', 'critical': 'Critical',
    'élevée': 'High', 'elevee': 'High', 'haute': 'High', 'high': 'High',
    'moyen': 'Medium', 'moyenne': 'Medium', 'medium': 'Medium',
    'faible': 'Low', 'basse': 'Low', 'low': 'Low'
  };
  return map[String(crit).toLowerCase().trim()] || 'Medium';
}

/**
 * Classify equipment into a type. The source file puts the real
 * equipment class in the `Description` column ("Routeur", "Switch"),
 * while `Nom` is a free-text label, so description is checked first.
 */
function normalizeType(description, name) {
  const types = [
    ['firewall', 'Firewall'], ['pare-feu', 'Firewall'],
    ['load balancer', 'Load Balancer'],
    ['san', 'Storage'], ['nas', 'Storage'], ['stockage', 'Storage'], ['storage', 'Storage'],
    ['serveur', 'Server'], ['server', 'Server'],
    ['switch', 'Switch'], ['commutateur', 'Switch'],
    ['routeur', 'Router'], ['router', 'Router'],
    ['access point', 'Access Point'], ['wifi', 'Access Point'], ['borne', 'Access Point'],
    ['gateway', 'Gateway'], ['passerelle', 'Gateway'],
    ['licence', 'Software'], ['license', 'Software'], ['logiciel', 'Software']
  ];

  const classify = (text) => {
    if (!text) return null;
    const haystack = String(text).toLowerCase();
    for (const [needle, label] of types) {
      if (haystack.includes(needle)) return label;
    }
    return null;
  };

  // Description is authoritative. In the BIAT network extract every row is
  // NAMED "Routeur AGENCE XX" regardless of what it actually is, while the
  // Description column correctly says "Switch" or "Routeur". Classifying on
  // the two fields combined would label every switch a router, so the
  // description is tried on its own first and the name is only a fallback.
  return classify(description) || classify(name) || 'Autre';
}

/**
 * Parse the several date shapes found in the source files:
 *   - real Date objects (SheetJS parses formatted cells this way)
 *   - Excel serial numbers (e.g. 44561)
 *   - bare years (e.g. 2023) -> treated as 1 January of that year
 *   - strings ("December 31, 2022", "2030-04-30 00:00:00")
 * Returns an ISO date string (YYYY-MM-DD), or null when unparseable.
 */
function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const asString = String(value).trim();
  if (!asString || ['n/a', 'na', 'nat', 'nan', '-'].includes(asString.toLowerCase())) return null;

  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  if (typeof value === 'number') {
    // A bare year, e.g. 2023
    if (value > 1900 && value < 2100 && Number.isInteger(value)) {
      return `${value}-01-01`;
    }
    // Excel serial date (days since 1899-12-30)
    const fromSerial = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(fromSerial.getTime()) ? null : fromSerial.toISOString().split('T')[0];
  }

  // Bare year as text
  if (/^\d{4}$/.test(asString)) return `${asString}-01-01`;

  const parsed = new Date(asString);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
}

/**
 * Read a value from a spreadsheet row, trying several possible column
 * names. Column headings vary between the files BIAT provides, and
 * SheetJS suffixes duplicated headings with _1, _2 and so on.
 */
function pick(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return null;
}

/**
 * end-of-support appears twice in extraitDATAreseau.xlsx, once as free
 * text and once as a real date, and the two do not always agree. Take
 * whichever parses, and when both do, take the later date — an asset is
 * only genuinely out of support once the latest stated date has passed.
 */
function pickEndOfSupport(row) {
  const candidates = [
    'end-of-support', 'end-of-support_1', 'end-of-support.1',
    'End of Support', 'Fin de support', 'Date de fin de support constructeur'
  ];
  const dates = candidates
    .map((key) => parseDate(row[key]))
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

module.exports = {
  normalizeStatus,
  normalizeCriticality,
  normalizeType,
  parseDate,
  pick,
  pickEndOfSupport
};
