# Polish industrial-zone GIS validation

**Validation date:** 2026-10-13  
**Border geometry:** repository asset `apps/api/src/data/gisco-polish-german-border-2024.json`, derived from Eurostat GISCO 2024 1:1m country geometry, EPSG:4326.  
**Distance method:** application function `distanceToPolishGermanBorderKm`, calculating the shortest straight-line distance from the supplied coordinate to the extracted Polish–German border line.  
**Geocoding:** OpenStreetMap/Nominatim read-only geocoding. The resulting coordinates are not API-confirmed plant coordinates unless the geocoder returned the actual park or industrial feature.

## Result

The answer is **not “all zones confirmed.”** Most representative locations are inside 250 km, but several entries are zone-wide containers or were calculated from city centres. Those must not be treated as exact site validation.

| Zone / area | Representative coordinate basis | Calculated distance | Status |
|---|---|---:|---|
| Kostrzyn–Słubice SEZ | Kostrzyn nad Odrą town point; the SEZ covers a much larger territory | 2.2 km | **Zone-wide; plant-level validation required** |
| Kędzierzyn–Koźle Industrial Park | Kędzierzyn–Koźle town point | 242.0 km | **Borderline; exact park/site coordinate required** |
| Bukowice / Brzeg Dolny | Brzeg Dolny town point | 116.1 km | Representative point in corridor; exact park/site required |
| Lower Silesian Technology Park (T-Park) | Szczawno-Zdrój town point | 94.5 km | Representative point in corridor; exact park/site required |
| Nowa Ruda Industrial Park | Nowa Ruda town point | 120.7 km | Representative point in corridor; exact park/site required |
| Wrocław Industrial Park | Wrocław town point | 140.1 km | Representative point in corridor; exact park/site required |
| Wrocław Technology Park | Wrocław town point | 140.1 km | Representative point in corridor; exact park/site required |
| Lubuski Industrial and Technology Park | Zielona Góra town point; official park address is Nowy Kisielin | 56.2 km | Representative point in corridor; exact park/site required |
| Opole Science and Technology Park | Opole town point | 211.8 km | **Borderline; exact park/site coordinate required** |
| Eureka Technology Park | OSM industrial feature in Dąbrowa, Dopiewo | 138.3 km | Geocoded park feature in corridor |
| Kalisz Technological Incubator | Kalisz town point | 217.0 km | **Borderline; exact park/site coordinate required** |
| LUVENA Industrial Park | OSM industrial feature at Luvena S.A., Luboń | 149.0 km | Geocoded industrial feature in corridor |
| Poznań Science and Technology Park | OSM park feature, Rubież 46 | 154.3 km | Geocoded park feature in corridor |
| Poznań Technology and Industry Park | OSM park feature, 28 Czerwca 1956 roku | 149.7 km | Geocoded park feature in corridor |
| YouNick Technology Park | Zalasewo town point | 161.4 km | Representative point in corridor; exact park/site required |
| Białogard Investment Park INVEST-PARK | Białogard town point | 116.8 km | Representative point in corridor; exact park/site required |
| Goleniów Industrial Park | OSM boundary feature, Łozienica | 28.9 km | Geocoded park boundary in corridor |
| Technology Park in Koszalin | Koszalin town point | 136.4 km | Representative point in corridor; exact park/site required |
| High Technologies Industrial Park in Stargard | Stargard town point | 39.8 km | Representative point in corridor; exact park/site required |
| Regional Park in Gryfino | Gryfino town point | 3.0 km | Representative point in corridor; exact park/site required |
| Stargard Industrial Park | Stargard town point | 39.1 km | Representative point in corridor; exact park/site required |
| Technopark Pomerania | Szczecin town point | 14.3 km | Representative point in corridor; exact park/site required |
| Legnica SEZ | Legnica town point; SEZ is geographically distributed | 79.4 km | **Zone-wide; plant-level validation required** |
| Wałbrzych SEZ | Wałbrzych town point; SEZ is geographically distributed | 97.3 km | **Zone-wide; plant-level validation required** |

## Interpretation

- **No representative point above 250 km was identified in this pass**, but that does not prove every parcel or occupant in a zone is inside the corridor.
- **Kędzierzyn–Koźle, Opole and Kalisz are the main borderline cases.** Their representative points are inside the limit, but the margin is small enough that exact plant coordinates are mandatory.
- **Kostrzyn–Słubice, Legnica SEZ and Wałbrzych SEZ are distributed administrative areas**, not single sites. They must remain zone containers and must not inherit one distance value.
- Technology parks can contain laboratories, offices, start-ups and service companies. Zone inclusion is not offtaker evidence.
- Exact candidate qualification still requires the actual industrial site address, coordinates, process, fuel evidence and source-backed hydrogen-fit assessment.

## Source references

## German-zone validation added to Search Workspace

The eight German discovery zones were subsequently geocoded using representative place/park points and calculated against the same GISCO border geometry:

| German zone | Distance | Status |
|---|---:|---|
| Schwedt | 3.2 km | Representative point in corridor |
| Guben Süd | 0.3 km | Representative point in corridor |
| Chemiepark Bitterfeld-Wolfen | 158.6 km | Representative point in corridor |
| Leuna | 186.0 km | Representative point in corridor |
| ValuePark Schkopau / Böhlen | 186.4 km | Representative point in corridor |
| Industriepark Premnitz | 125.2 km | Representative point in corridor |
| Agro-Chemical Park Piesteritz | 137.2 km | Representative point in corridor |
| Industriepark Schwarze Pumpe | 26.6 km | Representative point in corridor |

These are still representative zone points, not proof that every occupant or plant parcel is inside the corridor.

- [Eurostat GISCO 2024 country geometry used by the application](https://gisco-services.ec.europa.eu/distribution/v2/countries/countries-2024-units.html)
- [PAIH industrial and technology parks catalogue](https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/)
- [PAIH Polish Investment Zone](https://www.paih.gov.pl/en/why-poland/investment-incentives/polish-investment-zone/)
- [PAIH Kostrzyn–Słubice profile](https://www.paih.gov.pl/en/why-poland/investment-incentives/polish-investment-zone/kostrzyn/)
- [Official Lubuski Park address in Nowy Kisielin](https://lppt.pl/kontakt/)
- [OSM/Nominatim geocoder](https://nominatim.openstreetmap.org/)
