export const INDUSTRIAL_ZONES = [
  { id: 'schwedt', country: 'DE', label: 'Schwedt industrial area / PCK site', query: 'Schwedt PCK refinery', gisStatus: 'Representative point in corridor', distanceKm: 3.2, occupants: [
    { company: 'PCK Raffinerie GmbH', industry: 'Oil refining, fuels, petrochemicals, steam and power', status: 'Strong industrial candidate; verify refinery hydrogen feedstock versus external fuel demand' },
    { company: 'VERBIO Schwedt GmbH', industry: 'Bioethanol, biodiesel, biomethane, fertilizer and animal feed', status: 'Possible process-heat candidate; verify boiler fuel and hydrogen compatibility' },
    { company: 'LEIPA Georg Leinfelder GmbH — Mill Schwedt', industry: 'Graphic, packaging and recovered-paper products', status: 'Strong paper-process candidate; verify steam, drying and current fuel' },
    { company: 'BUTTING Anlagenbau GmbH & Co. KG', industry: 'Tanks, vessels, apparatus, pipework and industrial services', status: 'Possible metal-process candidate; verify furnace/reheating fuel use' },
    { company: 'HPS Holzkontor- und Pelletierwerk Schwedt', industry: 'Wood handling and pellet production', status: 'Possible industrial heat user; verify process equipment and current fuel' },
    { company: 'Mineralölverbundleitung GmbH Schwedt', industry: 'Crude-oil pipeline infrastructure', status: 'Infrastructure/enabler — exclude as an offtaker' },
    { company: 'IP Industriepark Schwedt GmbH & Co. KG', industry: 'Industrial-park operation and site services', status: 'Infrastructure/enabler — exclude as an offtaker' },
  ] },
  { id: 'guben-sued', country: 'DE', label: 'Guben Süd industrial area', query: 'Guben Süd chemical plastics industrial area', gisStatus: 'Representative point in corridor', distanceKm: 0.3, occupants: [
    { company: 'Indorama Ventures Fibers Germany / Trevira', industry: 'Modified polyester granules, fibres and yarns', status: 'Strong process-industry candidate; verify gas and steam use' },
    { company: 'Grupa Azoty ATT Polymers GmbH', industry: 'Polyamide 6 and chemical production', status: 'Strong chemical-process candidate; distinguish feedstock hydrogen from fuel hydrogen' },
    { company: 'Megaflex Schaumstoff GmbH', industry: 'Polyurethane flexible foam manufacturing', status: 'Possible process-heat candidate; verify boilers and current fuel' },
    { company: 'Jack Link’s / Bifi Guben', industry: 'Food production and meat snacks', status: 'Possible boiler/process-heat candidate; verify plant fuel use' },
    { company: 'Bäcker Dreißig', industry: 'Industrial bakery and food production', status: 'Possible boiler candidate; current site evidence required' },
    { company: 'Rock Tech Lithium', industry: 'Planned lithium/hydroxide industrial project', status: 'Future industrial user; operating offtake not confirmed' },
    { company: 'Unylon Polymers', industry: 'Historical polyamide production reference', status: 'Needs current operational verification' },
    { company: 'Performance Fibers', industry: 'Historical technical-fibre reference', status: 'Needs current operational verification' },
    { company: 'LAUFARON', industry: 'Historical polyamide-yarn reference', status: 'Needs current operational verification' },
    { company: 'Riederer', industry: 'Historical silicone manufacturing reference', status: 'Needs current operational verification' },
  ] },
  { id: 'bitterfeld-wolfen', country: 'DE', label: 'Chemiepark Bitterfeld-Wolfen', query: 'Chemiepark Bitterfeld-Wolfen', gisStatus: 'Representative point in corridor', distanceKm: 158.6 },
  { id: 'leuna', country: 'DE', label: 'Leuna chemical site', query: 'Leuna chemical site refinery', gisStatus: 'Representative point in corridor', distanceKm: 186 },
  { id: 'valuepark-schkopau-boehlen', country: 'DE', label: 'ValuePark Schkopau / Böhlen', query: 'ValuePark Schkopau Böhlen chemical park', gisStatus: 'Representative point in corridor', distanceKm: 186.4 },
  { id: 'premnitz', country: 'DE', label: 'Industriepark Premnitz', query: 'Industriepark Premnitz', gisStatus: 'Representative point in corridor', distanceKm: 125.2 },
  { id: 'piesteritz', country: 'DE', label: 'Agro-Chemical Park Piesteritz', query: 'Agro-Chemical Park Piesteritz', gisStatus: 'Representative point in corridor', distanceKm: 137.2 },
  { id: 'schwarze-pumpe', country: 'DE', label: 'Industriepark Schwarze Pumpe', query: 'Industriepark Schwarze Pumpe', gisStatus: 'Representative point in corridor', distanceKm: 26.6, occupants: [
    { company: 'LEAG Kraftwerk Schwarze Pumpe', industry: 'Lignite-fired power generation, process steam and district heat', status: 'Energy producer/self-supply; potential hydrogen fit is unconfirmed and must not be treated as external offtake' },
    { company: 'LEAG Brikettfabrik / lignite processing', industry: 'Lignite briquettes and solid-fuel processing', status: 'Possible high-temperature/process-heat user; verify current equipment, fuel use and operating status' },
    { company: 'Hamburger Rieger GmbH / Hamburger Containerboard', industry: 'Paper and corrugated-base-paper production', status: 'Strong industrial energy-user candidate; verify steam, drying load, fuel and hydrogen-ready equipment' },
    { company: 'Dunapack Spremberg GmbH & Co. KG', industry: 'Corrugated packaging and paper products', status: 'Possible paper-process candidate; verify exact site operations, boilers, drying and current fuel' },
    { company: 'Knauf Deutsche Gipswerke KG', industry: 'Gypsum products and drywall manufacturing', status: 'Possible kiln/dryer candidate; verify burners, fuel use and whether demand is site-specific' },
    { company: 'Altech Industries Germany GmbH / Dock3 Lausitz', industry: 'Planned alumina and solid-state battery materials production', status: 'Future industrial user; project and operating hydrogen demand are not confirmed' },
    { company: 'Silicon Pilot Production', industry: 'Historical silicon processing / photovoltaic materials', status: 'Older park-directory reference; current operation and fuel demand require verification' },
    { company: 'Deutsche Biomethanolfabrik / Blue Planet Bio-Energy', industry: 'Biomethanol and bioenergy project reference', status: 'Project/older-directory reference; verify current legal entity, operation and whether hydrogen is a feedstock or fuel' },
    { company: 'GP Papenburg Betonwerke / Heidelberger Beton', industry: 'Concrete and construction-material production', status: 'Possible industrial heat user; lower-priority until plant process and fuel evidence are sourced' },
    { company: 'AGAT Tank', industry: 'Tank storage and industrial logistics', status: 'Possible industrial site but not yet a qualified hydrogen energy offtaker; verify thermal processes' },
    { company: 'ASG Spremberg GmbH', industry: 'Industrial-park management and utilities', status: 'Infrastructure/enabler; exclude as an offtaker' },
    { company: 'Linde Gas Produktionsgesellschaft', industry: 'Technical-gas production and supply', status: 'Hydrogen/gas supplier or enabler; exclude as an offtaker unless an independent consuming plant is identified' },
    { company: 'Sulzer Pumpen, XERVON, Buchen, Remondis and Lobbe', industry: 'Industrial maintenance, environmental and equipment services', status: 'Service/enabler group; exclude as an offtaker unless a separately identified consuming plant is found' },
    { company: 'TSS Transport- und Speditionsgesellschaft', industry: 'Transport and logistics', status: 'Logistics provider; exclude as an offtaker' },
  ] },
  { id: 'eberswalde', country: 'DE', label: 'Technologie- und Gewerbepark Eberswalde', query: 'Technologie- und Gewerbepark Eberswalde industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 21.8 },
  { id: 'solvay-bernburg', country: 'DE', label: 'Industriepark Solvay Bernburg', query: 'Industriepark Solvay Bernburg chemical companies', gisStatus: 'Representative point in corridor', distanceKm: 196.4 },
  { id: 'zeitz', country: 'DE', label: 'Chemical and Industrial Park Zeitz', query: 'Chemie- und Industriepark Zeitz chemical companies', gisStatus: 'Representative point in corridor', distanceKm: 188.2 },
  { id: 'altmark-arneburg', country: 'DE', label: 'Industrial and Commercial Park Altmark', query: 'Industrie- und Gewerbepark Altmark Arneburg industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 144 },
  { id: 'koethen', country: 'DE', label: 'Industriepark Köthen Süd', query: 'Industriepark Köthen Süd industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 180.3 },
  { id: 'technologiepark-mitteldeutschland', country: 'DE', label: 'TechnologiePark Mitteldeutschland', query: 'TechnologiePark Mitteldeutschland Sandersdorf-Brehna industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 163.8 },
  { id: 'high-tech-park-magdeburg', country: 'DE', label: 'High-Tech Park Sachsen-Anhalt', query: 'High-Tech Park Sachsen-Anhalt Magdeburg industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 197.4 },
  { id: 'sket-magdeburg', country: 'DE', label: 'SKET Industriepark Magdeburg', query: 'SKET Industriepark Magdeburg metal industrial companies', gisStatus: 'Industrial feature in corridor', distanceKm: 187.7 },
  { id: 'gid-ost-delitzsch', country: 'DE', label: 'GID Ost Gewerbe- und Industriepark Delitzsch', query: 'GID Ost Delitzsch industrial park companies', gisStatus: 'Representative point in corridor', distanceKm: 158.6 },
  { id: 'kostrzyn-slubice', country: 'PL', label: 'Kostrzyn–Słubice Special Economic Zone', query: 'Kostrzyn Słubice industrial zone', gisStatus: 'Zone-wide — exact plant required', distanceKm: 2.2 },
  { id: 'kedzierzyn-kozle', country: 'PL', label: 'Kędzierzyn–Koźle chemical area', query: 'Kędzierzyn-Koźle chemical industrial area', gisStatus: 'Borderline — exact plant required', distanceKm: 242 },
  { id: 'brzeg-dolny', country: 'PL', label: 'Bukowice / Brzeg Dolny industrial area', query: 'Brzeg Dolny PCC Rokita industrial area', gisStatus: 'Representative point in corridor', distanceKm: 116.1 },
  { id: 'tp-park-dolnoslaskie', country: 'PL', label: 'Lower Silesian Technology Park (T-Park)', query: 'Dolnośląski Park Technologiczny T-Park industrial site', gisStatus: 'Representative point in corridor', distanceKm: 94.5 },
  { id: 'nowa-ruda', country: 'PL', label: 'Nowa Ruda Industrial Park', query: 'Noworudzki Park Przemysłowy industrial site', gisStatus: 'Representative point in corridor', distanceKm: 120.7 },
  { id: 'wroclaw-industrial', country: 'PL', label: 'Wrocław Industrial Park', query: 'Wrocławski Park Przemysłowy industrial site', gisStatus: 'Representative point in corridor', distanceKm: 140.1 },
  { id: 'wroclaw-technology', country: 'PL', label: 'Wrocław Technology Park', query: 'Wrocławski Park Technologiczny industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 140.1 },
  { id: 'lubuski-industrial-technology', country: 'PL', label: 'Lubuski Industrial and Technology Park', query: 'Lubuski Park Przemysłowo-Technologiczny Zielona Góra', gisStatus: 'Representative point in corridor', distanceKm: 56.2 },
  { id: 'opole-science-technology', country: 'PL', label: 'Opole Science and Technology Park', query: 'Park Naukowo-Technologiczny w Opolu industrial companies', gisStatus: 'Borderline — exact plant required', distanceKm: 211.8 },
  { id: 'eureka', country: 'PL', label: 'Eureka Technology Park', query: 'Eureka Technology Park Wielkopolska industrial companies', gisStatus: 'Park feature in corridor', distanceKm: 138.3 },
  { id: 'kalisz-technological', country: 'PL', label: 'Kalisz Technological Incubator', query: 'Kaliski Inkubator Przedsiębiorczości industrial companies', gisStatus: 'Borderline — exact plant required', distanceKm: 217 },
  { id: 'luvena', country: 'PL', label: 'LUVENA Industrial Park', query: 'Park Przemysłowy LUVENA Luboń', gisStatus: 'Industrial feature in corridor', distanceKm: 149 },
  { id: 'poznan-science-technology', country: 'PL', label: 'Poznań Science and Technology Park', query: 'Poznański Park Naukowo-Technologiczny industrial companies', gisStatus: 'Park feature in corridor', distanceKm: 154.3 },
  { id: 'poznan-technology-industry', country: 'PL', label: 'Poznań Technology and Industry Park', query: 'Poznański Park Technologiczno-Przemysłowy industrial companies', gisStatus: 'Park feature in corridor', distanceKm: 149.7 },
  { id: 'younick', country: 'PL', label: 'YouNick Technology Park', query: 'YouNick Technology Park Poznań industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 161.4 },
  { id: 'bialogard-investment', country: 'PL', label: 'Białogard Investment Park INVEST-PARK', query: 'Białogardzki Park Inwestycyjny INVEST-PARK companies', gisStatus: 'Representative point in corridor', distanceKm: 116.8 },
  { id: 'goleniow', country: 'PL', label: 'Goleniów Industrial Park', query: 'Goleniowski Park Przemysłowy industrial companies', gisStatus: 'Park boundary in corridor', distanceKm: 28.9 },
  { id: 'koszalin-technology', country: 'PL', label: 'Technology Park in Koszalin', query: 'Park Technologiczny w Koszalinie industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 136.4 },
  { id: 'stargard-high-technologies', country: 'PL', label: 'High Technologies Industrial Park in Stargard', query: 'Park Przemysłowy Nowoczesnych Technologii Stargard companies', gisStatus: 'Representative point in corridor', distanceKm: 39.8 },
  { id: 'gryfino-regional', country: 'PL', label: 'Regional Park in Gryfino', query: 'Park Regionalny w Gryfinie industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 3 },
  { id: 'stargard-industrial', country: 'PL', label: 'Stargard Industrial Park', query: 'Stargardzki Park Przemysłowy industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 39.1 },
  { id: 'technopark-pomerania', country: 'PL', label: 'Technopark Pomerania', query: 'Technopark Pomerania Szczecin industrial companies', gisStatus: 'Representative point in corridor', distanceKm: 14.3 },
  { id: 'legnica-sez', country: 'PL', label: 'Legnica Special Economic Zone', query: 'Legnica Special Economic Zone industrial plants', gisStatus: 'Zone-wide — exact plant required', distanceKm: 79.4 },
  { id: 'walbrzych-sez', country: 'PL', label: 'Wałbrzych Special Economic Zone', query: 'Wałbrzych Special Economic Zone industrial plants', gisStatus: 'Zone-wide — exact plant required', distanceKm: 97.3 },
];

// Park-level leads are discovery aids only. They are deliberately not candidate
// records: exact plant, current fuel, hydrogen fit and credible source evidence
// still have to be verified in the Search Workspace before promotion.
const ZONE_RESEARCH_LEADS = {
  'bitterfeld-wolfen': [
    ['Bayer Bitterfeld GmbH', 'Specialty and pharmaceutical chemicals', 'Industrial consumer lead; verify process heat and current fuel'],
    ['Dow Olefinverbund GmbH', 'Chemical production and integrated utilities', 'Strong process-industry lead; verify external hydrogen-fuel demand separately from feedstock'],
    ['Nobian Industrial Chemicals GmbH', 'Chlor-alkali electrolysis and hydrogen production', 'Hydrogen producer/supplier; exclude as an offtaker'],
    ['Guardian Flachglas GmbH', 'Flat-glass production', 'Strong furnace-process lead; verify fuel and site demand'],
    ['Heraeus Quarzglas Bitterfeld GmbH', 'Quartz-glass production', 'Possible high-temperature process lead; verify furnace fuel'],
    ['AMG Lithium GmbH', 'Lithium hydroxide refining', 'New industrial process lead; operating hydrogen demand not confirmed'],
  ],
  leuna: [
    ['TotalEnergies Raffinerie Mitteldeutschland', 'Oil refining and petrochemicals', 'Strong industrial lead; distinguish refinery hydrogen feedstock from replacement fuel'],
    ['BASF Leuna GmbH', 'Chemical and polymer production', 'Strong process-heat/steam lead; verify plant-level fuel evidence'],
    ['Dow Olefinverbund GmbH', 'Chemical production', 'Strong process-industry lead; verify hydrogen fuel-switch evidence'],
    ['DOMO Chemicals GmbH', 'Polyamide and engineering plastics', 'Possible process-heat lead; verify boilers and current fuel'],
    ['Eastman / Innospec / Leuna-Harze', 'Chemical intermediates and resins', 'Park-level lead group; separate exact plants before qualification'],
  ],
  'valuepark-schkopau-boehlen': [
    ['Dow Olefinverbund GmbH', 'Integrated chemical production and utilities', 'Strong process-industry lead; verify hydrogen fuel demand separately from feedstock'],
    ['Braskem Europe GmbH', 'Polypropylene production', 'Possible process-heat lead; verify site fuel and equipment'],
    ['Synthos Schkopau GmbH', 'Synthetic rubber production', 'Possible process-heat lead; verify steam and fuel evidence'],
    ['Trinseo Deutschland GmbH', 'Polystyrene production', 'Possible process-heat lead; verify exact plant demand'],
    ['W. u. H. Fernholz GmbH & Co. KG', 'Food-packaging production', 'Possible industrial heat user; verify process and fuel'],
  ],
  premnitz: [
    ['Märkische Faser GmbH', 'Synthetic fibre production', 'Process-industry lead; verify current operations, steam and fuel'],
    ['Industriepark Premnitz production tenants', 'Chemical and fibre manufacturing', 'Exact plant required; do not qualify the park as one buyer'],
  ],
  piesteritz: [
    ['SKW Stickstoffwerke Piesteritz GmbH', 'Ammonia, fertiliser and chemical production', 'Strong industrial lead; hydrogen may be feedstock or fuel, verify purpose'],
    ['PCI Augsburg GmbH / Piesteritz', 'Construction chemicals and dry-mix products', 'Possible process-heat lead; verify burners and current fuel'],
    ['AGROFERT / fertiliser-site utilities', 'Fertiliser and chemical production', 'Park-level lead; exact operator and demand evidence required'],
  ],
  eberswalde: [
    ['Barnimer Busgesellschaft / municipal facilities', 'Transport and public services', 'Non-target transport lead; exclude unless a separate industrial plant is identified'],
    ['Eberswalde industrial-park production tenants', 'Mixed manufacturing', 'Exact plant required; current process-heat evidence not yet captured'],
  ],
  'solvay-bernburg': [
    ['Solvay / Syensqo Bernburg', 'Soda ash and chemical production', 'Strong process-heat lead; verify current operator and fuel'],
    ['Ciech Soda Deutschland GmbH', 'Soda ash production', 'Strong industrial lead; verify site-specific fuel-switch evidence'],
    ['Schwenk Zement / regional mineral processing', 'Mineral and building materials', 'Possible high-temperature lead; exact plant required'],
  ],
  zeitz: [
    ['CropEnergies Bioethanol GmbH', 'Bioethanol and process steam', 'Strong process-heat lead; verify hydrogen compatibility and fuel use'],
    ['Puralube / mineral-oil recycling operations', 'Used-oil recycling and refining', 'Possible process-heat lead; verify current site and fuel'],
    ['Chemical and Industrial Park Zeitz production tenants', 'Chemicals and bio-based industry', 'Exact plant required'],
  ],
  'altmark-arneburg': [
    ['Zellstoff Stendal GmbH', 'Pulp production and recovery boiler system', 'Strong paper-process lead; verify boiler fuel, steam balance and hydrogen fit'],
    ['Mercer Stendal GmbH', 'Pulp and bioproducts', 'Strong industrial heat lead; verify current fuel and hydrogen-ready equipment'],
    ['Biomass and energy utilities at Arneburg', 'Energy and process utilities', 'Self-supply/enabler lead; exact operator and external demand required'],
  ],
  koethen: [
    ['Köthen industrial-park production tenants', 'Mixed manufacturing and materials', 'Exact plant required; park-level source does not prove hydrogen demand'],
  ],
  'technologiepark-mitteldeutschland': [
    ['TechnologiePark Mitteldeutschland production tenants', 'Mixed technology and manufacturing', 'Exact plant required; no park-wide offtake claim'],
  ],
  'high-tech-park-magdeburg': [
    ['Intel / semiconductor project area', 'Semiconductor manufacturing project', 'Future industrial user; project status and hydrogen demand require verification'],
    ['High-Tech Park Magdeburg production tenants', 'Technology and manufacturing', 'Exact plant required'],
  ],
  'sket-magdeburg': [
    ['SKET GmbH', 'Heavy machinery and industrial equipment', 'Possible metal-processing lead; verify furnaces, reheating and current fuel'],
    ['FAM Magdeburg / mining and bulk-material equipment', 'Industrial machinery manufacturing', 'Possible metal-process lead; exact site evidence required'],
  ],
  'gid-ost-delitzsch': [
    ['GID Ost production tenants', 'Mixed industrial manufacturing', 'Exact plant required; park-level listing is not demand evidence'],
  ],
  'kostrzyn-slubice': [
    ['Arctic Paper Kostrzyn S.A.', 'Paper production', 'Strong paper-process lead; verify gas/biomass/steam and hydrogen fit'],
    ['ICT Poland Sp. z o.o.', 'Tissue and hygiene products', 'Possible process-heat lead; verify boiler and dryer fuel'],
    ['Barlinek Inwestycje / wood products', 'Wood flooring and engineered wood', 'Possible dryer/process-heat lead; verify exact site and fuel'],
  ],
  'kedzierzyn-kozle': [
    ['Grupa Azoty S.A. / Zaklady Azotowe Kedzierzyn', 'Ammonia, fertilisers and chemicals', 'Strong industrial lead; hydrogen may be feedstock or fuel, verify purpose'],
    ['Brenntag Polska / chemical distribution', 'Chemical distribution', 'Supplier/logistics; exclude unless an independent consuming plant is identified'],
    ['Blachownia Holding / chemical production area', 'Petrochemical and chemical processing', 'Possible process-heat lead; exact operator and current fuel required'],
  ],
  'brzeg-dolny': [
    ['PCC Rokita S.A.', 'Chlor-alkali, polyols and specialty chemicals', 'Strong process-industry lead; distinguish hydrogen feedstock from fuel'],
    ['PCC Exol S.A.', 'Surfactants and specialty chemicals', 'Possible process-heat lead; verify boilers and current fuel'],
    ['PCC MCAA Sp. z o.o.', 'Chloroacetic acid and chemical intermediates', 'Possible process-heat lead; exact evidence required'],
  ],
  'tp-park-dolnoslaskie': [
    ['T-Park production tenants', 'Mixed technology and manufacturing', 'Exact plant required; no park-wide offtake claim'],
  ],
  'nowa-ruda': [
    ['ZPAS S.A. / Nowa Ruda operations', 'Electrical cabinets and industrial equipment', 'Possible metal/process-heat lead; verify furnaces and fuel'],
    ['Nowa Ruda industrial-park tenants', 'Mixed manufacturing', 'Exact plant required'],
  ],
  'wroclaw-industrial': [
    ['3M Wroclaw manufacturing site', 'Industrial and chemical products', 'Possible process-heat lead; verify plant fuel and equipment'],
    ['Volvo Buses Wroclaw', 'Vehicle manufacturing', 'Possible metal/process-heat user; verify furnace and plant fuel'],
  ],
  'wroclaw-technology': [
    ['Wroclaw Technology Park production tenants', 'Technology, laboratory and light manufacturing', 'Exact plant required; most tenants are not target-scale heat users'],
  ],
  'lubuski-industrial-technology': [
    ['Stelmet S.A. / Zielona Gora-area operations', 'Wood products and drying', 'Possible process-heat lead; verify exact site and fuel'],
    ['Novita S.A. / textile production', 'Nonwoven and textile products', 'Possible process-heat lead; verify current plant fuel'],
  ],
  'opole-science-technology': [
    ['Opole industrial and technology-park tenants', 'Mixed manufacturing and technology', 'Exact plant required; park-level source does not prove demand'],
  ],
  eureka: [
    ['Eureka Technology Park production tenants', 'Mixed technology and manufacturing', 'Exact plant required'],
  ],
  'kalisz-technological': [
    ['Pratt & Whitney Kalisz', 'Aerospace components and metal processing', 'Possible furnace/process-heat lead; verify exact plant fuel'],
    ['Kalisz food and manufacturing tenants', 'Food and industrial manufacturing', 'Exact plant required'],
  ],
  luvena: [
    ['LUVENA S.A.', 'Fertilisers and specialty chemicals', 'Strong process-industry lead; verify current fuel and hydrogen fit'],
  ],
  'poznan-science-technology': [
    ['Poznan Science and Technology Park production tenants', 'Technology, laboratories and light manufacturing', 'Exact plant required; likely below target scale unless a specific plant is identified'],
  ],
  'poznan-technology-industry': [
    ['Volkswagen Poznan / Wrzesnia-area manufacturing', 'Vehicle and metal manufacturing', 'Possible industrial heat lead; exact plant and fuel evidence required'],
    ['Poznan Technology and Industry Park tenants', 'Mixed manufacturing', 'Exact plant required'],
  ],
  younick: [
    ['YouNick Technology Park tenants', 'Technology and light manufacturing', 'Exact plant required; no park-wide offtake claim'],
  ],
  'bialogard-investment': [
    ['Bialogard Investment Park production tenants', 'Wood, food and manufacturing', 'Exact plant required; verify process heat and current fuel'],
  ],
  goleniow: [
    ['LM Wind Power Goleniów', 'Wind-turbine blade manufacturing', 'Possible industrial heat user; verify curing ovens and current fuel'],
    ['Bosch Goleniów / manufacturing operations', 'Industrial manufacturing', 'Possible process-heat lead; exact site evidence required'],
  ],
  'koszalin-technology': [
    ['Koszalin technology-park production tenants', 'Mixed manufacturing and technology', 'Exact plant required'],
  ],
  'stargard-high-technologies': [
    ['Bridgestone Stargard', 'Tyre manufacturing and process heat', 'Strong industrial energy-user lead; verify gas use and hydrogen-ready equipment'],
    ['Cargill / food and grain-processing operations', 'Food and agricultural processing', 'Possible boiler/process-heat lead; exact site required'],
  ],
  'gryfino-regional': [
    ['PGE Elektrownia Dolna Odra', 'Coal-fired power generation and district heat', 'Energy producer/self-supply; do not count as external offtaker without separate demand evidence'],
  ],
  'stargard-industrial': [
    ['Bridgestone Stargard', 'Tyre manufacturing and process heat', 'Strong industrial energy-user lead; verify current fuel'],
    ['Cargill / food processing', 'Food and agricultural processing', 'Possible boiler/process-heat lead; exact plant required'],
  ],
  'technopark-pomerania': [
    ['Technopark Pomerania tenants', 'Technology and services', 'Mostly non-target technology companies; exact industrial plant required'],
  ],
  'legnica-sez': [
    ['Volkswagen Motor Polska / Polkowice', 'Automotive engine and metal manufacturing', 'Possible metal-process lead; exact plant fuel evidence required'],
    ['KGHM Polska Miedz / Legnica-area metallurgy', 'Copper smelting and non-ferrous metals', 'Strong high-temperature industrial lead; verify exact site and hydrogen fit'],
    ['Sandvik / Legnica-area manufacturing', 'Metal tools and industrial products', 'Possible metal-process lead; exact site required'],
  ],
  'walbrzych-sez': [
    ['Toyota Motor Manufacturing Poland / Walbrzych', 'Automotive engines and transmissions', 'Possible metal/process-heat lead; verify furnaces and current fuel'],
    ['Faurecia / automotive components', 'Metal and automotive-component manufacturing', 'Possible process-heat lead; exact site required'],
    ['NSK Steering Systems Poland', 'Precision metal and automotive components', 'Possible process-heat lead; verify furnace use'],
  ],
};

const COMPANY_LINKS = {
  "PCK Raffinerie GmbH": {
    "websiteUrl": "https://www.pck.de/en/company",
    "linkedinUrl": "https://www.linkedin.com/company/pck-raffinerie",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "VERBIO Schwedt GmbH": {
    "websiteUrl": "https://www.verbio.de/en/contact/",
    "linkedinUrl": "https://de.linkedin.com/company/verbio-se",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "LEIPA Georg Leinfelder GmbH — Mill Schwedt": {
    "websiteUrl": "https://www.leipa.com/en/production-sites",
    "linkedinUrl": "https://www.linkedin.com/company/leipa-georg-leinfelder-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "BUTTING Anlagenbau GmbH & Co. KG": {
    "websiteUrl": "https://www.butting.com/",
    "linkedinUrl": "https://www.linkedin.com/company/butting-group",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "HPS Holzkontor- und Pelletierwerk Schwedt": {
    "websiteUrl": "https://www.wer-zu-wem.de/firma/hps-pellets.html",
    "linkedinUrl": "https://de.linkedin.com/company/hps-holzkontor-und-pelletierwerk-schwedt-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Mineralölverbundleitung GmbH Schwedt": {
    "websiteUrl": "https://www.mvl-schwedt.de/startseite",
    "linkedinUrl": "https://de.linkedin.com/company/mineral%C3%B6lverbundleitung-gmbh-schwedt",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "IP Industriepark Schwedt GmbH & Co. KG": {
    "websiteUrl": "https://www.gtai.de/en/invest/industries/industrial-production/chemicals-materials/chemical-parks-in-germany/industrial-park-schwedt-48518",
    "linkedinUrl": "https://www.linkedin.com/company/industriepark-h%C3%B6chst",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Indorama Ventures Fibers Germany / Trevira": {
    "websiteUrl": "https://www.trevira.de",
    "linkedinUrl": "https://de.linkedin.com/company/trevira-cs",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Grupa Azoty ATT Polymers GmbH": {
    "websiteUrl": "https://leadiq.com/c/grupa-azoty-att-polymers-gmbh/5a1d7e1e240000240057f142",
    "linkedinUrl": "https://www.linkedin.com/company/grupa-azoty-att-polymers-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Megaflex Schaumstoff GmbH": {
    "websiteUrl": "https://www.megaflex-schaumstoffe.de/en/",
    "linkedinUrl": "https://de.linkedin.com/company/megaflex-schaumstoff-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Jack Link’s / Bifi Guben": {
    "websiteUrl": "https://leadiq.com/c/jack-links-protein-snacks/5a1d96652300005c008509e4",
    "linkedinUrl": "https://www.linkedin.com/company/jack-link's-protein-snacks",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Bäcker Dreißig": {
    "websiteUrl": "https://baeckerei-dreissig.de/unternehmen/",
    "linkedinUrl": "https://pl.linkedin.com/company/b%C3%A4ckerei-drei%C3%9Fig?trk=ppro_cprof",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Rock Tech Lithium": {
    "websiteUrl": "https://lithium.org/en/members/rocktech/",
    "linkedinUrl": "https://de.linkedin.com/company/rocktechlithium",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Unylon Polymers": {
    "websiteUrl": "https://www.unilonpolymer.com/",
    "linkedinUrl": "https://www.linkedin.com/company/united-polymers-inc",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Performance Fibers": {
    "websiteUrl": "https://leadiq.com/c/performance-fibers/5a1d92185400005b00770456",
    "linkedinUrl": "https://www.linkedin.com/company/performance-fibers",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "LAUFARON": {
    "websiteUrl": "",
    "linkedinUrl": "https://www.linkedin.com/company/laufen-nordic",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Riederer": {
    "websiteUrl": "",
    "linkedinUrl": "https://de.linkedin.com/company/riederer-versicherungsmakler-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Bayer Bitterfeld GmbH": {
    "websiteUrl": "https://www.bayer.com/de/de/bitterfeld-startseite",
    "linkedinUrl": "https://www.linkedin.com/company/bayer",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Dow Olefinverbund GmbH": {
    "websiteUrl": "https://de.dow.com/de-de/standorte/mitteldeutschland.html",
    "linkedinUrl": "https://de.linkedin.com/company/dow-olefinverbund-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Nobian Industrial Chemicals GmbH": {
    "websiteUrl": "https://www.nobian.com/",
    "linkedinUrl": "https://www.linkedin.com/company/nobian/",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Guardian Flachglas GmbH": {
    "websiteUrl": "https://www.guardianglass.com/eu/en",
    "linkedinUrl": "https://de.linkedin.com/company/guardian-flachglas-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Heraeus Quarzglas Bitterfeld GmbH": {
    "websiteUrl": "https://www.kompetenznetz-mittelstand.de/de/app/account/map/heraeus-quarzglas-bitterfeld-gmbh-co-kg/",
    "linkedinUrl": "https://de.linkedin.com/company/heraeus-covantics",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "AMG Lithium GmbH": {
    "websiteUrl": "https://amglithium.com/home",
    "linkedinUrl": "https://www.linkedin.com/company/amg-lithium/",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "TotalEnergies Raffinerie Mitteldeutschland": {
    "websiteUrl": "https://totalenergies.com/germany",
    "linkedinUrl": "https://fr.linkedin.com/company/total-raffinerie-mitteldeutschland-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "BASF Leuna GmbH": {
    "websiteUrl": "https://www.wer-zu-wem.de/firma/basf-leuna.html",
    "linkedinUrl": "https://www.linkedin.com/company/basf",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "DOMO Chemicals GmbH": {
    "websiteUrl": "https://www.domochemicals.com/en",
    "linkedinUrl": "https://www.linkedin.com/company/domo",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Eastman / Innospec / Leuna-Harze": {
    "websiteUrl": "https://chemicalparks.eu/parks/leuna-chemical-complex",
    "linkedinUrl": "https://de.linkedin.com/company/innospec-leuna-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Braskem Europe GmbH": {
    "websiteUrl": "https://www.braskem.com.br/europe",
    "linkedinUrl": "https://www.linkedin.com/company/braskem",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Synthos Schkopau GmbH": {
    "websiteUrl": "https://www.volza.com/company-profile/synthos-schkopau-gmbh-50775814/contacts/",
    "linkedinUrl": "https://www.linkedin.com/company/synthos-s.a.",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Trinseo Deutschland GmbH": {
    "websiteUrl": "https://www.trinseo.com/",
    "linkedinUrl": "https://www.linkedin.com/company/trinseo",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "W. u. H. Fernholz GmbH & Co. KG": {
    "websiteUrl": "https://www.dnb.com/business-directory/company-profiles.w_u_h_fernholz_(gmbh__co_kg).dbfa2e26686dfbe4196c073509792845.html",
    "linkedinUrl": "https://www.linkedin.com/company/w-u-h-fernholz-gmbh-&-co-kg",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Märkische Faser GmbH": {
    "websiteUrl": "https://www.maerkische-faser.com/en/home/",
    "linkedinUrl": "https://de.linkedin.com/company/m%C3%A4rkische-faser-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Industriepark Premnitz production tenants": {
    "websiteUrl": "http://www.ipp-premnitz.de/der-industriepark/firmen-am-standort.html",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "SKW Stickstoffwerke Piesteritz GmbH": {
    "websiteUrl": "https://www.skwp.de/en/",
    "linkedinUrl": "https://de.linkedin.com/company/skw-stickstoffwerke-piesteritz-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "PCI Augsburg GmbH / Piesteritz": {
    "websiteUrl": "https://www.pci-augsburg.eu/en",
    "linkedinUrl": "https://de.linkedin.com/company/pci-augsburg-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "AGROFERT / fertiliser-site utilities": {
    "websiteUrl": "https://www.agrofert.cz/sites/default/files/prilohy/agrofert-annual_report_2023_consolidated.pdf",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "LEAG Kraftwerk Schwarze Pumpe": {
    "websiteUrl": "https://www.gem.wiki/Schwarze_Pumpe_power_station",
    "linkedinUrl": "https://de.linkedin.com/company/leag",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "LEAG Brikettfabrik / lignite processing": {
    "websiteUrl": "https://www.leag.de/en/",
    "linkedinUrl": "https://www.linkedin.com/company/leag/",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Hamburger Rieger GmbH / Hamburger Containerboard": {
    "websiteUrl": "https://www.hamburger-containerboard.com/",
    "linkedinUrl": "https://www.linkedin.com/company/hamburger-containerboard",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Dunapack Spremberg GmbH & Co. KG": {
    "websiteUrl": "https://wellpappen-industrie.de/mitglied/dunapack-spremberg-gmbh-co-kg/",
    "linkedinUrl": "https://de.linkedin.com/company/dunapackpackaging",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Knauf Deutsche Gipswerke KG": {
    "websiteUrl": "https://knauf.com/en",
    "linkedinUrl": "https://de.linkedin.com/company/knauf-gips-kg",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Altech Industries Germany GmbH / Dock3 Lausitz": {
    "websiteUrl": "https://www.lausitz-jobs.de/altech-industries-germany-gmbh-299.html",
    "linkedinUrl": "https://de.linkedin.com/company/altech-advanced-materials-ag",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Silicon Pilot Production": {
    "websiteUrl": "https://www.silabs.com/",
    "linkedinUrl": "https://www.linkedin.com/company/siliconinc",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Deutsche Biomethanolfabrik / Blue Planet Bio-Energy": {
    "websiteUrl": "https://www.unternehmen24.info/Firmeninformationen/Deutschland/Firma/3630331",
    "linkedinUrl": "https://de.linkedin.com/company/blueplanetenergy",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "GP Papenburg Betonwerke / Heidelberger Beton": {
    "websiteUrl": "https://gp.ag/leistung/technologie-und-produkte/betonwerke",
    "linkedinUrl": "https://de.linkedin.com/company/gp-papenburg-betonwerke-nord-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "AGAT Tank": {
    "websiteUrl": "https://finder.startupnationcentral.org/company_page/agat-software",
    "linkedinUrl": "https://www.linkedin.com/company/agat-laboratories",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "ASG Spremberg GmbH": {
    "websiteUrl": "https://www.asg-spremberg.de/",
    "linkedinUrl": "https://de.linkedin.com/company/asg-spremberg",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Linde Gas Produktionsgesellschaft": {
    "websiteUrl": "https://www.linde.com/",
    "linkedinUrl": "https://www.linkedin.com/company/linde",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Sulzer Pumpen, XERVON, Buchen, Remondis and Lobbe": {
    "websiteUrl": "https://www.xervon.de/en/about-xervon/",
    "linkedinUrl": "https://www.linkedin.com/company/xervongmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "TSS Transport- und Speditionsgesellschaft": {
    "websiteUrl": "https://www.tss-logistik.com/en/",
    "linkedinUrl": "https://de.linkedin.com/company/tss-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Barnimer Busgesellschaft / municipal facilities": {
    "websiteUrl": "https://www.barnim.de/auto-verkehr/oeffentliche-verkehrsmittel/bus-s-bahn-/-oeffi/barnimer-busgesellschaft",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Eberswalde industrial-park production tenants": {
    "websiteUrl": "https://www.rofinpark.de/en",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Solvay / Syensqo Bernburg": {
    "websiteUrl": "https://leadiq.com/c/cytec-solvay-group/5a1d8906240000240062914e",
    "linkedinUrl": "https://be.linkedin.com/company/solvay",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Ciech Soda Deutschland GmbH": {
    "websiteUrl": "https://www.process.vogel.de/ciech-soda-deutschland-gmbh-co-kg-c-73580/",
    "linkedinUrl": "https://de.linkedin.com/company/ciech-deutschland",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Schwenk Zement / regional mineral processing": {
    "websiteUrl": "https://www.schwenk.de/en/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "CropEnergies Bioethanol GmbH": {
    "websiteUrl": "https://www.cropenergies.com/en/",
    "linkedinUrl": "https://de.linkedin.com/company/cropenergies-bioethanol-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Puralube / mineral-oil recycling operations": {
    "websiteUrl": "https://www.puraglobe.com/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Chemical and Industrial Park Zeitz production tenants": {
    "websiteUrl": "https://www.industriepark-zeitz.de/en/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Zellstoff Stendal GmbH": {
    "websiteUrl": "https://rocketreach.co/zellstoff-stendal-gmbh-profile_b5fb1e63f936a459",
    "linkedinUrl": "https://de.linkedin.com/company/zellstoff-stendal-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Mercer Stendal GmbH": {
    "websiteUrl": "https://mercerint.com/our-operations/mercer-stendal/",
    "linkedinUrl": "https://de.linkedin.com/company/mercer-stendal-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Biomass and energy utilities at Arneburg": {
    "websiteUrl": "",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Köthen industrial-park production tenants": {
    "websiteUrl": "https://www.industriepark-lausitz.com/global/en",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "TechnologiePark Mitteldeutschland production tenants": {
    "websiteUrl": "https://www.technologiepark-heidelberg.de/en/sites/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Intel / semiconductor project area": {
    "websiteUrl": "",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "High-Tech Park Magdeburg production tenants": {
    "websiteUrl": "https://www.htp-st.de/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "SKET GmbH": {
    "websiteUrl": "https://sketvmb.com/en/about-us/company-profile",
    "linkedinUrl": "https://de.linkedin.com/company/sket-verseilmaschinenbau-gmbh",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "FAM Magdeburg / mining and bulk-material equipment": {
    "websiteUrl": "https://leadiq.com/c/fam-f%C3%B6rderanlagen-und-baumaschinen-gmbh/5a1d960e2300005e0084ae7c",
    "linkedinUrl": "https://www.linkedin.com/company/fam-magdeburg/",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "GID Ost production tenants": {
    "websiteUrl": "https://leadiq.com/c/gid/5a1ddd242300005300ebaf84",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Arctic Paper Kostrzyn S.A.": {
    "websiteUrl": "https://www.arcticpaper.com/",
    "linkedinUrl": "https://pl.linkedin.com/company/arctic-paper-kostrzyn-s-a",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "ICT Poland Sp. z o.o.": {
    "websiteUrl": "https://www.ictgroup.net/pl",
    "linkedinUrl": "https://pl.linkedin.com/company/industrie-cartarie-tronchetti",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Barlinek Inwestycje / wood products": {
    "websiteUrl": "https://www.barlinek.com/",
    "linkedinUrl": "https://www.linkedin.com/company/barlinek-sa",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Grupa Azoty S.A. / Zaklady Azotowe Kedzierzyn": {
    "websiteUrl": "https://grupaazoty.com/en/about-the-company",
    "linkedinUrl": "https://pl.linkedin.com/company/grupa-azoty-kedzierzyn",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Brenntag Polska / chemical distribution": {
    "websiteUrl": "https://www.brenntag.com/en-pl/",
    "linkedinUrl": "https://be.linkedin.com/company/brenntag",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Blachownia Holding / chemical production area": {
    "websiteUrl": "https://www.dnb.com/business-directory/company-profiles.petrochemia_blachownia_sp_z_o_o.798da3e84a81400f45f730b0118315f1.html",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "PCC Rokita S.A.": {
    "websiteUrl": "https://en.pcc.rokita.pl/about-company/",
    "linkedinUrl": "https://www.linkedin.com/company/pcc-group",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "PCC Exol S.A.": {
    "websiteUrl": "https://www.zoominfo.com/c/pcc-exol-sa/469324812",
    "linkedinUrl": "https://www.linkedin.com/company/pcc-exol-s-a?trk=ppro_cprof",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "PCC MCAA Sp. z o.o.": {
    "websiteUrl": "https://www.pcc-mcaa.eu/en/",
    "linkedinUrl": "https://pl.linkedin.com/company/pcc-mcaa-sp.-z-o.o.",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "T-Park production tenants": {
    "websiteUrl": "",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "ZPAS S.A. / Nowa Ruda operations": {
    "websiteUrl": "https://zpasgroup.co.uk/content/11-about-zpas",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Nowa Ruda industrial-park tenants": {
    "websiteUrl": "https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/nowa-ruda/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "3M Wroclaw manufacturing site": {
    "websiteUrl": "https://www.businessofgcc.com/gcc-data/companies/3m-company-poland",
    "linkedinUrl": "https://www.linkedin.com/company/3m",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Volvo Buses Wroclaw": {
    "websiteUrl": "https://www.volvogroup.com/en/about-us/organization/our-global-presence/volvo-group-poland.html",
    "linkedinUrl": "https://www.linkedin.com/company/volvo-bus-corporation",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Wroclaw Technology Park production tenants": {
    "websiteUrl": "https://www.iasp.ws/our-members/directory/@6288/wroclawski-park-technologiczny",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Stelmet S.A. / Zielona Gora-area operations": {
    "websiteUrl": "https://www.dnb.com/business-directory/company-profiles.stelmet_s_a.bc493812027f3e9e82d055cc86ff6d5a.html",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Novita S.A. / textile production": {
    "websiteUrl": "https://novita.com/en/pages/tietoa-novitasta",
    "linkedinUrl": "https://www.linkedin.com/company/novita-sa",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Opole industrial and technology-park tenants": {
    "websiteUrl": "https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/opole-stp/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Eureka Technology Park production tenants": {
    "websiteUrl": "",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Pratt & Whitney Kalisz": {
    "websiteUrl": "https://www.pwk.com.pl/en/about-the-company/",
    "linkedinUrl": "https://www.linkedin.com/company/pwkalisz",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Kalisz food and manufacturing tenants": {
    "websiteUrl": "https://www.zoominfo.com/c/kalys/348769241",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "LUVENA S.A.": {
    "websiteUrl": "https://luvena.pl/en/abous-us/",
    "linkedinUrl": "https://www.linkedin.com/company/luvena-s-a-",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Poznan Science and Technology Park production tenants": {
    "websiteUrl": "https://ppnt.poznan.pl/about-us/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Volkswagen Poznan / Wrzesnia-area manufacturing": {
    "websiteUrl": "https://www.zoominfo.com/c/volkswagen-poznan-sp-zoo/1137989631",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Poznan Technology and Industry Park tenants": {
    "websiteUrl": "https://www.iasp.ws/our-members/directory/@5952/poznan-science-and-technology-park",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "YouNick Technology Park tenants": {
    "websiteUrl": "https://www.dnb.com/business-directory/company-profiles.younick_technology_park_sp_z_o_o.1883291030594b88639edd1aa5161d77.html",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Bialogard Investment Park production tenants": {
    "websiteUrl": "https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/bialogard/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "LM Wind Power Goleniów": {
    "websiteUrl": "https://goleniow.business/firmy/lm-wind-power-blades/",
    "linkedinUrl": "https://www.linkedin.com/company/lm-wind-power",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Bosch Goleniów / manufacturing operations": {
    "websiteUrl": "https://www.bosch.com/websites-worldwide/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Koszalin technology-park production tenants": {
    "websiteUrl": "https://www.paih.gov.pl/en/why_poland/investment_incentives/industrial_and_technology_parks/koszalin/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Bridgestone Stargard": {
    "websiteUrl": "https://www.zoominfo.com/c/bridgestone-stargard/537387864",
    "linkedinUrl": "https://nl.linkedin.com/company/bridgestone-stargard-sp-z-o-o-",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Cargill / food and grain-processing operations": {
    "websiteUrl": "https://www.cargill.com/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "PGE Elektrownia Dolna Odra": {
    "websiteUrl": "https://eldolnaodra.pgegiek.pl/o-oddziale",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Cargill / food processing": {
    "websiteUrl": "https://www.cargill.com/",
    "linkedinUrl": "https://www.linkedin.com/company/cargill",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Technopark Pomerania tenants": {
    "websiteUrl": "https://app.dealroom.co/companies/technopark_pomerania",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Volkswagen Motor Polska / Polkowice": {
    "websiteUrl": "https://vwmp.com.pl/",
    "linkedinUrl": "https://pl.linkedin.com/company/volkswagen-motor-polska",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "KGHM Polska Miedz / Legnica-area metallurgy": {
    "websiteUrl": "https://kghm.com/en/our-business/smelting-and-refining/legnica",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Sandvik / Legnica-area manufacturing": {
    "websiteUrl": "https://www.home.sandvik/en/",
    "linkedinUrl": "",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Toyota Motor Manufacturing Poland / Walbrzych": {
    "websiteUrl": "https://www.toyotapl.com/",
    "linkedinUrl": "https://pl.linkedin.com/company/toyota-motor-manufacturing-poland",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "Faurecia / automotive components": {
    "websiteUrl": "https://leadiq.com/c/faurecia/5a1d7d05240000240056bc5d",
    "linkedinUrl": "https://www.linkedin.com/company/faurecia",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  },
  "NSK Steering Systems Poland": {
    "websiteUrl": "https://www.dnb.com/business-directory/company-profiles.nsk_steering_systems_europe_(polska)_sp_z_o_o.9a613d1805fa9a04e17dadb9a19043a7.html",
    "linkedinUrl": "https://pl.linkedin.com/company/nsk-steering-systems-europe-polska-sp-z-o-o-walbrzych",
    "linkEvidenceStatus": "Brave public result; verify exact legal entity and site"
  }
};
for (const zone of INDUSTRIAL_ZONES) {
  if (!zone.occupants && Object.prototype.hasOwnProperty.call(ZONE_RESEARCH_LEADS, zone.id)) {
    zone.occupants = ZONE_RESEARCH_LEADS[zone.id].map(([company, industry, status]) => ({ company, industry, status }));
  }
  for (const occupant of zone.occupants || []) {
    const links = COMPANY_LINKS[occupant.company];
    if (links) Object.assign(occupant, links, { linkResearchProvider: 'Brave Search API', linkResearchDate: '2026-10-13' });
  }
}

export function buildIndustrialZoneQueryTerm(zoneId) {
  return INDUSTRIAL_ZONES.find((zone) => zone.id === zoneId)?.query || '';
}

export function zonesForCountry(country) {
  return INDUSTRIAL_ZONES.filter((zone) => zone.country === country);
}

export function zoneOptionLabel(zone) {
  return `${zone.label} — ${zone.gisStatus || 'GIS validation pending'}`;
}

export function zoneById(zoneId) {
  return INDUSTRIAL_ZONES.find((zone) => zone.id === zoneId) || null;
}
