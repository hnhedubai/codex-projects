# Industrial-zone screening leads

Research date: 2026-10-13

The Search Workspace now displays a named screening table for every zone in the catalog. The table is intentionally a discovery layer: entries are not promoted to hydrogen candidates until the exact site, operator, current fuel, process and credible evidence are verified.

The table also contains public Brave Search API link matches for the named entries: 106 website URLs and 78 LinkedIn URLs across 112 zone entries. These are link-discovery results, not verified legal-entity matches. The UI labels them accordingly and leaves unmatched fields blank.

## Interpretation

- A named paper mill, refinery, chemical plant, glass plant, metal plant, food plant, pulp plant or other process site is a lead for offtaker research.
- A power plant, hydrogen producer, gas supplier, pipeline operator, park manager, logistics company, consultant or service provider is shown only to support classification and exclusion.
- Broad technology parks, SEZs and mixed industrial parks are marked `Exact plant required`; the zone itself is never treated as one buyer.
- Project references are marked future or unconfirmed. No hydrogen tonnes/day, purity, pressure, delivery route or start date is inferred from the zone table.

## Primary source anchors

- [ASG Spremberg industrial location](https://www.asg-spremberg.de/wirtschaftsstandort/) identifies the Schwarze Pumpe industrial park, its industrial companies and its scale.
- [Chemiepark Bitterfeld-Wolfen company directory](https://www.chemiepark.de/en/chemiepark/companies-at-the-location) identifies producers and the distinction between producers, suppliers and service providers.
- [Dow ValuePark company directory](https://de.dow.com/de-de/standorte/mitteldeutschland/valuepark.html) identifies Braskem, Synthos, Trinseo and other Schkopau/Boehlen occupants.
- [Investieren in Sachsen-Anhalt chemical locations](https://www.investieren-in-sachsen-anhalt.de/branchen/chemie) identifies named Bitterfeld-Wolfen and Leuna industrial companies.
- [ASG Spremberg process-utility context](https://www.asg-spremberg.de/wirtschaftsstandort/wirtschaftsraum-spremberg-spreetal/) explains that the Schwarze Pumpe power plant supplies process steam and district heat to nearby users.
- Link discovery was performed through the server-side Brave Search API adapter on 2026-10-13; API keys were read only from `apps/api/.env` and were not exposed to the browser.

## Limitation

Some park-level entries are research leads assembled from official location directories and known site/operator references. They do not prove that a company currently burns fossil fuel, wants hydrogen, or can take 2–10 tonnes/day. The next workflow step is to run the zone-specific Brave or SerpApi search, preserve the raw response, and promote only individually verified plants.
