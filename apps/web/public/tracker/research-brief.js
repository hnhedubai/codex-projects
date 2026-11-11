const BRIEF_MAX_LENGTH = 4000;

export const RESEARCH_BRIEF_PROMPTS = Object.freeze([
  {
    id: 'buyer-global',
    label: 'Find global buyers',
    text: 'Find genuine buyers and end-users for [product / specification]. Search globally by default; if [target country] is provided, prioritize buyers in that country and relevant import or delivery hubs. Think from the buyer perspective: identify organizations that consume, import, distribute, tender for, publicly procure, or otherwise document a current need for the product. For each candidate, return the company name, country, buyer type, required specification, volume or frequency if stated, evidence of current demand or procurement activity, destination or port if stated, and whether FOB, CIF, or both are explicitly accepted. Include the official source URL and a public procurement or commercial contact. Do not infer buyer status, FOB/CIF preference, volume, or readiness from supplier claims. Exclude generic directories, unsupported broker mandates, and companies that are only producers or sellers unless the source also proves buyer demand.',
  },
  {
    id: 'buyer-en590',
    label: 'Example: Diesel EN590 10 PPM buyers',
    text: 'Find genuine buyers, importers, distributors, and industrial consumers for Diesel EN590 10 PPM. Search worldwide by default; if [target country] is supplied, prioritize buyers in that country and relevant ports or delivery hubs. Think from the buyer perspective: prioritize organizations with official evidence of current fuel demand, procurement, tenders, imports, storage or terminal operations, distribution activity, or industrial consumption. For each result, return the company name, country, buyer type, required EN590 10 PPM specification, volume or frequency if stated, evidence of current buyer demand, destination or port if stated, and explicitly stated delivery basis: FOB, CIF, both, or not stated. Include the official source URL and a public procurement, trading, supply-chain, or business-development contact. Do not infer buyer status, FOB/CIF preference, volume, or agreement readiness from supplier claims. Exclude generic fuel directories, unverifiable mandates, broker-only listings, and companies with no evidence of buyer demand.',
  },
  {
    id: 'seller-supply',
    label: 'Find verified suppliers',
    text: 'Find verified producers and suppliers of [product / specification] in [country or region]. Prioritize official company sources and current evidence of production, export capability, available volume, specification, delivery terms, and a public commercial contact. Separate producers, authorized distributors, brokers, and unsupported marketplace listings. Return the exact source evidence for every classification.',
  },
  {
    id: 'developer-project',
    label: 'Find project developers',
    text: 'Find active developers, owners, and project companies working on [project / technology] in [country or region]. Prioritize official project pages, permits, tenders, investment announcements, and current procurement or partnership needs. Return the project stage, required product or service, commercial objective, evidence source, and named public contact where available. Exclude stale announcements and generic sector articles.',
  },
  {
    id: 'investor-financier',
    label: 'Find investors or financiers',
    text: 'Find investors, lenders, strategic partners, and funds in [country or region] that actively consider [project / technology / product]. Prioritize published investment mandates, portfolio evidence, ticket size or financing criteria, sector focus, and current contact routes. Distinguish verified mandate evidence from general capability claims and return the source for every result.',
  },
  {
    id: 'decision-makers',
    label: 'Find decision-makers and contacts',
    text: 'For companies relevant to [commercial need] in [country or region], find named procurement, supply-chain, trading, business-development, investment, or project-development decision-makers. Use official company sources first. Return the person, role, company, public email or phone if published, source URL, evidence, and confidence. Do not infer a person or email address from an unverified pattern.',
  },
]);

function addHelpContent(container) {
  const details = document.createElement('details');
  details.className = 'research-brief-help';
  const summary = document.createElement('summary');
  summary.textContent = 'How to write a strong brief';
  const copy = document.createElement('p');
  copy.textContent = 'Write naturally. Include what you have, what you need, the geography, the commercial role, and what evidence should qualify a result. The brief is a starting point for the structured search intent and Exa query; it does not replace source review.';
  details.append(summary, copy);
  container.append(details);
}

export function attachResearchBriefField(form, { initial = '' } = {}) {
  if (!form || form.elements.researchBrief) return form.elements.researchBrief;

  const label = document.createElement('label');
  label.className = 'project-brief-field';
  label.textContent = 'Research brief';

  const textarea = document.createElement('textarea');
  textarea.name = 'researchBrief';
  textarea.maxLength = BRIEF_MAX_LENGTH;
  textarea.rows = 6;
  textarea.placeholder = 'Example: I have a supplier for Diesel EN590 10 PPM and need credible buyers globally. Find evidence-backed companies with real demand and public commercial contacts.';
  textarea.setAttribute('aria-describedby', `${form.id || 'project'}-brief-help ${form.id || 'project'}-brief-count`);
  textarea.value = initial || '';

  const help = document.createElement('span');
  help.id = `${form.id || 'project'}-brief-help`;
  help.className = 'research-brief-help-text';
  help.textContent = 'Use your own words. You can start with a polished prompt below and edit it.';

  const count = document.createElement('span');
  count.id = `${form.id || 'project'}-brief-count`;
  count.className = 'research-brief-count';

  const updateCount = () => { count.textContent = `${textarea.value.length}/${BRIEF_MAX_LENGTH}`; };
  textarea.addEventListener('input', updateCount);
  label.append(textarea, help, count);

  const promptTools = document.createElement('div');
  promptTools.className = 'research-brief-tools';
  const promptLabel = document.createElement('label');
  promptLabel.className = 'research-brief-prompt-label';
  promptLabel.textContent = 'Prompt starters';
  const promptSelect = document.createElement('select');
  promptSelect.name = 'researchBriefPrompt';
  promptSelect.setAttribute('aria-label', 'Choose a polished prompt starter');
  promptSelect.append(new Option('Choose a polished prompt…', ''));
  for (const prompt of RESEARCH_BRIEF_PROMPTS) promptSelect.append(new Option(prompt.label, prompt.id));
  promptLabel.append(promptSelect);
  const usePrompt = document.createElement('button');
  usePrompt.type = 'button';
  usePrompt.className = 'secondary-button research-brief-use-prompt';
  usePrompt.textContent = 'Use selected prompt';
  usePrompt.title = 'Copy the selected prompt into the research brief so you can edit it.';
  usePrompt.addEventListener('click', () => {
    const prompt = RESEARCH_BRIEF_PROMPTS.find(item => item.id === promptSelect.value);
    if (!prompt) return;
    textarea.value = prompt.text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
  });
  promptTools.append(promptLabel, usePrompt);

  const submitButton = form.querySelector('button[type="submit"]');
  form.insertBefore(label, submitButton || null);
  form.insertBefore(promptTools, submitButton || null);
  addHelpContent(form);
  updateCount();
  return textarea;
}
