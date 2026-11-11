# Oman publisher investigation and bounded Firecrawl scope

**Research date:** 2026-10-06  
**Objective:** identify what the six official publishers can contribute to the Oman Tracker before any crawl is scheduled.  
**Method:** official first-party pages only; no authenticated access, bulk crawl, form submission, or external mutation.

## Executive conclusion

These publishers are complementary, not interchangeable:

| Publisher | Best signal | Land-tracker value | Main limitation |
|---|---|---|---|
| OPAZ | Zone-wide investment, land and regulatory signals | Highest authority for SEZ/free-zone governance and aggregate land/open-data context | Aggregate data and allocation workflow are not a live plot offer |
| SEZAD / Duqm | Duqm investment and usufruct workflow | Strongest direct route from project application to plot allocation | Allocation is application/evaluation-based; public pages do not prove current availability |
| Khazaen | Commercial investment offerings and signed-project news | Good investor/project intent and zone context | Public pages do not expose a parcel registry or utility capacity certificate |
| SOHAR Port and Freezone | Land leasing, port/logistics and industrial demand | Strong site-enablement and tenant-intent evidence | Marketing pages are not a confirmed plot/lease commitment |
| Madayn | Industrial-estate opportunity and plot discovery | Strongest public structured plot/estate discovery surface | Portal counts and availability need timestamped verification and authority confirmation |
| ITA legacy portal / MTCIT | Digital investment and data-centre signals | High value for data-centre, cloud, AI and telecom intent | ITA was transferred into the ministry; portal is legacy and not a land authority |

The tracker should preserve each observation as source-backed evidence. A publisher page may create a candidate or intent signal, but it must not automatically set `plot_available`, `land_allocated`, `power_confirmed`, or `investment_ready`.

## 1. OPAZ — Public Authority for Special Economic Zones and Free Zones

**Official sources**

- [OPAZ home](https://www.opaz.gov.om/en)
- [Authority functions](https://opaz.gov.om/en/about-us/authority-s-functions)
- [Open Data](https://www.opaz.gov.om/en/open-data/open-data)
- [SEZAD land-selection service announcement](https://opaz.gov.om/en/media-center/news/2021/opaz-launches-land-selection-e-service-for-investors-in-sezad)
- [OPAZ legislation](https://opaz.gov.om/en/legislation/royal-decree)
- [Sohar Free Zone profile](https://www.opaz.gov.om/en/zones/sohar-free-zone)

**What it offers**

OPAZ oversees SEZAD/Duqm, Salalah, Al Mazunah, Sohar and other zones, promotes investment opportunities, publishes incentives and legislation, and provides zone-level indicators. Its open-data catalogue includes total, developed and leased area datasets, with reference periods and downloadable XLSX files. The SEZAD land-selection announcement describes GIS selection, master-plan context, coordinates, nearby utility distances and a request path for non-standard land specifications.

**Signals to extract**

- zone and operator name; activity/sector; investment opportunity title;
- land indicator name, value, unit, geographic coverage, reference period, publication/revision date and download URL;
- explicit land, infrastructure, utility, GIS, master-plan or allocation language;
- investment incentives, regulations, fees, licensing and compliance requirements;
- dated news about new projects, agreements, expansions, land allocation or investor attraction;
- links to the responsible zone and separate operator authority.

**Hard-gate limits**

OPAZ aggregate developed/leased-area datasets cannot prove a particular vacant plot, geometry, tenure, power capacity or connection date. The land-selection service description is a workflow capability, not a public reservation or allocation record. Legislation and incentives are context/hard-gate evidence, not investment intent by themselves.

**Bounded Firecrawl scope**

1. Home, authority functions and each zone profile (allowlisted zone URLs only).
2. Open-data catalogue index plus the three land datasets; capture metadata first and download XLSX only after a file/hash test.
3. One land-selection announcement and one current investment/news item.
4. Legislation index and selected current land/usufruct/licensing documents; do not bulk-crawl every PDF.
5. Exclude login/admin/forms and linked external zone portals unless separately approved.

## 2. SEZAD / Duqm

**Official sources**

- [Duqm investment overview](https://duqm.gov.om/en/invest)
- [Apply for land usufruct](https://duqm.gov.om/en/apply-for-land-usufruct)
- [Duqm investment FAQ](https://duqm.gov.om/en/invest/faq)
- [Duqm publications](https://duqm.gov.om/en/publications)

**What it offers**

Duqm explains the investor journey: submit a usufruct application and supporting documents, evaluation, approval/payment, plot allocation, site visit and agreement. The service page states a maximum processing time when requirements are met and identifies the service fee. The investment page describes sectors such as industrial properties, tourism, storage/logistics, commercial offices and residential complexes, together with infrastructure/location advantages and potential opportunities. The FAQ clarifies that land is provided through renewable usufruct rather than sale and that allocation follows evaluation.

**Signals to extract**

- project/opportunity title, sector, requested activity and location/zone;
- application stage, required documents, fee, stated processing time and next action;
- explicit plot allocation, coordinates, site visit, usufruct, infrastructure or utility references;
- investment sectors, project scale, project status, published/updated date;
- official contact and application URL; publication PDF title and date.

**Hard-gate limits**

A service page proves the route and conditions, not that a specific plot is vacant or suitable. Allocation is subject to evaluation and may be project-specific. Public marketing claims about area, access or incentives do not replace a current plot plan, lease/usufruct document, utility confirmation, environmental approvals or site survey.

**Bounded Firecrawl scope**

1. `/en/invest`, `/en/apply-for-land-usufruct`, `/en/invest/faq`.
2. Investment-opportunity index/detail pages linked from `/en/invest`.
3. One current publication or quarterly magazine issue; capture PDF metadata and only extract pages containing opportunity/land evidence.
4. Exclude application submission, account/login, payment and any authenticated SEZAD portal.

## 3. Khazaen Economic City

**Official sources**

- [Khazaen home](https://khazaen.om/)
- [Offerings](https://khazaen.om/offerings/)
- [Investment application](https://khazaen.om/investment-application/)
- [Investors guideline](https://khazaen.om/investors-guideline/)
- [Khazaen news](https://khazaen.om/news/)

**What it offers**

Khazaen presents an integrated economic city near Muscat with free-zone, industrial, logistics, residential and commercial components, infrastructure and investor support. Its site links offerings, application, investor guidance, downloads and dated project news. The news pages record signed/localized FDI projects, sector, value and parties, which are useful intent and project-status signals.

**Signals to extract**

- offering/project name, component, sector and location;
- land/warehouse/commercial/residential offering language and application route;
- infrastructure claims (road, dry port, utilities) as claims with exact excerpts;
- project agreement, investor/company, value, date, phase and status from news;
- investor contact URL, public organisational email and downloadable brochure metadata.

**Hard-gate limits**

The public site is an operator/investment marketing and application surface. It does not establish live parcel inventory, boundaries, title/usufruct status, grid capacity or a binding lease. Contact forms must not be submitted by a crawler; public email addresses should be stored as organisational routing, not as verified decision-maker contacts.

**Bounded Firecrawl scope**

1. Home, Khazaen overview, why/infrastructure, offerings, incentives and investor guideline.
2. Investment-application page as metadata only; do not submit forms.
3. News index and the latest 10 project/investment articles, deduplicated by canonical URL.
4. Downloads/brochure metadata and linked PDFs only after file-size/hash limits are set.
5. Exclude vendor registration, careers, login and personal/contact-form data.

## 4. SOHAR Port and Freezone

**Canonical-domain finding**

The supplied `soharportandfreezone.com` is an older/reference domain used in legacy documents, email addresses and the Tas'heel portal. The current public corporate site is [soharportandfreezone.om](https://soharportandfreezone.om/), including [Sohar Port opportunities](https://soharportandfreezone.om/sohar-port/?lang=en). Preserve both domains as aliases, but crawl the `.om` canonical site. Do not crawl `tas.soharportandfreezone.com` because it is an authenticated service portal.

**What it offers**

The current site describes port and free-zone investment, land-lease options, marine services, industrial/logistics clusters, infrastructure, tenant solutions and tenders. It publishes investor guidance and permit rules. These are strong site-enablement and sector-demand signals for logistics, manufacturing, metals, petrochemicals, food, pharmaceuticals, renewable energy and circular-economy projects.

**Signals to extract**

- land-lease offering, activity, plot/area wording and application/contact route;
- port service, terminal, marine, warehouse, logistics and industrial-cluster evidence;
- investor/tenant, investment value, expansion phase, reserved land and project status from news;
- tender reference/title, issuer, scope, deadline and document URL;
- permit rules, utility/application instructions and infrastructure claims;
- canonical URL, last-updated date and official business-development contact.

**Hard-gate limits**

Land-lease language and investor stories do not prove live inventory, plot geometry, lease award or utility capacity. Tenders indicate buying/procurement intent, not necessarily a land opportunity. Legacy `.com` references and email addresses must not be treated as proof that the old site is canonical.

**Bounded Firecrawl scope**

1. Current `.om` home, Sohar Port opportunities, free-zone opportunities, industry clusters, services and investor guidance.
2. News index: latest 10 investment/expansion/tenant stories.
3. Public tenders and permit-rules documents; capture deadlines, references and PDF hashes.
4. Verify one old `.com` URL redirect/availability as a domain-alias check only.
5. Exclude Tas'heel login, account pages, forms and external Routescanner/partner systems.

## 5. Madayn — Public Establishment for Industrial Estates

**Official sources**

- [Madayn home](https://madayn.om/)
- [Explore Madayn](https://explore.madayn.om/)
- [Explore Madayn search](https://explore.madayn.om/search)
- [Madayn investment portal](https://invest.madayn.om/)
- [Open-data Atlas description](https://opendata.madayn.om/applicationdetails.aspx?id=4)
- [Example investment-opportunity announcement](https://madayn.om/madayn-briefs-investors-on-opportunities-in-al-suwaiq-industrial-city/)

**What it offers**

Madayn operates industrial estates across Oman. Explore Madayn advertises estate locations, detailed estate data, plots, rent policies, activities, tenants, available plots and infrastructure such as power, telecom, sewerage, water/drainage and gas. Its search surface exposes filters by land use, city or number and separates lands, offices/industrial spaces and investment opportunities. Madayn's Atlas description says it covers residential, service and commercial opportunities and development projects.

**Signals to extract**

- estate/city, plot or opportunity identifier, land use, area, rent policy and status;
- tenant activity and sector; supporting infrastructure fields and exact source wording;
- opportunity study/profile, project stage, location, capacity/value and linked documents;
- published/updated timestamp, availability count and portal result URL;
- regulation, investor-guide and service requirements.

**Hard-gate limits**

Portal availability is time-sensitive and may be a rendered application result, not a signed reservation. Counts must be timestamped and independently rechecked before ranking. Infrastructure labels are indicative; grid capacity, connection lead time, plot boundaries and lease terms require authority confirmation. The portal may expose zero or incomplete counts depending on filters/session.

**Bounded Firecrawl scope**

1. Explore landing/search pages with a small fixed filter sample: industrial, logistics, service and residential.
2. Capture only result cards/detail pages returned by those filters; limit pages and preserve query/filter state.
3. Crawl Madayn investment portal index and latest opportunity profiles.
4. Crawl Atlas description and relevant public regulations/investor guide metadata.
5. Do not brute-force plot IDs, submit forms, or crawl authenticated/admin endpoints; use browser/API inspection only if publicly documented and read-only.

## 6. ITA legacy portal / MTCIT digital-investment material

**Domain/configuration finding**

`ita.gov.om` remains publicly reachable and contains useful legacy MTCIT/ITA pages and PDFs, but it is not a current independent land publisher. Official pages are branded as the Ministry of Transport, Communications and Information Technology, use `@mtcit.gov.om` contacts, and a legacy ITA document states that ITA authorities/assets were transferred to the ministry under Royal Decree 63/2019. Treat `ita.gov.om` as a legacy source alias under MTCIT, not as a separate land authority.

**Official sources**

- [ITA/MTCIT investment attraction page](https://ita.gov.om/ITAPortal/Pages/Page.aspx?NID=292821&PID=771842)
- [Data-centre investment opportunity PDF](https://www.ita.gov.om/itaportal/Data/SiteImgGallery/202542782754100/Investment%20Opportunity%20in%20ICT.pdf)
- [Digital investment opportunities PDF](https://www.ita.gov.om/itaportal/Data/English/DocLibrary/202382132625170/Digital%20Investment%20Opportunities2.pdf)
- [MTCIT data-hosting investment announcement](https://ita.gov.om/ITAPortal/MediaCenter/NewsDetail.aspx?NID=81257)
- [ITA transfer evidence](https://www.ita.gov.om/itaportal/Data/SiteImgGallery/20191215133327512/MTC_Accred_Manual.pdf)
- [MTCIT document library](https://ita.gov.om/ITAPortal/MediaCenter/Document_Library.aspx)

**What it offers**

The portal contains digital-industry investment attraction material, project-description forms, data-centre/cloud opportunities, AI/advanced-technology programmes, submarine-cable/connectivity claims, digital infrastructure initiatives, dated announcements and reports. A current PDF describes Tier 3/4 data centres in Dhofar and Sohar, indicative area/investment/time ranges, stakeholders and requirements. These are highly relevant buying/investment signals for the data-centre objective.

**Signals to extract**

- opportunity title, sector, candidate governorate/city, capacity/area, investment estimate and implementation period;
- stakeholder/partner names, project stage, announcement date and exact intent evidence;
- digital infrastructure terms: data centre, cloud, submarine cable, fibre, renewable energy, cooling;
- requirements such as commercial registration, business proposal and sector licence;
- document title, version/date, contact email and canonical MTCIT cross-link.

**Hard-gate limits**

These materials are opportunity/promotional and pre-visibility evidence; they do not prove a vacant plot, land allocation, power availability, water/cooling feasibility or current project status. The project-description form is a submission workflow and must not be automated. Legacy pages/PDFs need freshness checks and cross-linking to current MTCIT pages.

**Bounded Firecrawl scope**

1. Investment-attraction landing page and current digital/data-centre opportunity PDFs.
2. Latest 10 relevant news/announcement pages for data centres, cloud, AI, submarine cables and digital infrastructure.
3. Document-library index and selected report/PDF metadata; extract only relevant pages after content-hash and size controls.
4. Preserve `source_domain=ita.gov.om`, `publisher=MTCIT (legacy ITA portal)`, and `canonical_publisher_domain=mtcit.gov.om`.
5. Exclude project-description/contact submission forms, login, internships/jobs and unrelated historical ITA content.

## Shared extraction and promotion rules

Every crawled observation should include:

```text
source_url, canonical_url, source_domain, publisher, page_type,
title, project_or_asset_name, sector, location_text, intent_type,
intent_evidence, intent_strength, published_at, updated_at,
deadline_at, status_text, capacity_or_scale, land_or_site_language,
infrastructure_language, contact_org, document_urls, retrieved_at,
content_hash, extraction_run_id
```

Classify signals separately as `investment`, `buying`, `selling`, `partnership`, `permit`, `regulatory` or `informational`. Store exact short evidence excerpts and freshness. Keep linked authorities separate: OPAZ/SEZAD/Madayn/Sohar operator pages are not interchangeable with MTCIT, utilities, cadastral/land records or power-grid confirmations.

The first run should be one bounded validation crawl per publisher, with allowlists, page limits, robots checks, canonical deduplication, raw Markdown/HTML retention, structured JSON validation and no authenticated/form pages. Only after comparing yield, duplication, freshness and hard-gate coverage should recurring crawls be scheduled.

