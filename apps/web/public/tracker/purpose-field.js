const COMMODITY_TERMS = [
  'hydrogen',
  'e-saf',
  'saf',
  'en590',
  'diesel',
  'ammonia',
  'methanol',
  'lng',
  'lpg',
  'oil',
  'gas',
  'steel',
  'cement',
  'ceramic',
  'tile',
  'fuel',
  'offtake',
  'commodity',
  'product',
];

const COMMODITY_PURPOSES = Object.freeze([
  { value: 'buyer', label: 'Buyer' },
  { value: 'seller', label: 'Seller' },
  { value: 'developer', label: 'Developer' },
  { value: 'investor', label: 'Investor' },
]);

export function isCommodityContext({ projectName = '', goal = '', sector = '' } = {}) {
  const text = [projectName, goal, sector].join(' ').toLowerCase();
  return COMMODITY_TERMS.some(term => text.includes(term));
}

export function getPurposeOptions({ commodity = false, landOptions = [] } = {}) {
  return commodity ? [...COMMODITY_PURPOSES] : landOptions.map(option => ({ ...option }));
}
