const contactKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Evidence-backed public routes only. Personal addresses are never guessed.
export const hydrogenContactResearch = {
  [contactKey('Arctic Paper Kostrzyn S.A.')]: [
    { id: 'apk-michal-jarczynski', name: 'Michał Jarczyński', designation: 'Mill Managing Director', role: 'Site leadership; strategic partnership and industrial-energy routing', emails: ['michal.jarczynski@arcticpaper.com'], sourceUrl: 'https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/' },
    { id: 'apk-zbigniew-wesolowski', name: 'Zbigniew Wesołowski', designation: 'Plant Manager', role: 'Plant operations and process-heat routing', emails: ['zbigniew.wesolowski@arcticpaper.com'], sourceUrl: 'https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/' },
    { id: 'apk-slawomir-gralak', name: 'Sławomir Gralak', designation: 'Management Systems Representative', role: 'Management systems, environmental and site-process routing', emails: ['slawomir.gralak@arcticpaper.com'], phones: ['+48 95 7210 664'], sourceUrl: 'https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/' },
    { id: 'apk-konrad-bobrowski', name: 'Konrad Bobrowski', designation: 'Environmental Manager', role: 'Environmental, energy and decarbonisation routing', emails: ['konrad.bobrowski@arcticpaper.com'], phones: ['+48 95 7210 663'], sourceUrl: 'https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/' },
    { id: 'apk-office', name: 'Arctic Paper Kostrzyn — company route', designation: 'Official mill route', role: 'Public company route; named-person association not independently confirmed', emails: ['info-kostrzyn@arcticpaper.com'], phones: ['+48 95 7210 550', '+48 95 7210 600'], sourceUrl: 'https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/' },
  ],
  [contactKey('ICT Poland Sp. z o.o.')]: [
    { id: 'ict-office', name: 'ICT Poland — company route', designation: 'Official Kostrzyn site route', role: 'Plant routing; named energy/procurement contact not independently confirmed', emails: ['recepcja@ictpl.eu'], phones: ['+48 95 733 6800'], sourceUrl: 'https://www.ictgroup.net/pl/kim-jestesmy/grupa/ict-poland-sp-zoo/kontakt' },
  ],
  [contactKey('Barlinek Inwestycje / wood products')]: [
    { id: 'barlinek-office', name: 'Barlinek Inwestycje — company route', designation: 'Official plant route', role: 'Plant routing; named energy/procurement contact not independently confirmed', phones: ['+48 95 747 13 00'], sourceUrl: 'https://www.barlinek.com.pl/Kontakt/' },
    { id: 'barlinek-corporate-office', name: 'Barlinek S.A. — corporate route', designation: 'Official corporate route', role: 'Company route; not a named plant decision-maker', emails: ['info@barlinek.com.pl'], phones: ['+48 41 333 11 11'], sourceUrl: 'https://www.barlinek.com.pl/Kontakt/' },
  ],
  [contactKey('Grupa Azoty S.A. / Zaklady Azotowe Kedzierzyn')]: [
    { id: 'zak-dariusz-bednorz', name: 'Dariusz Bednorz', designation: 'Vice President of the Management Board, responsible for energy and investment', role: 'Site energy and investment decision-maker', sourceUrl: 'https://grupaazoty.com/en/news/grupa-azoty-kedzierzyn-completes-implementation-of-the-new-energy-concept' },
    { id: 'zak-jaroslaw-scislowski', name: 'Jarosław Ścisłowski', designation: 'Executive Director, Corporate Energy Department; Director, Kędzierzyn Energy Business Unit', role: 'Corporate energy and site utility decision-maker', sourceUrl: 'https://grupaazoty.com/en/life-of-our-company/an-interview-with-aroslaw-scislowski-executive-director-of-the-corporate-energy-department-at-grupa-azoty' },
    { id: 'zak-agnieszka-ksiazkiewicz', name: 'Agnieszka Książkiewicz', designation: 'Procurement contact named in a public Grupa Azoty ZAK tender notice', role: 'Tender/procurement routing; person-role association is source-backed, mailbox is Reoon catch-all', emails: ['agnieszka.ksiazkiewicz@grupaazoty.com'], sourceUrl: 'https://labportal.pl/przetargi/zakup-i-dostawa-plyta-grzewcza/' },
    { id: 'zak-office', name: 'Grupa Azoty Kędzierzyn — company route', designation: 'Official site route', role: 'Public procurement and plant routing; named-person email not independently confirmed', emails: ['zak@grupaazoty.com'], phones: ['+48 77 481 20 00'], sourceUrl: 'https://zak.grupaazoty.com/' },
  ],
  [contactKey('Brenntag Polska / chemical distribution')]: [
    { id: 'brenntag-jacek-iwanczuk', name: 'Jacek Iwańczuk', designation: 'President of the Management Board, Brenntag Polska', role: 'Local company executive; strategic routing only', sourceUrl: 'https://www.brenntag.com/pl-pl/dane-firmy.html' },
    { id: 'brenntag-marcin-dutkiewicz', name: 'Marcin Dutkiewicz', designation: 'Member of the Management Board, Brenntag Polska', role: 'Local executive; commercial routing only', sourceUrl: 'https://www.brenntag.com/pl-pl/dane-firmy.html' },
    { id: 'brenntag-office', name: 'Brenntag Polska — company route', designation: 'Official company route', role: 'Chemical distribution/site route; direct hydrogen demand not established', emails: ['biuro@brenntag.pl'], phones: ['+48 77 472 15 00'], sourceUrl: 'https://www.brenntag.com/en-pl/imprint.html' },
  ],
  [contactKey('Blachownia Holding / chemical production area')]: [
    { id: 'blachownia-office', name: 'Blachownia Holding — industrial-area route', designation: 'Industrial-park holding route', role: 'Site/tenant routing; not a single hydrogen-consuming legal entity', sourceUrl: 'https://jpmholding.com.pl/kontakt', phones: ['+48 77 483 33 00'] },
    { id: 'tameh-blachownia-route', name: 'TAMEH Polska — Blachownia Generation Plant', designation: 'Generation-plant route', role: 'Utility and heat-generation routing for adjacent industrial consumers', sourceUrl: 'https://tameh.pl/en/about-the-group/blachownia-generation-plant' },
  ],
  [contactKey('LUVENA S.A.')]: [
    { id: 'luvena-agata-markowska', name: 'Agata Markowska', designation: 'Deputy Purchasing Manager', role: 'Natural-gas and power procurement; energy purchasing routing', linkedinUrl: 'https://linkedin.com/in/agata-markowska-a72a789b', sourceUrl: 'https://linkedin.com/in/agata-markowska-a72a789b' },
    { id: 'luvena-office', name: 'LUVENA S.A. — company route', designation: 'Official company route', role: 'Company and plant routing; named-person email not independently confirmed', emails: ['luvena@luvena.pl'], phones: ['+48 509 809 109'], sourceUrl: 'https://luvena.pl/centrala/' },
  ],
  [contactKey('Bialogard Investment Park production tenants')]: [
    { id: 'bialogard-park-waldemar-gorzelak', name: 'Waldemar Gorzelak', designation: 'President of the Management Board, Invest-Park Białogard', role: 'Zone/operator routing; not an identified hydrogen-consuming tenant', emails: ['biuro@investparkbialogard.pl'], phones: ['+48 94 312 44 49', '+48 600 899 138'], sourceUrl: 'https://www.investparkbialogard.pl/' },
    { id: 'bialogard-park-office', name: 'Invest-Park Białogard — investor route', designation: 'Official investment-park route', role: 'Tenant identification and industrial-site routing; exact consuming company unresolved', emails: ['biuro@investparkbialogard.pl'], phones: ['+48 94 312 44 49'], sourceUrl: 'https://www.investparkbialogard.pl/dla-inwestora' },
  ],
  [contactKey('VERBIO Schwedt GmbH')]: [
    { id: 'verbio-schwedt-harald-senst', name: 'Harald Senst', designation: 'Managing Director, VERBIO Schwedt GmbH', role: 'Site leadership and operational routing', sourceUrl: 'https://www.verbio.de/fileadmin/user_upload/Verbio/Unternehmen/Standorte/nformation_gemaess_Paragraph_8a_12.BImSchV-Schwedt.pdf', phones: ['+49 3332 2699 100'] },
    { id: 'verbio-theodor-niesmann', name: 'Theodor Niesmann', designation: 'CTO Europe, Verbio SE', role: 'European production, engineering, procurement and HSE decision-maker', sourceUrl: 'https://www.verbio.de/en/company/management-supervisory-board/' },
    { id: 'verbio-office', name: 'VERBIO Schwedt — company route', designation: 'Official site route', role: 'Site and production routing; person-email association not independently confirmed', emails: ['info@verbio.de'], phones: ['+49 3332 2699 500'], sourceUrl: 'https://www.verbio.de/en/company/verbio-locations/production-site-schwedt/' },
  ],
  [contactKey('HPS Holzkontor- und Pelletierwerk Schwedt')]: [
    { id: 'hps-sylwia-senczyszyn', name: 'Sylwia Senczyszyn', designation: 'Managing Director, HPS Holzkontor und Pelletierwerk Schwedt GmbH', role: 'Site leadership and production/energy-efficiency routing', sourceUrl: 'https://www.leag.de/de/seitenblickblog/artikel/womenleag-sylwia-senczyszyn-pellet-generalistin/' },
    { id: 'hps-leag-route', name: 'HPS / LEAG — company route', designation: 'LEAG pellet-group route', role: 'Pellet production and site operations routing; no external hydrogen-demand evidence', sourceUrl: 'https://www.leag.de/de/news/details/leag-kauft-holzkontor-und-pelletierwerk-schwedt/' },
  ],
  [contactKey('Bayer Bitterfeld GmbH')]: [
    { id: 'bayer-bitterfeld-site-route', name: 'Bayer Bitterfeld — site route', designation: 'Official site contact route', role: 'Pharmaceutical production, process heat and energy-management routing; named local decision-maker not confirmed', sourceUrl: 'https://www.bayer.com/de/deutschland/standorte/bitterfeld-startseite' },
  ],
  [contactKey('W. u. H. Fernholz GmbH & Co. KG')]: [
    { id: 'fernholz-company-route', name: 'W. u. H. Fernholz — company route', designation: 'Company route', role: 'Packaging-production and energy-routing contact; named decision-maker not confirmed', sourceUrl: 'https://www.fernholz.de/' },
  ],
  [contactKey('GP Papenburg Betonwerke / Heidelberger Beton')]: [
    { id: 'gp-papenburg-company-route', name: 'GP Papenburg Betonwerke — company route', designation: 'Official group/production route', role: 'Concrete production and plant-routing contact; hydrogen process-heat demand not established', sourceUrl: 'https://gp.ag/leistung/technologie-und-produkte/betonwerke' },
  ],
  [contactKey('Pratt & Whitney Kalisz')]: [
    { id: 'pwk-leszek-polus', name: 'Leszek Polus', designation: 'General Manager, Kalisz Site', role: 'Site leadership; industrial and energy-routing contact', linkedinUrl: 'https://linkedin.com/in/leszek-polus-3338957', sourceUrl: 'https://www.pwk.com.pl/' , phones: ['+48 62 76 69 300', '+48 62 76 69 301'] },
    { id: 'pwk-karolina-janczewska', name: 'Karolina Janczewska', designation: 'General Procurement Manager', role: 'Procurement; Energy & Utilities responsibility identified', linkedinUrl: 'https://linkedin.com/in/karolina-janczewska-5557b599', sourceUrl: 'https://www.pwk.com.pl/' },
    { id: 'pwk-agnieszka-nowakowska', name: 'Agnieszka Nowakowska', designation: 'Senior Manager, Indirect Procurement', role: 'Indirect procurement and supplier-routing contact', linkedinUrl: 'https://linkedin.com/in/agnieszka-nowakowska-027526152', sourceUrl: 'https://www.pwk.com.pl/' },
    { id: 'pwk-office', name: 'Pratt & Whitney Kalisz — office route', designation: 'Corporate / site route', role: 'Public company route; named-person association not established', sourceUrl: 'https://www.pwk.com.pl/en/contact-us/', phones: ['+48 62 76 69 300', '+48 62 76 69 301'] },
  ],
  [contactKey('Volkswagen Poznan')]: [
    { id: 'vwpoz-dietmar-mnich', name: 'Dietmar Mnich', designation: 'CEO', role: 'Company executive; strategic partnership routing', linkedinUrl: 'https://linkedin.com/in/dietmar-mnich-859a25202', sourceUrl: 'https://volkswagen-poznan.pl/kontakt' },
    { id: 'vwpoz-liane-lubitz', name: 'Liane Lubitz', designation: 'CFO and Member of the Board', role: 'Finance, purchasing and IT; investment and procurement routing', linkedinUrl: 'https://linkedin.com/in/liane-lubitz-745370225', sourceUrl: 'https://volkswagen-poznan.pl/kontakt' },
    { id: 'vwpoz-przemyslaw-kuczynski', name: 'Przemysław Kuczyński', designation: 'General Energy Manager', role: 'Energy strategy, energy purchasing, renewables and efficiency', linkedinUrl: 'https://linkedin.com/in/przemys%C5%82aw-kuczy%C5%84ski-74194718a', sourceUrl: 'https://volkswagen-poznan.pl/kontakt' },
    { id: 'vwpoz-damian-kurzajczyk', name: 'Damian Kurzajczyk', designation: 'Head of Process Planning, Environmental Protection & Energy Management', role: 'Process, environmental and energy-management decision-maker', linkedinUrl: 'https://linkedin.com/in/damian-kurzajczyk-563688155', sourceUrl: 'https://volkswagen-poznan.pl/kontakt' },
    { id: 'vwpoz-office', name: 'Volkswagen Poznań — company route', designation: 'Official company route', role: 'Public corporate route; named-person association not established', emails: ['kontakt@vw-poznan.pl'], sourceUrl: 'https://volkswagen-poznan.pl/kontakt' },
    { id: 'vwpoz-patrycja-kasprzyk', name: 'Patrycja Kasprzyk', designation: 'Press / Communications contact', role: 'Routing contact only; not a commercial decision-maker', emails: ['Patrycja.Kasprzyk@vw-poznan.pl'], phones: ['+48 696 443 929'], sourceUrl: 'https://volkswagen-poznan.pl/kontakt' },
  ],
  [contactKey('Volkswagen Motor Polska')]: [
    { id: 'vwmp-rene-wolters', name: 'Rene Wolters', designation: 'CIO', role: 'Executive technology and operations-routing contact', linkedinUrl: 'https://linkedin.com/in/rene-wolters', sourceUrl: 'https://www.volkswagen-newsroom.com/en/volkswagen-motor-polska-sp-z-oo-3741' },
    { id: 'vwmp-michal-poplawski', name: 'Michał Popławski', designation: 'Communication Specialist', role: 'Official media/routing contact; not a commercial decision-maker', emails: ['michal.poplawski1@vwmp.pl'], phones: ['+48 660 745 944'], sourceUrl: 'https://www.volkswagen-newsroom.com/en/volkswagen-motor-polska-sp-z-oo-3741' },
  ],
  [contactKey('KGHM Polska Miedz')]: [
    { id: 'kghm-remigiusz-paszkiewicz', name: 'Remigiusz Paszkiewicz', designation: 'President & CEO', role: 'Group executive; strategic and investment-routing contact', sourceUrl: 'https://kghm.com/en/about-us/leadership' },
    { id: 'kghm-miroslaw-laskowski', name: 'Mirosław Laskowski', designation: 'Vice President, Production', role: 'Production and industrial operations decision-maker', sourceUrl: 'https://kghm.com/en/about-us/leadership' },
    { id: 'kghm-zbigniew-bryja', name: 'Zbigniew Bryja', designation: 'Vice President, Development', role: 'Development and strategic-projects decision-maker', sourceUrl: 'https://kghm.com/en/about-us/leadership' },
    { id: 'kghm-artur-sobolewski', name: 'Artur Sobolewski', designation: 'Director General for Procurement', role: 'Procurement decision-maker', phones: ['+48 76 74 78 601'], sourceUrl: 'https://kghm.com/pl/kontakt' },
    { id: 'kghm-esg-route', name: 'KGHM — ESG / corporate route', designation: 'Shared corporate route', role: 'Public route; named-person association not established', emails: ['esg@kghm.com'], phones: ['+48 76 74 78 200', '+48 76 74 75 924'], sourceUrl: 'https://kghm.com/pl/kontakt' },
  ],
  [contactKey('Sandvik')]: [
    { id: 'sandvik-polkowice-office', name: 'Sandvik Polkowice office', designation: 'Sales / site route', role: 'Official local route; named-person association not established', emails: ['smc.pl@sandvik.com'], phones: ['+48 76 727 75 00'], sourceUrl: 'https://www.mining.sandvik/en/contact/contact-map/' },
    { id: 'sandvik-poland-office', name: 'Sandvik Polska', designation: 'Corporate route', role: 'Official Poland route; named-person association not established', emails: ['info@sandvik.com'], phones: ['+48 22 647 38 80'], sourceUrl: 'https://www.home.sandvik/pl/kontakt/' },
  ],
  [contactKey('Faurecia')]: [
    { id: 'forvia-martin-fischer', name: 'Martin Fischer', designation: 'CEO, FORVIA', role: 'Group executive; strategic industrial-partnership routing', linkedinUrl: 'https://linkedin.com/in/fischer-martin', sourceUrl: 'https://www.forvia.com/en' },
    { id: 'forvia-poland-route', name: 'FORVIA Poland — sustainability route', designation: 'Corporate / sustainability route', role: 'Official Poland route; no named local commercial decision-maker confirmed', sourceUrl: 'https://www.faurecia-polska.pl/en/sustainability' },
  ],
  [contactKey('NSK Steering Systems Poland')]: [
    { id: 'nsk-krzysztof-prusaczyk', name: 'Krzysztof Prusaczyk', designation: 'Purchasing Manager', role: 'Local purchasing decision-maker', linkedinUrl: 'https://linkedin.com/in/krzysztof-prusaczyk-b5b4b8b1', sourceUrl: 'https://www.nsk.com/locations/' },
    { id: 'nsk-karol-dziekanski', name: 'Karol Dziekański', designation: 'Senior Finance & Indirect Purchasing Manager / Board Member', role: 'Finance and indirect procurement decision-maker', linkedinUrl: 'https://linkedin.com/in/karol-dziekanski-1352937', sourceUrl: 'https://www.nskeurope.com/company/about-us/management/' },
    { id: 'nsk-marcin-pakula', name: 'Marcin Pakuła', designation: 'Manager, Non-production Purchasing', role: 'Local procurement decision-maker', linkedinUrl: 'https://linkedin.com/in/marcin-paku%C5%82a-296a4b78', sourceUrl: 'https://www.nsk.com/locations/' },
    { id: 'nsk-europe-procurement', name: 'Phill Sandy', designation: 'Head of European Procurement', role: 'European procurement decision-maker', linkedinUrl: 'https://uk.linkedin.com/in/phill-sandy-5b28079', sourceUrl: 'https://www.nsk.com/locations/' },
    { id: 'nsk-office', name: 'NSK Poland — company route', designation: 'Shared corporate / plant route', role: 'Official route; named-person association not established', emails: ['info-pl@nsk.com'], phones: ['+48 22 645 15 25', '+48 74 664 4101'], sourceUrl: 'https://www.nsk.com/locations/' },
  ],
};

// Approved Arctic Paper enrichment: public-source research only; no Reoon result is asserted here.
export const hydrogenCandidateResearch = {
  [contactKey('VERBIO Schwedt GmbH')]: {
    description: 'VERBIO Schwedt operates bioethanol, biodiesel and biomethane production, including straw-based biomethane and related fertilizer/feed co-products. The site is an energy-intensive biorefinery, but its public strategy focuses on producing renewable fuels and biomethane rather than buying external hydrogen for process heat.',
    summary: 'Self-production/renewable-fuels signal with industrial heat relevance, but external hydrogen offtake is not confirmed. Qualify only if a specific hydrogen conversion or external supply requirement emerges.',
    primaryClassification: 'Self-production / renewable-fuels signal; external hydrogen demand not confirmed',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official site profile', summary: 'VERBIO Schwedt produces bioethanol, biodiesel, biomethane, fertilizer and animal feed; the site includes a large-scale straw biomethane facility.', sourceUrl: 'https://www.verbio.de/en/company/verbio-locations/production-site-schwedt/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official safety information', summary: 'The site is a bioethanol, biomethane and biodiesel operating area; Harald Senst is named as managing director and the plant route is published.', sourceUrl: 'https://www.verbio.de/fileadmin/user_upload/Verbio/Unternehmen/Standorte/nformation_gemaess_Paragraph_8a_12.BImSchV-Schwedt.pdf', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Corporate energy strategy', summary: 'Verbio describes biomethane as a renewable gas that can generate heat and electricity and reports ISO 50001 energy management at German plants.', sourceUrl: 'https://verbio.live/en/investor-relations/service/faq/', verificationStatus: 'Corporate source reviewed' },
    ],
    sourceUrls: ['https://www.verbio.de/en/company/verbio-locations/production-site-schwedt/', 'https://www.verbio.de/en/company/management-supervisory-board/', 'https://www.verbio.de/fileadmin/user_upload/Verbio/Unternehmen/Standorte/nformation_gemaess_Paragraph_8a_12.BImSchV-Schwedt.pdf', 'https://verbio.live/en/investor-relations/service/faq/'],
  },
  [contactKey('HPS Holzkontor- und Pelletierwerk Schwedt')]: {
    description: 'HPS is a pellet-production plant in Schwedt, now part of the LEAG pellet group. Public sources describe approximately 120,000 tonnes/year pellet capacity, ISO 50001 and industrial pellet customers. HPS is primarily a producer of renewable solid fuel, not an identified external hydrogen-consuming plant.',
    summary: 'Self-production/biomass-fuel signal. HPS may be relevant as a fuel-transition network contact, but public evidence does not support classifying it as an external hydrogen offtaker.',
    primaryClassification: 'Self-production / biomass-fuel signal; external hydrogen demand not found',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'LEAG acquisition source', summary: 'LEAG identifies HPS as a wood-pellet production facility serving industrial and household fuel markets and part of its transition toward lower-carbon fuels.', sourceUrl: 'https://www.leag.de/de/news/details/leag-kauft-holzkontor-und-pelletierwerk-schwedt/', verificationStatus: 'Official group source reviewed' },
      { evidenceType: 'Certification report', summary: 'Public certification material describes HPS as a 120,000-tonne/year pellet producer with ISO 50001 energy-efficiency management.', sourceUrl: 'https://www.preferredbynature.org/news/sbp-verification-can-now-show-compliance-eu-red-ii', verificationStatus: 'Certification source reviewed' },
      { evidenceType: 'Managing director profile', summary: 'A current interview identifies Sylwia Senczyszyn as managing director and discusses production, energy efficiency and the pellet heat-transition market.', sourceUrl: 'https://www.european-business.com/en/interviews/holzkontor-und-pelletierwerk-schwedt-gmbh/architects-of-the-heat-transition', verificationStatus: 'Professional interview reviewed' },
    ],
    sourceUrls: ['https://www.leag.de/de/news/details/leag-kauft-holzkontor-und-pelletierwerk-schwedt/', 'https://www.preferredbynature.org/news/sbp-verification-can-now-show-compliance-eu-red-ii', 'https://www.european-business.com/en/interviews/holzkontor-und-pelletierwerk-schwedt-gmbh/architects-of-the-heat-transition'],
  },
  [contactKey('Bayer Bitterfeld GmbH')]: {
    description: 'Bayer Bitterfeld operates pharmaceutical and specialty-chemical production in the Chemiepark Bitterfeld-Wolfen. Official site material confirms process heat recovery, thermal exhaust-gas treatment and ISO 50001 energy management. No public target-specific hydrogen procurement or fuel-switch project was found.',
    summary: 'Strong process-heat and energy-management lead, but hydrogen demand is not publicly confirmed. Further diligence should target the site energy manager, boiler/furnace assets and Bayer/Chemiepark decarbonisation plans.',
    primaryClassification: 'Strong process-heat lead; hydrogen demand not confirmed',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official site HSE profile', summary: 'Bayer Bitterfeld reports pharmaceutical production, process-integrated filtration, thermal exhaust-gas treatment and process-heat recovery where possible.', sourceUrl: 'https://www.bayer.com/de/deutschland/standorte/bitterfeld-startseite', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'ISO 50001', summary: 'The Bitterfeld site reports ISO 50001 coverage for pharmaceutical production and infrastructure services for the industrial park.', sourceUrl: 'https://www.bayer.com/de/deutschland/standorte/bitterfeld-sicherheit-und-umweltschutz', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Energy-management network', summary: 'Bayer Bitterfeld appears in an energy-efficiency network, but the available public record does not identify a hydrogen project or external supply requirement.', sourceUrl: 'https://www.effizienznetzwerke.org/erfolgsgeschichten/aus-tradition-in-die-zukunft/', verificationStatus: 'Secondary source reviewed' },
    ],
    sourceUrls: ['https://www.bayer.com/de/deutschland/standorte/bitterfeld-startseite', 'https://www.bayer.com/de/deutschland/standorte/bitterfeld-sicherheit-und-umweltschutz', 'https://www.effizienznetzwerke.org/erfolgsgeschichten/aus-tradition-in-die-zukunft/'],
  },
  [contactKey('W. u. H. Fernholz GmbH & Co. KG')]: {
    description: 'W. u. H. Fernholz is listed in the pipeline as a food-packaging production company in the ValuePark Schkopau/Böhlen area. Public search evidence did not establish a site-specific process-heat load, hydrogen project, current fuel, or external hydrogen procurement requirement.',
    summary: 'Weak industrial-heat lead pending entity and site verification. Do not treat the ValuePark location or packaging activity alone as evidence of hydrogen demand.',
    primaryClassification: 'Indirect site signal; company/process evidence insufficient',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Pipeline site record', summary: 'The company is listed in the ValuePark Schkopau/Böhlen industrial-area dataset as a food-packaging producer; exact facility and fuel evidence remain unresolved.', sourceUrl: 'https://www.valuepark.de/', verificationStatus: 'Pipeline record requires entity validation' },
      { evidenceType: 'Research limitation', summary: 'ChatGPT, Exa and Firecrawl searches did not locate reliable current public evidence of hydrogen procurement, process-heat conversion or a named energy decision-maker for the exact site.', sourceUrl: 'https://www.fernholz.de/', verificationStatus: 'No qualifying public evidence found' },
    ],
    sourceUrls: ['https://www.valuepark.de/', 'https://www.fernholz.de/'],
  },
  [contactKey('GP Papenburg Betonwerke / Heidelberger Beton')]: {
    description: 'The Schwarze Pumpe record combines GP Papenburg/Heidelberger concrete-production references in an industrial park. Official GP material confirms regional transport-concrete production, but no site-specific kiln, high-temperature process, hydrogen conversion or external hydrogen procurement evidence was found.',
    summary: 'Low-priority indirect industrial-heat lead. Concrete production alone does not establish hydrogen demand; exact plant process and fuel evidence are required.',
    primaryClassification: 'Indirect site signal; hydrogen demand not found',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official company profile', summary: 'GP Betonwerke describes transport-concrete production across multiple regional works and concrete logistics, not a hydrogen-relevant high-temperature process at Schwarze Pumpe.', sourceUrl: 'https://gp.ag/leistung/technologie-und-produkte/betonwerke', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Industrial-park listing', summary: 'The Schwarze Pumpe industrial-park record lists GP Papenburg and Heidelberger concrete operations among many tenants; this is zone evidence, not target-specific hydrogen demand.', sourceUrl: 'https://de.wikipedia.org/wiki/Industriepark_Schwarze_Pumpe', verificationStatus: 'Secondary zone source reviewed' },
    ],
    sourceUrls: ['https://gp.ag/leistung/technologie-und-produkte/betonwerke', 'https://gp-beton-nord.de/unternehmen/', 'https://de.wikipedia.org/wiki/Industriepark_Schwarze_Pumpe'],
  },
  [contactKey('LUVENA S.A.')]: {
    description: 'LUVENA S.A. operates a fertilizer and chemical-production site in Luboń. Official environmental and permitting material describes significant energy use, including natural gas, and the company states that it manages thermal energy and continues production modernisation. No public hydrogen procurement, fuel-switch project or external hydrogen supply agreement was found.',
    summary: 'Strong process-industry and natural-gas lead, but hydrogen demand is not publicly confirmed. Treat as strategic potential pending current boiler/process and procurement validation.',
    primaryClassification: 'Strong process-heat lead; hydrogen demand not confirmed',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official company profile', summary: 'LUVENA describes fertilizer manufacturing at its Luboń factory and annual output above 300,000 tonnes.', sourceUrl: 'https://luvena.pl/en/abous-us/', verificationStatus: 'Public source reviewed' },
      { evidenceType: 'Environmental permit', summary: 'Regional permitting material identifies the chemical fertilizer installations and reports historical natural-gas use of approximately 4,000,000 m³/year for the covered installation.', sourceUrl: 'https://bip.umww.pl/artykuly/2820379/pliki/20150209130411_pzdsrii1.7222.91.2014bip.pdf', verificationStatus: 'Regulatory source reviewed; historical baseline' },
      { evidenceType: 'Environmental policy', summary: 'LUVENA states that it manages electricity and thermal energy and considers new techniques in investments and modernisations, but does not name a hydrogen project.', sourceUrl: 'https://luvena.pl/polityka-srodowiskowa/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Decision-maker route', summary: 'A public professional profile identifies Agata Markowska as Deputy Purchasing Manager with natural-gas and power procurement responsibility; the profile is not an official company directory.', sourceUrl: 'https://linkedin.com/in/agata-markowska-a72a789b', verificationStatus: 'Professional profile reviewed; email not verified' },
    ],
    sourceUrls: ['https://luvena.pl/en/abous-us/', 'https://luvena.pl/polityka-srodowiskowa/', 'https://luvena.pl/centrala/', 'https://bip.umww.pl/artykuly/2820379/pliki/20150209130411_pzdsrii1.7222.91.2014bip.pdf', 'https://linkedin.com/in/agata-markowska-a72a789b'],
  },
  [contactKey('Volkswagen Poznan / Wrzesnia-area manufacturing')]: {
    description: 'Volkswagen Poznań operates vehicle and metal-manufacturing sites, including Września. Official company material identifies natural gas in boiler-house, heating and technological devices. Recent project reporting describes hydrogen-oxygen enrichment of a 1.5 MW natural-gas burner, with a 90 kW electrolyser and an expected reduction in gas use of up to 30%; this is an internal pilot/self-production route, not external hydrogen offtake.',
    summary: 'Advanced fuel-switch and hydrogen-trial signal. The plant is already testing onsite hydrogen-enhanced combustion, so an external 20 MW supply should be approached as a later scale-up or supplementary route, not as a confirmed current buyer.',
    primaryClassification: 'Advanced fuel-switch signal; onsite hydrogen pilot',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official plant technology profile', summary: 'Volkswagen Poznań states that the plant boiler house, heating and technological devices are fuelled with natural gas and that heat recovery is used where possible.', sourceUrl: 'https://www.volkswagen-poznan.pl/en/responsibility/environmental-protection/technology', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Hydrogen combustion project', summary: 'Hydrogenera reports a collaboration at the Września plant using a hydrogen-oxygen system with a 90 kW electrolyser to improve combustion of a 1.5 MW natural-gas burner; the report states up to 30% fuel reduction as the project objective.', sourceUrl: 'https://hydrogenera.eu/tpost/38syk0xib1-powering-efficiency-hydrogeneras-energy', verificationStatus: 'Supplier project source reviewed; target outcomes not independently confirmed' },
      { evidenceType: 'Operational energy decision-maker', summary: 'A public professional profile identifies Przemysław Kuczyński as General Energy Manager with responsibility for energy strategy, energy purchasing, renewables, ISO 50001 and the Września technical department.', sourceUrl: 'https://linkedin.com/in/przemys%C5%82aw-kuczy%C5%84ski-74194718a', verificationStatus: 'Professional profile reviewed; email not verified' },
      { evidenceType: 'Official contact route', summary: 'Volkswagen Poznań publishes Poznań and Września plant addresses, switchboards and a general company route.', sourceUrl: 'https://www.volkswagen-poznan.pl/kontakt', verificationStatus: 'Official source reviewed' },
    ],
    sourceUrls: ['https://www.volkswagen-poznan.pl/en/responsibility/environmental-protection/technology', 'https://hydrogenera.eu/tpost/38syk0xib1-powering-efficiency-hydrogeneras-energy', 'https://www.volkswagen-poznan.pl/kontakt', 'https://linkedin.com/in/przemys%C5%82aw-kuczy%C5%84ski-74194718a'],
  },
  [contactKey('Bialogard Investment Park production tenants')]: {
    description: 'The Białogard Investment Park record is a zone-level placeholder, not a named consuming company. Official park material describes serviced production land, halls, gas and electricity infrastructure and multiple tenants, but does not identify which tenant uses process heat or is considering hydrogen.',
    summary: 'Indirect zone lead only. Do not treat the park as an offtaker; identify a specific operating tenant and its process, fuel and procurement authority before outreach.',
    primaryClassification: 'Indirect site signal; exact consuming tenant required',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official investment-park profile', summary: 'Invest Park describes production and warehouse facilities, utilities including gas, and multiple investors, but no target-specific hydrogen or process-heat commitment.', sourceUrl: 'https://www.investparkbialogard.pl/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Investor service information', summary: 'The park offers land, turnkey production facilities and investor support; this is infrastructure and tenant-acquisition evidence, not offtake evidence.', sourceUrl: 'https://www.investparkbialogard.pl/dla-inwestora', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Public company registry route', summary: 'The park publishes Waldemar Gorzelak as President of the Management Board and a general investor route.', sourceUrl: 'https://www.investparkbialogard.pl/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Tenant example', summary: 'Public regional reporting identifies Kabel-Technik-Polska as a production tenant, but the available source does not establish hydrogen-relevant process heat or procurement intent.', sourceUrl: 'https://powiat-bialogard.pl/4,2,aktualnosci-starostwa&dtx=&szukaj=&go=morelist&s=83', verificationStatus: 'Regional source reviewed; insufficient for offtake classification' },
    ],
    sourceUrls: ['https://www.investparkbialogard.pl/', 'https://www.investparkbialogard.pl/dla-inwestora', 'https://www.paih.gov.pl/en/why-poland/investment-incentives/industrial-and-technology-parks/bialogard/', 'https://powiat-bialogard.pl/4,2,aktualnosci-starostwa&dtx=&szukaj=&go=morelist&s=83'],
  },
  [contactKey('Arctic Paper Kostrzyn S.A.')]: {
    description: 'Paper drying uses process steam. Public site information identifies natural gas as a major current fuel and describes heat-recovery and electrification work; no external hydrogen procurement or supply agreement was found.',
    summary: 'Strong process-heat lead for hydrogen fuel-switch discussion. Current demand volume, delivery route and commercial hydrogen intent remain unconfirmed.',
    primaryClassification: 'Strong process-heat lead; strategic hydrogen potential',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official mill profile', summary: 'Arctic Paper Kostrzyn paper mill profile and site details.', sourceUrl: 'https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/', verificationStatus: 'Public source reviewed' },
      { evidenceType: 'EMAS environmental report', summary: 'Environmental report covering production, energy and emissions context for the Kostrzyn mill.', sourceUrl: 'https://www.arcticpaper.com/globalassets/corporate-site/sustainability/certificates--statements/certificates/emas/apk-emas-2025_eng.pdf', verificationStatus: 'Public source reviewed' },
    ],
    sourceUrls: ['https://www.arcticpaper.com/about-arctic-paper/paper-mills/arctic-paper-kostrzyn/', 'https://www.arcticpaper.com/globalassets/corporate-site/sustainability/certificates--statements/certificates/emas/apk-emas-2025_eng.pdf'],
  },
  [contactKey('ICT Poland Sp. z o.o.')]: {
    description: 'ICT Poland operates a large tissue mill in Kostrzyn. Public evidence identifies energy-management work, ISO 50001 certification and heat-recovery systems that generate and reuse steam in tissue production. No public hydrogen procurement, hydrogen conversion or external supply agreement was found.',
    summary: 'Strong process-heat and energy-efficiency lead, but hydrogen demand is not publicly confirmed. Treat as strategic potential pending plant-fuel and procurement validation.',
    primaryClassification: 'Strong process-heat lead; hydrogen demand not confirmed',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official company profile', summary: 'ICT Poland operates a tissue production site in Kostrzyn and describes ongoing energy-efficiency work.', sourceUrl: 'https://www.ictgroup.net/en/who-we-are/the-group/ict-poland-sp-zoo/who-we-are', verificationStatus: 'Public source reviewed' },
      { evidenceType: 'Energy recovery project', summary: 'ANDRITZ supplied heat-recovery chains for tissue machines; recovered steam is used in the process and reduces energy use and emissions.', sourceUrl: 'https://www.andritz.com/newsroom-en/pulp-paper/2022-02-11-ict-poland-group', verificationStatus: 'Corroborating source reviewed' },
      { evidenceType: 'ISO 50001', summary: 'ICT Poland energy-management system is certified to ISO 50001:2018.', sourceUrl: 'https://www.ictgroup.net/certificazioni-sostenibilita/pdf/2026/ict-poland_iso-50001_certificate_2026_en.pdf', verificationStatus: 'Public certificate reviewed' },
    ],
    sourceUrls: ['https://www.ictgroup.net/en/who-we-are/the-group/ict-poland-sp-zoo/who-we-are', 'https://www.andritz.com/newsroom-en/pulp-paper/2022-02-11-ict-poland-group', 'https://www.ictgroup.net/certificazioni-sostenibilita/pdf/2026/ict-poland_iso-50001_certificate_2026_en.pdf', 'https://www.ictgroup.net/pl/kim-jestesmy/grupa/ict-poland-sp-zoo/kontakt'],
  },
  [contactKey('Barlinek Inwestycje / wood products')]: {
    description: 'Barlinek reports a biomass-fired trigeneration plant supplying process heat, with a 25 MWt thermal capacity and full coverage of the factory\'s process-heat requirement in the cited company material. No public hydrogen procurement or fuel-switch project was found.',
    summary: 'Self-production/competitor signal rather than confirmed external hydrogen demand. The site is a low-priority outreach lead unless a future hydrogen conversion is identified.',
    primaryClassification: 'Self-production / competitor signal; no hydrogen demand confirmed',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official trigeneration project', summary: 'Barlinek describes a biomass steam boiler, process-heat recovery and approximately 25 MWt thermal capacity.', sourceUrl: 'https://www.barlinek.com.pl/aktualnosci/trigeneracja/', verificationStatus: 'Public source reviewed' },
      { evidenceType: 'Official energy statement', summary: 'Company material states that its own generation covers 100% of process heat needs.', sourceUrl: 'https://www.barlinek.com.pl/aktualnoscibarlinek/inwestycje-w-trigeneracje/', verificationStatus: 'Public source reviewed' },
      { evidenceType: 'Energy concession', summary: 'URE concession identifies a dedicated biomass cogeneration installation at the Barlinek site.', sourceUrl: 'https://api.ure.gov.pl/api/ConcessionFuel/download/83BC6301-9585-460C-8626-06241E24BB09', verificationStatus: 'Regulatory source reviewed' },
    ],
    sourceUrls: ['https://www.barlinek.com.pl/aktualnosci/trigeneracja/', 'https://www.barlinek.com.pl/aktualnoscibarlinek/inwestycje-w-trigeneracje/', 'https://api.ure.gov.pl/api/ConcessionFuel/download/83BC6301-9585-460C-8626-06241E24BB09', 'https://www.barlinek.com.pl/Kontakt/'],
  },
  [contactKey('Grupa Azoty S.A. / Zaklady Azotowe Kedzierzyn')]: {
    description: 'Grupa Azoty Kędzierzyn has direct hydrogen use in ammonia production and process-heat integration, but the public evidence concerns self-production/feedstock and internal steam management rather than external hydrogen offtake. The 2025 New Energy Concept includes a 100 tonnes/hour natural-gas peak-load steam boiler.',
    summary: 'Strong direct hydrogen-use evidence, classified as self-production/feedstock rather than confirmed external offtake. A commercial route would require a specific external supply or conversion decision.',
    primaryClassification: 'Self-production / direct hydrogen use; external offtake not confirmed',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official energy project', summary: 'The New Energy Concept completed a 100 tonnes/hour natural-gas peak-load backup boiler and internal process-heat recovery program.', sourceUrl: 'https://grupaazoty.com/en/news/grupa-azoty-kedzierzyn-completes-implementation-of-the-new-energy-concept', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official hydrogen-production project', summary: 'A partial-combustion upgrade lowers the steam-to-carbon ratio during hydrogen production in the ammonia department.', sourceUrl: 'https://grupaazoty.com/en/news/grupa-azoty-zaklady-azotowe-kedzierzyn-s-a-completes-energy-projects-worth-over-pln-65m?v=pdf', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Investor webchat', summary: 'The site-wide program focuses on recovering process heat from ammonia production and reducing coal and natural-gas use.', sourceUrl: 'https://tarnow.grupaazoty.com/en/investor-relations/media/investor-webchats', verificationStatus: 'Official source reviewed' },
    ],
    sourceUrls: ['https://grupaazoty.com/en/news/grupa-azoty-kedzierzyn-completes-implementation-of-the-new-energy-concept', 'https://grupaazoty.com/en/news/grupa-azoty-zaklady-azotowe-kedzierzyn-s-a-completes-energy-projects-worth-over-pln-65m?v=pdf', 'https://tarnow.grupaazoty.com/en/investor-relations/media/investor-webchats', 'https://zak.grupaazoty.com/'],
  },
  [contactKey('Brenntag Polska / chemical distribution')]: {
    description: 'Brenntag Polska operates chemical distribution and logistics locations, including a Kędzierzyn-Koźle site. Public sources identify distribution, logistics and some chemical manufacturing activity, but do not establish a target-specific hydrogen fuel-switch, process-heat conversion or external hydrogen procurement requirement.',
    summary: 'Weak/indirect lead. Treat Brenntag Polska primarily as a chemical distributor and possible network route, not as a confirmed hydrogen-consuming industrial offtaker.',
    primaryClassification: 'Indirect site signal; direct hydrogen demand not found',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official Poland locations', summary: 'Brenntag lists a Kędzierzyn-Koźle location and identifies Polish plants, warehouses and logistics operations.', sourceUrl: 'https://www.brenntag.com/en-pl/locations.html', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official company profile', summary: 'Brenntag Polska describes chemical distribution and technical advisory services; no hydrogen offtake commitment is stated.', sourceUrl: 'https://www.brenntag.com/pl-pl/dane-firmy.html', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Industrial-area directory', summary: 'Blachownia Holding identifies Brenntag Polska as a tenant/operator in the wider industrial area.', sourceUrl: 'https://jpmholding.com.pl/partnerzy', verificationStatus: 'Public site source reviewed' },
    ],
    sourceUrls: ['https://www.brenntag.com/en-pl/locations.html', 'https://www.brenntag.com/pl-pl/dane-firmy.html', 'https://www.brenntag.com/en-pl/imprint.html', 'https://jpmholding.com.pl/partnerzy'],
  },
  [contactKey('Blachownia Holding / chemical production area')]: {
    description: 'Blachownia Holding is an industrial-area holding/operator with multiple tenants rather than a single consuming plant. The adjacent Blachownia Generation Plant produces heat and electricity in cogeneration using coke-oven gas and supplies nearby industrial companies. No target-specific hydrogen procurement or fuel-switch commitment was found.',
    summary: 'Indirect site and utility signal. The relevant commercial route is tenant-by-tenant qualification or utility-partner discussion; do not classify the holding company itself as a hydrogen offtaker.',
    primaryClassification: 'Indirect site/utility signal; exact consuming tenant required',
    researchStatus: 'needs_source_verification',
    signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official generation-plant profile', summary: 'TAMEH states that the Blachownia Generation Plant produces heat and electricity in cogeneration using coke-oven gas, with adjacent industrial companies as main heat consumers.', sourceUrl: 'https://tameh.pl/en/about-the-group/blachownia-generation-plant', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Industrial-area tenant profile', summary: 'Blachownia Holding lists chemical, petrochemical, distribution and manufacturing tenants in the area.', sourceUrl: 'https://jpmholding.com.pl/partnerzy', verificationStatus: 'Public site source reviewed' },
      { evidenceType: 'Tenant process profile', summary: 'Petrochemia Blachownia describes sulphuric-acid recovery using combustion heat and steam generation.', sourceUrl: 'https://petrochemia-bl.com.pl/en/company.html', verificationStatus: 'Public site source reviewed' },
    ],
    sourceUrls: ['https://tameh.pl/en/about-the-group/blachownia-generation-plant', 'https://jpmholding.com.pl/partnerzy', 'https://petrochemia-bl.com.pl/en/company.html', 'https://jpmholding.com.pl/kontakt'],
  },
};

export const hydrogenReoonSeeds = {
  'agnieszka.ksiazkiewicz@grupaazoty.com': { status: 'catch_all', deliverable: false, checkedAt: '2026-10-16T09:18:25.772Z' },
  'recepcja@ictpl.eu': { status: 'invalid', deliverable: false, checkedAt: '2026-10-16T09:18:53.724Z' },
  'info@barlinek.com.pl': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16T09:18:56.848Z' },
  'zak@grupaazoty.com': { status: 'catch_all', deliverable: false, checkedAt: '2026-10-16T09:19:03.097Z' },
  'biuro@brenntag.pl': { status: 'catch_all', deliverable: false, checkedAt: '2026-10-16T09:19:06.015Z' },
  'kontakt@vw-poznan.pl': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16T03:37:25.301Z' },
  'patrycja.kasprzyk@vw-poznan.pl': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16T03:37:32.000Z' },
  'michal.poplawski1@vwmp.pl': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16T03:37:40.000Z' },
  'esg@kghm.com': { status: 'catch_all', deliverable: false, checkedAt: '2026-10-16T03:37:50.044Z' },
  'smc.pl@sandvik.com': { status: 'safe', deliverable: true, checkedAt: '2026-10-16T03:37:57.581Z' },
  'info@sandvik.com': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16T03:38:03.062Z' },
  'info-pl@nsk.com': { status: 'safe', deliverable: true, checkedAt: '2026-10-16T03:38:09.651Z' },
};

export function hydrogenContactsFor(company) {
  const key = contactKey(company);
  const matchedKey = Object.keys(hydrogenContactResearch).find((candidate) => candidate === key || candidate.includes(key) || key.includes(candidate));
  const seeded = hydrogenContactResearch[matchedKey] || [];
  const storageKey = `hydrogen-offtaker:contacts:v1:${key}`;
  try {
    const local = JSON.parse(localStorage.getItem(storageKey));
    if (!Array.isArray(local)) return seeded;
    const identity = (contact) => String(contact?.id || contact?.emails?.[0] || contact?.email || contact?.name || '').toLowerCase();
    const merged = [...local];
    for (const contact of seeded) {
      const existingIndex = merged.findIndex((item) => identity(item) === identity(contact));
      if (existingIndex === -1) merged.push(contact);
      else merged[existingIndex] = { ...contact, ...merged[existingIndex], emails: Array.isArray(merged[existingIndex].emails) && merged[existingIndex].emails.length ? merged[existingIndex].emails : contact.emails };
    }
    return merged;
  } catch { return seeded; }
}

export function saveHydrogenContacts(company, contacts) {
  localStorage.setItem(`hydrogen-offtaker:contacts:v1:${contactKey(company)}`, JSON.stringify(contacts));
}
