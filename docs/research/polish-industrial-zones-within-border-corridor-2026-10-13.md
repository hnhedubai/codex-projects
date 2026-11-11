# Polish industrial-zone inventory for the hydrogen offtaker search

**Research date:** 2026-10-13  
**Screening geography:** Polish sites within approximately 250 km of the Polish–German border.  
**Primary catalogue:** Polish Investment and Trade Agency (PAIH) list of industrial and technology parks, cross-checked against PAIH regional and Polish Investment Zone pages.

## Important limitation

There is no single national register that means “all industrial zones” in one consistent way. The inventory below is therefore an authoritative discovery baseline, not a legal or cadastral assertion that no other industrial estate exists. It includes named industrial parks, technology/production parks and Special Economic Zone areas that are plausibly within the corridor. Exact inclusion must still be calculated from the actual plant coordinates using the application’s authoritative Polish–German border geometry.

The PAIH catalogue explicitly lists parks by voivodeship, including the western-region parks below. [PAIH industrial and technology parks catalogue](https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/)  
PAIH also lists the relevant Special Economic Zone operators, including Kostrzyn–Słubice, Legnica and Wałbrzych. [PAIH Polish Investment Zone](https://www.paih.gov.pl/en/why-poland/investment-incentives/polish-investment-zone/)

## Inventory for the application

| Region | Zone / park | Initial application status | Interpretation |
|---|---|---|---|
| Zachodniopomorskie | Białogard Investment Park INVEST-PARK | Discovery area | Named by PAIH; occupants require separate site-level research. |
| Zachodniopomorskie | Goleniów Industrial Park | Discovery area | Named by PAIH; screen food, metals, chemicals and other process users individually. |
| Zachodniopomorskie | Technology Park in Koszalin | Discovery area | Technology-park label does not establish industrial heat demand. |
| Zachodniopomorskie | High Technologies Industrial Park in Stargard | Discovery area | Screen actual manufacturing tenants, not park services. |
| Zachodniopomorskie | Regional Park in Gryfino | Discovery area | Near the German border; exact occupants and coordinates required. |
| Zachodniopomorskie | Stargard Industrial Park | Discovery area | Separate from the High Technologies park; do not merge without evidence. |
| Zachodniopomorskie | Technopark Pomerania, Szczecin | Discovery area | Likely technology/R&D-heavy; lower initial offtaker priority. |
| Lubuskie | Lubuski Industrial and Technology Park | Discovery area | Important Zielona Góra / Nowy Kisielin discovery area; occupants must be separated. [PAIH Lubuskie](https://www.paih.gov.pl/inwestycje/regiony/wojewodztwa/lubuskie/) |
| Lubuskie | Kostrzyn–Słubice Special Economic Zone | Discovery area | Strong corridor relevance; named occupants include Arctic Paper, ICT Poland, AB Foods, Teleskop and Alumetal. [PAIH KSSSE profile](https://www.paih.gov.pl/inwestycje/zachety-inwestycyjne/polska-strefa-inwestycji/kostrzyn/) |
| Dolnośląskie | Lower Silesian Technology Park “T-Park” | Discovery area | Screen actual production tenants; park itself is not an offtaker. |
| Dolnośląskie | Nowa Ruda Industrial Park | Discovery area | Named by PAIH; exact location and occupant list require verification. |
| Dolnośląskie | Bukowice Industrial Park / Brzeg Dolny | High-priority discovery area | Chemical-process cluster; PCC Rokita is a named plant-level research target. |
| Dolnośląskie | Wrocław Industrial Park | Discovery area | Screen manufacturing and process-heat tenants; exclude offices and service providers. |
| Dolnośląskie | Wrocław Technology Park | Discovery area | PAIH describes production, laboratory and business facilities; not all tenants are energy users. [PAIH Wrocław Technology Park](https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/wroclaw-tp/) |
| Dolnośląskie | Legnica Special Economic Zone | Discovery area | Zone container; create separate candidate records for actual plants. |
| Dolnośląskie | Wałbrzych Special Economic Zone | Discovery area | Zone container; exact sites may be farther from the border and require GIS validation. |
| Opolskie | Kędzierzyn–Koźle Industrial Park | High-priority discovery area | Chemical/process industry; Grupa Azoty ZAK and other occupants require feedstock-versus-fuel checks. [PAIH Opolskie](https://www.paih.gov.pl/inwestycje/regiony/wojewodztwa/opolskie/) |
| Opolskie | Opole Science and Technology Park | Discovery area | Technology/production mix; screen actual industrial tenants only. |
| Wielkopolskie | Eureka Technology Park | Discovery area | Include only identifiable manufacturing or process sites. |
| Wielkopolskie | Kalisz Technological Incubator | Outer-corridor discovery area | Include subject to exact border-distance validation. |
| Wielkopolskie | LUVENA Industrial Park | Discovery area | Industrial chemicals/materials relevance requires occupant-level verification. |
| Wielkopolskie | Poznań Science and Technology Park | Discovery area | Technology and R&D container; lower priority until industrial energy users are identified. |
| Wielkopolskie | Poznań Technology and Industry Park | Discovery area | Screen actual production occupants. |
| Wielkopolskie | YouNick Technology Park | Discovery area | Technology-park container; do not classify as an offtaker. |

## Additional major Polish industrial areas already in the research set

These are important named industrial areas or plant clusters but are not all represented by the PAIH park catalogue in the same way:

- Szczecin–Police industrial area — refinery/chemical/fertiliser and port-linked industry.
- Głogów copper and metals area — smelting/refining and non-ferrous metals; screen KGHM site records separately.
- Legnica copper and metals area — non-ferrous metals and industrial processing.
- Schwedt is on the German side and remains a separate German-zone record.

## Candidate-management rule

The application should use this inventory as a **zone selector and query generator**, not as a candidate list. For each zone:

1. Identify the actual plant/operator and exact address.
2. Geocode the plant, not the zone centroid.
3. Enforce the 250 km straight-line distance to the Polish–German border.
4. Exclude park operators, economic-development agencies, consultants, associations and infrastructure developers.
5. Verify a process, current fuel, hydrogen-use or fuel-switch signal from a credible source.
6. Keep hydrogen demand as an estimate until evidence supports it.

## Current application coverage

The Search Workspace now contains 24 Polish zone/area entries and 8 German entries. The Polish entries are discovery containers and are not confirmed hydrogen offtakers.
