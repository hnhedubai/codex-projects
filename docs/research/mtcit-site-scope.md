# MTCIT site investigation and Firecrawl scope

**Research date:** 2026-10-06  
**Target:** <https://mtcit.gov.om/>  
**Purpose:** define what the Oman Land Tracker should extract before any Firecrawl crawl is authorised.

## Executive conclusion

MTCIT is a useful official signal source for the tracker, but it is not a parcel registry. Its strongest value is discovering and validating:

1. investment opportunities and investment-proposal tenders;
2. transport, logistics, ports, digital infrastructure, data-centre/cloud and related sector signals;
3. official services, permits, regulations and policy constraints;
4. news, announcements, agreements and events that indicate a project, buyer, seller, investor or supplier intent.

The first crawl should be a small, allowlisted, public-page crawl. It should produce source-backed opportunity and intent records for human review. It must not mark a parcel as available, allocated, powered, or investment-ready based only on MTCIT content.

## What the site offers

| Site area | Evidence from the official site | Tracker value | Initial treatment |
|---|---|---|---|
| Investment opportunities | The investment-proposal tender page says MTCIT offers opportunities for investors to submit proposals, covering AI, cybersecurity, digital industry/infrastructure/transformation, policies, space, land transport, maritime, logistics, ports and roads. See <https://mtcit.gov.om/services-5/services-13/services-92/issuing-tenders-for-investment-proposals-754>. | High: direct investment/buying signals and project leads. | Crawl detail pages and linked bid documents. |
| ICT investment attraction | The investment-attraction page names Sohar Free Zone, Duqm, Khazaen and Muscat Innovation Complex, and explicitly lists Tier 3/4 data centres, cloud, space and cybersecurity opportunities and incentives. See <https://mtcit.gov.om/investment-2/investment-4/investment-opportunities-57/investment-attraction-567>. | High for data-centre and digital-infrastructure hypotheses; medium for land evidence. | Extract claims as official investment context, not parcel proof. |
| Services and permits | The site has a large services hierarchy. The investment page links to MTCIT sectors, tenders, platforms and support contacts. | Medium: tells the researcher which authority/process must be contacted. | Crawl only relevant service pages; store requirements and authority. |
| Tenders/procurement | MTCIT links to the Oman Tender Board e-tendering system from opportunity pages. | High for active procurement/buying signals, but the tender board is a separate source. | Capture the external URL and tender metadata; do not silently crawl the other domain. |
| News and announcements | The site has dated news and announcements, including investment, agreements, local-content and infrastructure announcements. | High for fresh intent and corroboration. | Crawl dated records and classify the signal; preserve publication date. |
| Events and competitions | The media area contains dated events such as logistics, ports, maritime, green mobility and technology events. | Medium: useful for early intent/network discovery, weaker as evidence of a project. | Crawl selectively; do not rank an event as a live opportunity without project evidence. |
| Library | The site publishes laws, regulations, policies, standards, reports, studies, agreements and publications. | High for hard-gate interpretation and source authority; low as a lead by itself. | Store document metadata and links first; extract full PDF text in a separate controlled step. |
| Platforms | MTCIT describes platforms such as Naql, Makeen, SAS and Oman National CERT. Naql, for example, handles land-transport cards, licences and permits and integrates with ROP and Invest Easy. See <https://mtcit.gov.om/platforms?platform=naql>. | Medium: identifies operational authorities and potential company/project ecosystems. | Store platform description, owner, external URL and relevance; do not treat platform registration as land evidence. |
| Open data / directories / support | Sitemap entries include open-data, suppliers, community, support and contact sections. | Variable: possible datasets and official contact routing; personal/contact data needs care. | Index section metadata first; only extract public organisational contacts relevant to a named authority or opportunity. |

## Official site structure and crawl entry points

The public robots file points to the XML sitemap and disallows only `/web/login`:

- <https://mtcit.gov.om/robots.txt>
- <https://mtcit.gov.om/sitemap.xml>

The sitemap is large (about 19,763 URL entries at research time) and contains repeated section structures/variants. It must be used as an index, not crawled blindly. Deduplicate by canonical URL and restrict the first run to these patterns:

```text
/investment-2/investment-4/investment-opportunities-57/*
/services-5/*
/media-4/news-announcements-11/*
/media-4/events-competitions-10/*
/library-3/*
/platforms-12/*
/sectors-11/*
/support-7/*
/suppliers-6/procurement-14/*
```

The sitemap also exposes pages named `dynamic-investment-opportunity-snippet-data`, `recent-news-snippet-data`, `dynamic-events-snippet-data`, `dynamic-multi-content-snippet-data` and `dynamic-training-snippet-data`. These are discovery clues, not an assumed API contract. Test them with one read-only request and use them only if their response is public, stable and permitted.

MTCIT pages link to other domains, including `etendering.tenderboard.gov.om`, `investoman.om`, `prod.mtcit.gov.om` and platform sites. These are separate authorities and require a separate allowlist, source record and crawl decision.

## Objective-aligned extraction schema

Every extracted item should remain an immutable source observation. Suggested normalized fields:

```text
source_url
canonical_url
source_domain
page_type                  # opportunity | tender | service | regulation | news | event | platform | dataset
title
publisher                  # MTCIT or named authority
sector
subsector
description
location_text
project_or_asset_name
opportunity_type
intent_type                # investment | buying | selling | partnership | permit | regulatory | information
intent_evidence            # exact short excerpt, not an unsupported LLM summary
intent_strength            # active | probable | weak | informational
published_at
updated_at
deadline_at
status_text
capacity_or_scale
land_or_site_language      # only if explicitly stated
infrastructure_language    # power, fibre, roads, ports, etc.; preserve uncertainty
eligibility_or_action
contact_org
contact_url
document_urls[]
external_authority_urls[]
retrieved_at
content_hash
extraction_run_id
```

For the land tracker, the key distinction is `land_or_site_language`: a page naming a zone, dedicated land or a data-centre location is location/investment evidence, but it is not a confirmed plot. Plot geometry, tenure/ usufruct, power capacity and allocation remain hard gates requiring the relevant authority or operator evidence.

## Firecrawl plan

### Phase 0: discovery and permission check

1. Fetch `robots.txt` and sitemap.
2. Build a canonical, same-domain URL inventory.
3. Apply the allowlist above and exclude `/web/login`, `/admin/*`, account pages, forms requiring authentication, search-result explosions and duplicate locale URLs.
4. Record crawl timestamp, robots result, sitemap hash and URL count.

### Phase 1: one bounded validation crawl

Use Firecrawl on a small sample: the investment-proposal page, investment-attraction page, one recent opportunity, one recent news/announcement, one service/permit page and one library record. The purpose is to validate selectors, dates, linked PDFs and content quality—not to ingest the whole site.

Return both Markdown and structured JSON. The JSON should be validated against the schema above and retain the page URL plus an evidence excerpt for every material field.

### Phase 2: focused recurring runs

- **Opportunity run:** investment opportunity/tender pages; frequent enough to catch deadlines and status changes.
- **Intent run:** dated announcements, agreements and project news; classify active/probable/weak intent.
- **Hard-gate run:** selected services, regulations, standards and reports; update only when content hash changes.
- **Context run:** platforms, sectors and public organisational contacts; low frequency.

Each run must be bounded, idempotent and source-scoped. Firecrawl is a validation/extraction tool here; Exa remains the discovery tool. Store raw result, normalized result, content hash, retrieval time and provenance.

## What not to scrape in the first release

- Authenticated pages, `/web/login`, admin URLs, personal account data and submitted forms.
- The entire 19k-entry sitemap without filtering.
- External domains merely because MTCIT links to them.
- Generic jobs, training, surveys or unrelated community pages unless a defined intent query requires them.
- Images/maps as if they were parcel geometry. A map or satellite reference must be stored as a link/evidence item and separately verified.
- PDF text at scale before the document metadata and extraction quality are validated.

## Acceptance criteria before production scheduling

The Firecrawl integration should not be scheduled until a test run demonstrates:

- no login/admin URLs were fetched;
- every record has canonical source URL, retrieval time and content hash;
- opportunity/tender records preserve deadline, status and linked document URLs;
- intent records preserve an exact evidence excerpt and publication/update date;
- duplicate sitemap variants collapse to one canonical record;
- external links are marked as separate authorities;
- no record is promoted to parcel or allocation-ready without the tracker hard gates and human approval.

## Sources

- MTCIT home: <https://mtcit.gov.om/>
- Robots: <https://mtcit.gov.om/robots.txt>
- XML sitemap: <https://mtcit.gov.om/sitemap.xml>
- Investment-proposal tenders: <https://mtcit.gov.om/services-5/services-13/services-92/issuing-tenders-for-investment-proposals-754>
- Investment attraction: <https://mtcit.gov.om/investment-2/investment-4/investment-opportunities-57/investment-attraction-567>
- Platforms / Naql: <https://mtcit.gov.om/platforms?platform=naql>
- Tahawul land-usufruct case study (related official MTCIT platform): <https://tahawul.mtcit.gov.om/land-usufruct-service>
- Oman Tender Board link surfaced by MTCIT: <https://etendering.tenderboard.gov.om/>
