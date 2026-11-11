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
  [contactKey('CropEnergies Bioethanol GmbH')]: [
    { id: 'cropenergies-zeitz-office', name: 'CropEnergies Zeitz — company route', designation: 'Official plant route', role: 'Bioethanol, energy-centre and process-heat routing; named-person email not independently confirmed', emails: ['info@cropenergies.de'], phones: ['+49 3441 899-501'], sourceUrl: 'https://www.cropenergies.com/de/unternehmen/standorte/zeitz' },
  ],
  [contactKey('Zellstoff Stendal GmbH')]: [
    { id: 'zellstoff-stendal-andre-listemann', name: 'André Listemann', designation: 'Managing Director, Zellstoff Stendal Transport GmbH', role: 'Publicly named local managing director; transport/company routing rather than confirmed hydrogen procurement decision-maker', sourceUrl: 'https://www.zs-transport.de/en/imprint.html' },
    { id: 'zellstoff-stendal-route', name: 'Zellstoff Stendal — site route', designation: 'Official site/company route', role: 'Pulp mill, recovery-energy and process-heat routing; named energy-procurement email not independently confirmed', sourceUrl: 'https://mercerint.com/our-operations/mercer-stendal/' },
  ],
  [contactKey('Mercer Stendal GmbH')]: [
    { id: 'mercer-stendal-daniel-klueh', name: 'Daniel Klüh', designation: 'Project contact, WinZell hydrogen-utilisation project', role: 'Hydrogen utilisation, power-to-X and pulp-mill sector-coupling research contact', sourceUrl: 'https://www.epe.ed.tum.de/en/res/research/completed-projects/winzell/' },
    { id: 'mercer-stendal-office', name: 'Mercer Stendal — company route', designation: 'Official mill route', role: 'Pulp mill, biomass energy and process-heat routing; public mailbox', emails: ['info.ms@mercerint.com'], phones: ['+49 39321 55-0'], sourceUrl: 'https://mercerint.com/our-operations/mercer-stendal/' },
  ],
  [contactKey('LM Wind Power Goleniów')]: [
    { id: 'lm-goleniow-maciej-grzybowski', name: 'Maciej Grzybowski', designation: 'Plant Director, Goleniów', role: 'Site leadership and manufacturing/energy-routing contact; personal email not independently confirmed', sourceUrl: 'https://www.lmwindpower.com/en/stories-and-press/stories/Inclusion-and-diversity/leading-with-humanity-in-times-of-crisis' },
    { id: 'lm-goleniow-route', name: 'LM Wind Power Goleniów — company route', designation: 'Official plant route', role: 'Rotor-blade manufacturing and factory operations routing; current ownership transition requires confirmation', sourceUrl: 'https://www.gevernova.com/news/press-releases/vestas-lm-wind-power-sign-deal-blades-factory-poland' },
  ],
  [contactKey('Bridgestone Stargard')]: [
    { id: 'bridgestone-stargard-michal-dymek', name: 'Michał Dymek', designation: 'Chief Energy Manager, Bridgestone Stargard', role: 'Site energy, engineering and process-heat decision-maker; LinkedIn source only', linkedinUrl: 'https://linkedin.com/in/micha%C5%82-dymek-20025493', sourceUrl: 'https://linkedin.com/in/micha%C5%82-dymek-20025493' },
    { id: 'bridgestone-stargard-route', name: 'Bridgestone Stargard — company route', designation: 'Official plant route', role: 'Truck and bus tyre manufacturing and plant-energy routing; public personal email not located', sourceUrl: 'https://www.bridgestone.com/corporate/news/2012070602.html' },
  ],
  [contactKey('KGHM Polska Miedz / Legnica-area metallurgy')]: [
    { id: 'kghm-legnica-remigiusz-paszkiewicz', name: 'Remigiusz Paszkiewicz', designation: 'President & CEO, KGHM Polska Miedź', role: 'Group executive; strategic and investment routing for Legnica metallurgy', sourceUrl: 'https://kghm.com/en/about-us/leadership' },
    { id: 'kghm-legnica-miroslaw-laskowski', name: 'Mirosław Laskowski', designation: 'Vice President, Production, KGHM Polska Miedź', role: 'Production and metallurgical operations decision-maker', sourceUrl: 'https://kghm.com/en/about-us/leadership' },
    { id: 'kghm-legnica-artur-sobolewski', name: 'Artur Sobolewski', designation: 'Director General for Procurement, KGHM Polska Miedź', role: 'Procurement decision-maker for industrial and energy-related routing', phones: ['+48 76 74 78 601'], sourceUrl: 'https://kghm.com/pl/kontakt' },
    { id: 'kghm-legnica-route', name: 'KGHM Legnica Copper Smelter — company route', designation: 'Official smelter/corporate route', role: 'Copper smelting, process gases, energy transition and hydrogen-technology routing; public personal email not located', emails: ['esg@kghm.com'], phones: ['+48 76 74 78 200'], sourceUrl: 'https://kghm.com/en/our-business/smelting-and-refining/legnica' },
  ],
  [contactKey('PCK Raffinerie GmbH')]: [
    { id: 'pck-ralf-schairer', name: 'Ralf Schairer', designation: 'Management spokesperson / refinery leadership', role: 'Refinery transformation and hydrogen-production routing', sourceUrl: 'https://brandenburg.de/cms/detail.php/bb1.c.759449.de' },
    { id: 'pck-office', name: 'PCK Raffinerie — company route', designation: 'Official refinery route', role: 'Existing refinery hydrogen feedstock, electrolyser and process-energy routing; public mailbox', emails: ['info@pck.de'], phones: ['+49 3332 46 0'], sourceUrl: 'https://www.pck.de/kontakt' },
  ],
  [contactKey('TotalEnergies Raffinerie Mitteldeutschland')]: [
    { id: 'total-leuna-burkhard-reuss', name: 'Burkhard Reuss', designation: 'Public refinery contact, TotalEnergies Germany', role: 'Leuna refinery communications and hydrogen-transition routing', emails: ['burkhard.reuss@totalenergies.com'], sourceUrl: 'https://totalenergies.de/kontakt' },
    { id: 'total-leuna-office', name: 'TotalEnergies Leuna — refinery route', designation: 'Official refinery route', role: 'Existing refinery hydrogen use and future green-hydrogen procurement routing', phones: ['+49 800 48 48 112'], sourceUrl: 'https://totalenergies.de/kontakt/raffinerie-leuna' },
  ],
  [contactKey('PCC Rokita S.A.')]: [
    { id: 'pcc-wieslaw-klimkowski', name: 'Wiesław Klimkowski', designation: 'President of the Management Board, PCC Rokita', role: 'Chemical-site strategy and investment routing', sourceUrl: 'https://en.pcc.rokita.pl/about-company/' },
    { id: 'pcc-grzegorz-sulowski', name: 'Grzegorz Sulowski', designation: 'Technologist, Chlorine Business Unit', role: 'Chlor-alkali electrolysis and hydrogen/by-product technical routing', emails: ['grzegorz.sulowski@pcc.eu'], phones: ['+48 71 794 24 85'], sourceUrl: 'https://en.pcc.rokita.pl/reach/contact/' },
    { id: 'pcc-energy-route', name: 'PCC Rokita — Energy Center route', designation: 'Official energy and procurement route', role: 'Site energy, electrolysis and industrial-hydrogen routing', emails: ['zakupy.rokita@pcc.eu', 'oferty@pcc.eu'], phones: ['+48 71 794 20 15'], sourceUrl: 'https://pcc.rokita.pl/dane-kontaktowe/' },
  ],
  [contactKey('PCC Exol S.A.')]: [
    { id: 'pcc-exol-board-route', name: 'PCC Exol — Board secretariat route', designation: 'Board Secretariat', role: 'Chemical production, investment and procurement routing', emails: ['zarzad_exol@pcc.eu'], phones: ['+48 71 794 21 27'], sourceUrl: 'https://pcc-exol.eu/de/kontakt/' },
  ],
  [contactKey('PCC MCAA Sp. z o.o.')]: [
    { id: 'pcc-mcaa-route', name: 'PCC MCAA — company route', designation: 'Official production-site route', role: 'MCAA chemical production and process-energy routing', phones: ['+48 71 794 36 11'], sourceUrl: 'https://www.pcc-mcaa.eu/en/' },
  ],
  [contactKey('ZPAS S.A. / Nowa Ruda operations')]: [
    { id: 'zpas-nowa-ruda-route', name: 'ZPAS Nowa Ruda — company route', designation: 'Official plant route', role: 'Electrical-prefabrication, powder-coating and plant-operations routing; hydrogen demand not confirmed', sourceUrl: 'https://zpasgroup.co.uk/content/11-about-zpas' },
  ],
  [contactKey('3M Wroclaw manufacturing site')]: [
    { id: '3m-wroclaw-route', name: '3M Wrocław — company route', designation: 'Official manufacturing route', role: 'Manufacturing and site-energy routing; named hydrogen/procurement contact not confirmed', phones: ['+48 22 739 60 00'], sourceUrl: 'https://www.3mpolska.pl/3M/pl_PL/firma-pl/o-firmie-3m-pl/' },
  ],
  [contactKey('Volvo Buses Wroclaw')]: [{ id: 'volvo-wroclaw-status', name: 'Former Volvo Buses Wrocław site', designation: 'Closed/divested production site', role: 'Historical pipeline record; no current Volvo hydrogen contact', sourceUrl: 'https://www.volvobuses.com/en/news-stories/press-releases/2023/mar/volvo-buses-changes-business-model-in-europe.html' }],
  [contactKey('Stelmet S.A. / Zielona Gora-area operations')]: [{ id: 'stelmet-route', name: 'Stelmet S.A. — company route', designation: 'Official company route', role: 'Wood products and drying operations; hydrogen demand not confirmed', sourceUrl: 'https://www.stelmet.com/' }],
  [contactKey('Novita S.A. / textile production')]: [{ id: 'novita-route', name: 'Novita S.A. — company route', designation: 'Official company route', role: 'Nonwoven/textile production and process-energy routing', emails: ['novita@novita.com.pl'], phones: ['+48 68 456 15 00'], sourceUrl: 'https://novita.pl/kontakt/' }],
  [contactKey('Pratt & Whitney Kalisz')]: [{ id: 'pwk-route', name: 'Pratt & Whitney Kalisz — company route', designation: 'Official plant route', role: 'Aerospace component manufacturing and energy routing', phones: ['+48 62 76 69 300'], sourceUrl: 'https://www.pwk.com.pl/en/home-en-b/' }],
  [contactKey('Bosch Goleniów / manufacturing operations')]: [{ id: 'bosch-goleniow-route', name: 'Bosch Goleniów — pipeline route', designation: 'Entity/site route', role: 'Current legal entity and manufacturing status require confirmation', sourceUrl: 'https://www.bosch.pl/' }],
  [contactKey('Cargill / food processing')]: [{ id: 'cargill-stargard-route', name: 'Cargill Stargard — pipeline route', designation: 'Company/site route', role: 'Food/agricultural processing route; exact plant and decision-maker require confirmation', sourceUrl: 'https://www.cargill.pl/' }],
  [contactKey('Volkswagen Motor Polska / Polkowice')]: [{ id: 'vwmp-polkowice-route', name: 'Volkswagen Motor Polska — company route', designation: 'Official plant route', role: 'Engine manufacturing and industrial-energy routing', sourceUrl: 'https://vwmp.com.pl/' }],
  [contactKey('Toyota Motor Manufacturing Poland / Walbrzych')]: [{ id: 'toyota-walbrzych-route', name: 'Toyota Motor Manufacturing Poland — company route', designation: 'Official plant route', role: 'Engine/transmission manufacturing and energy-transition routing', sourceUrl: 'https://www.toyotapl.com/' }],
  [contactKey('LEIPA Georg Leinfelder GmbH — Mill Schwedt')]: [
    { id: 'leipa-antonio-bellante', name: 'Antonio Bellante', designation: 'CEO, LEIPA Group', role: 'Group leadership; e-SAF and industrial-energy partnership routing', sourceUrl: 'https://www.leipa.com/en/news/detail/planned-large-scale-e-saf-plant-in-schwedt' },
    { id: 'leipa-schwedt-route', name: 'LEIPA Mill Schwedt — company route', designation: 'Official mill/supplier route', role: 'Paper mill, biogenic CO2 and e-SAF partnership routing; external hydrogen procurement not confirmed', emails: ['purchase@leipa.com'], phones: ['+49 3332 24-00'], sourceUrl: 'https://www.leipa.com/en/for-suppliers' },
  ],
  [contactKey('BUTTING Anlagenbau GmbH & Co. KG')]: [
    { id: 'butting-michael-bluoss', name: 'Michael Bluoss', designation: 'Managing Director, BUTTING Schwedt', role: 'Site leadership; industrial manufacturing and energy-routing contact', emails: ['michael.bluoss@butting-schwedt.de'], phones: ['+49 3332 2097-100'], sourceUrl: 'https://www.butting.com/standorte/schwedt/' },
    { id: 'butting-schwedt-route', name: 'BUTTING Schwedt — company route', designation: 'Official site route', role: 'Tanks, vessels and pipework manufacturing; current hydrogen demand not found', emails: ['info@butting-schwedt.de'], phones: ['+49 3332 2097-100'], sourceUrl: 'https://www.butting.com/standorte/schwedt/' },
  ],
  [contactKey('Indorama Ventures Fibers Germany / Trevira')]: [
    { id: 'trevira-guben-route', name: 'Indorama Ventures Fibers Germany / Trevira — company route', designation: 'Official corporate/site route', role: 'Polyester-fibre manufacturing and energy-routing contact; hydrogen procurement not confirmed', sourceUrl: 'https://www.indoramaventures.com/en/investor-relations/newsroom/stock-exchange/2305/strategic-reorganization-of-trevira-gmbh-in-germany' },
  ],
  [contactKey('Grupa Azoty ATT Polymers GmbH')]: [
    { id: 'att-polymers-route', name: 'Grupa Azoty ATT Polymers — company route', designation: 'Official company route', role: 'PA6/polymer production and industrial-energy routing; hydrogen procurement not confirmed', sourceUrl: 'https://att.grupaazoty.com/en/the-company/about-the-company' },
  ],
  [contactKey('Megaflex Schaumstoff GmbH')]: [
    { id: 'megaflex-karsten-lohr', name: 'Karsten Löhr', designation: 'CEO; Purchasing & Sales', role: 'Company leadership and purchasing route', emails: ['d.loehr@megaflex-schaumstoffe.de'], phones: ['+49 3561 548320'], sourceUrl: 'https://megaflex-schaumstoffe.de/index.php/de/kontakt/einverkauf' },
    { id: 'megaflex-daniel-lohr', name: 'Daniel Löhr', designation: 'CEO; Purchasing & Sales', role: 'Company leadership and purchasing route; public email not listed', phones: ['+49 3561 548320'], sourceUrl: 'https://megaflex-schaumstoffe.de/index.php/de/kontakt/einverkauf' },
    { id: 'megaflex-office', name: 'Megaflex Schaumstoff — company route', designation: 'Official company route', role: 'Polyurethane-foam manufacturing; process-energy demand not publicly quantified', emails: ['info@megaflex-schaumstoffe.de'], phones: ['+49 3561 548320'], sourceUrl: 'https://megaflex-schaumstoffe.de/en/kontakt-2/einverkauf' },
  ],
  [contactKey('Jack Link’s / Bifi Guben')]: [
    { id: 'bifi-georg-klein', name: 'Georg Klein', designation: 'Plant Manager, Jack Link’s LSI Germany GmbH Guben', role: 'Site leadership and plant/technical routing', emails: ['georg.klein@jacklinks.com'], sourceUrl: 'https://www.guben.de/images/downloads/aktuell/pressemeldungen/2024/20240112_6_Richtfest_Jack_Links_LSI_Germany_GmbH_Werk_Guben.pdf' },
    { id: 'bifi-mateusz-wozniak', name: 'Mateusz Wozniak', designation: 'Plant Manager, Jack Link’s LSI Germany GmbH Guben', role: 'Current site leadership according to 2026 municipal report; personal email not published', sourceUrl: 'https://www.guben.de/images/downloads/Bericht_BM/8.Legislaturperiode/26-05-06_Bericht_SVV_Endfassung.pdf' },
    { id: 'bifi-guben-route', name: 'Jack Link’s LSI Germany — Guben route', designation: 'Official plant route', role: 'Food production and technical-services routing; hydrogen demand not found', emails: ['bewerbung@bifi-karriere.de'], sourceUrl: 'https://www.bifi-karriere.de/' },
  ],
  [contactKey('Bäcker Dreißig')]: [
    { id: 'baecker-dreissig-cornelia', name: 'Cornelia Dreißig', designation: 'Managing Director, Bäckerei Dreißig Management GmbH', role: 'Company leadership; bakery production and energy-routing contact', sourceUrl: 'https://de.wikipedia.org/wiki/B%C3%A4ckerei_Drei%C3%9Fig' },
    { id: 'baecker-dreissig-route', name: 'Bäckerei Dreißig — company route', designation: 'Official company/contact route', role: 'Bakery production; hydrogen process-heat demand not found', sourceUrl: 'https://baeckerei-dreissig.de/kontakt/' },
  ],
  [contactKey('Rock Tech Lithium')]: [
    { id: 'rocktech-henrik-wende', name: 'Henrik Wende', designation: 'Managing Director, Rock Tech Guben GmbH', role: 'Guben converter operational readiness and energy-infrastructure routing', sourceUrl: 'https://rocktechlithium.com/de/contact-2/' },
    { id: 'rocktech-mirco-wojnarowicz', name: 'Mirco Wojnarowicz', designation: 'CEO, Rock Tech Lithium', role: 'Group executive; strategic supply, energy and project-finance routing', sourceUrl: 'https://rocktechlithium.com/en/about-us/' },
    { id: 'rocktech-info', name: 'Rock Tech Lithium — company route', designation: 'Official corporate route', role: 'Guben converter energy and hydrogen partnership routing', emails: ['info@rocktechlithium.com'], phones: ['+1 416 361 3200'], sourceUrl: 'https://rocktechlithium.com/de/contact-2/' },
  ],
  [contactKey('Unylon Polymers')]: [
    { id: 'unylon-status-route', name: 'Unylon Polymers — entity-resolution route', designation: 'Historical Guben PA6 record', role: 'Current operating status and responsible legal entity require confirmation; no current hydrogen contact added', sourceUrl: 'https://www.kunststoffweb.de/firmen/unylon_polymers_gmbh_f103387' },
  ],
  [contactKey('Performance Fibers')]: [
    { id: 'performance-fibers-status-route', name: 'Performance Fibers — entity-resolution route', designation: 'Historical technical-fibre record', role: 'Current Guben operating status and legal entity require confirmation; no current hydrogen contact added', sourceUrl: 'https://www.linkedin.com/company/performance-fibers' },
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
  [contactKey('CropEnergies Bioethanol GmbH')]: {
    description: 'CropEnergies Zeitz is an energy-intensive bioethanol and protein-feed plant with a high-efficiency combined heat and power energy centre. Public company material also places CropEnergies in central-German hydrogen and power-to-X infrastructure discussions, but does not confirm an external hydrogen purchase or a Zeitz fuel-switch project.',
    summary: 'Strong process-heat and hydrogen-infrastructure lead; external hydrogen offtake at Zeitz is not confirmed.',
    primaryClassification: 'Strong process-heat lead; strategic hydrogen potential, external offtake not confirmed',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official plant profile', summary: 'The Zeitz site produces ethanol, protein feed and liquefied CO2 and operates an energy centre with high-efficiency CHP; surplus electricity can be exported.', sourceUrl: 'https://www.cropenergies.com/de/unternehmen/standorte/zeitz', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official company report', summary: 'CropEnergies describes support for central-German hydrogen infrastructure and a green-methanol/power-to-X concept requiring substantial green hydrogen, without confirming external Zeitz offtake.', sourceUrl: 'https://www.cropenergies.com/fileadmin/Resources/CropEnergies/Files/Finanzberichte/2023/Geschaeftsbericht_CropEnergies_2022_23_E_web_geschu__tzt.pdf', verificationStatus: 'Official report reviewed' },
    ],
    sourceUrls: ['https://www.cropenergies.com/de/unternehmen/standorte/zeitz', 'https://www.cropenergies.com/fileadmin/Resources/CropEnergies/Files/Finanzberichte/2023/Geschaeftsbericht_CropEnergies_2022_23_E_web_geschu__tzt.pdf', 'https://www.cropenergies.com/fileadmin/Resources/CropEnergies/Files/Downloads/Broschueren/CE_Flyer_Zeitz_E_Web.pdf'],
  },
  [contactKey('Zellstoff Stendal GmbH')]: {
    description: 'Zellstoff Stendal is a large sulfate-pulp mill in Arneburg with substantial thermal and electrical infrastructure. The WinZell research project studied hydrogen utilisation and power-to-X pathways in the Mercer/Stendal pulp-mill context, but the public evidence is research-stage and does not establish a current external hydrogen procurement requirement.',
    summary: 'Strong industrial process-heat and hydrogen-research lead; current commercial offtake remains unconfirmed.',
    primaryClassification: 'Strong process-heat lead; hydrogen R&D signal, external offtake not confirmed',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'WinZell research project', summary: 'The project analyses how electrolytic hydrogen could be used in pulp mills for sector coupling and power-to-X products, with Mercer Stendal as project partner.', sourceUrl: 'https://www.epe.ed.tum.de/en/res/research/completed-projects/winzell/', verificationStatus: 'Research source reviewed' },
      { evidenceType: 'Public company record', summary: 'A public company record identifies André Listemann as managing director of Zellstoff Stendal Transport GmbH; this is a routing contact and not proof of the pulp mill’s hydrogen purchasing authority.', sourceUrl: 'https://www.zs-transport.de/en/imprint.html', verificationStatus: 'Public record reviewed' },
    ],
    sourceUrls: ['https://www.epe.ed.tum.de/en/res/research/completed-projects/winzell/', 'https://mercerint.com/our-operations/mercer-stendal/', 'https://www.zs-transport.de/en/imprint.html'],
  },
  [contactKey('Mercer Stendal GmbH')]: {
    description: 'Mercer Stendal operates a large NBSK pulp mill with biomass-based power and heat generation, internal energy coverage and grid exports. The WinZell project specifically evaluates electrolytic hydrogen utilisation and power-to-X integration at the mill, but this remains an R&D/sector-coupling pathway rather than confirmed third-party hydrogen offtake.',
    summary: 'Highest-confidence hydrogen-research lead in this batch; qualify the route as self-use/sector coupling until a commercial supply requirement is confirmed.',
    primaryClassification: 'Direct hydrogen-utilisation R&D / self-use signal; commercial external offtake not confirmed',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official mill profile', summary: 'Mercer Stendal reports 740,000 tonnes NBSK capacity, 148 MW green electricity and enough green energy for internal needs plus grid exports.', sourceUrl: 'https://mercerint.com/our-operations/mercer-stendal/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'WinZell project', summary: 'TUM describes hydrogen utilisation in pulp mills, including plant-internal use and potentially saleable products, with Mercer Stendal as partner and Daniel Klüh as contact.', sourceUrl: 'https://www.epe.ed.tum.de/en/res/research/completed-projects/winzell/', verificationStatus: 'Research source reviewed' },
      { evidenceType: 'Biorefinery strategy', summary: 'Mercer identifies hydrogen in its biorefinery pipeline and describes process-energy, CO2 and co-location opportunities at Stendal.', sourceUrl: 'https://mercerint.obataweb.com/our-businesses/biorefinery-products/bioenergy/', verificationStatus: 'Company source reviewed' },
    ],
    sourceUrls: ['https://mercerint.com/our-operations/mercer-stendal/', 'https://www.epe.ed.tum.de/en/res/research/completed-projects/winzell/', 'https://mercerint.obataweb.com/our-businesses/biorefinery-products/bioenergy/'],
  },
  [contactKey('LM Wind Power Goleniów')]: {
    description: 'LM Wind Power Goleniów is a rotor-blade manufacturing plant. Public sustainability reporting confirms factory energy-efficiency and burner/heat-recovery work across LM operations, while the Goleniów sources confirm the plant and its ownership transition to Vestas. No site-specific hydrogen fuel-switch or external hydrogen procurement evidence was found.',
    summary: 'Indirect manufacturing process-heat lead; no target-specific hydrogen demand confirmed.',
    primaryClassification: 'Indirect process-heat lead; hydrogen demand not found',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official sustainability report', summary: 'LM reports plant energy-efficiency projects including heat recovery, improved burner heads and HVAC/process-energy optimisation, but not a Goleniów hydrogen conversion.', sourceUrl: 'https://www.lmwindpower.com/sites/default/files/LM_Sustainability_Report_2023.pdf', verificationStatus: 'Official report reviewed' },
      { evidenceType: 'Official transaction announcement', summary: 'The Goleniów blade factory near Szczecin was announced for transfer from LM Wind Power to Vestas, subject to regulatory approval; current ownership and procurement route should be reconfirmed before outreach.', sourceUrl: 'https://www.gevernova.com/news/press-releases/vestas-lm-wind-power-sign-deal-blades-factory-poland', verificationStatus: 'Official announcement reviewed' },
      { evidenceType: 'Plant leadership source', summary: 'LM identifies Maciej Grzybowski as Plant Director for Goleniów in a public company story.', sourceUrl: 'https://www.lmwindpower.com/en/stories-and-press/stories/Inclusion-and-diversity/leading-with-humanity-in-times-of-crisis', verificationStatus: 'Official company story reviewed' },
    ],
    sourceUrls: ['https://www.lmwindpower.com/sites/default/files/LM_Sustainability_Report_2023.pdf', 'https://www.gevernova.com/news/press-releases/vestas-lm-wind-power-sign-deal-blades-factory-poland', 'https://www.lmwindpower.com/en/stories-and-press/stories/Inclusion-and-diversity/leading-with-humanity-in-times-of-crisis'],
  },
  [contactKey('Bridgestone Stargard')]: {
    description: 'Bridgestone Stargard is a large tyre-manufacturing plant. Bridgestone confirms tyre manufacturing uses steam and fossil fuels in general and says its global strategy includes fuel switching and electrification; Stargard-specific public material confirms green electricity and production consolidation, but not hydrogen use or an external hydrogen procurement plan.',
    summary: 'Strong heat/fuel-switch relevance, but hydrogen demand at Stargard is not publicly confirmed.',
    primaryClassification: 'Strong process-heat lead; fuel-switch strategy but hydrogen demand not confirmed',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official heat strategy', summary: 'Bridgestone states that tyre manufacturing uses steam and fossil-fuel energy and is pursuing fuel switching and electrification to reduce Scope 1 emissions.', sourceUrl: 'https://www.bridgestone.com/responsibilities/environment/reduce_co2/operations/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Stargard plant source', summary: 'Bridgestone identifies Stargard as a Polish truck-and-bus tyre plant with major production capacity and ongoing operations.', sourceUrl: 'https://www.bridgestone.com/corporate/news/2012070602.html', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Local energy decision-maker', summary: 'Exa surfaced Michał Dymek as current Chief Energy Manager at Bridgestone Stargard; only a public LinkedIn profile was found, so no email is inferred.', sourceUrl: 'https://linkedin.com/in/micha%C5%82-dymek-20025493', verificationStatus: 'Professional profile reviewed; email not verified' },
    ],
    sourceUrls: ['https://www.bridgestone.com/responsibilities/environment/reduce_co2/operations/', 'https://www.bridgestone.com/corporate/news/2012070602.html', 'https://www.bridgestone.co.uk/content/bridgestone/gb/en/home-page/stories/sustainability/more-bridgestone-sites-complete-a-100--renewable-futur.html', 'https://linkedin.com/in/micha%C5%82-dymek-20025493'],
  },
  [contactKey('KGHM Polska Miedz / Legnica-area metallurgy')]: {
    description: 'KGHM Legnica is an operating copper smelter and refinery with shaft-furnace smelting, converters, anode furnaces and electrorefining. KGHM publicly reports hydrogen technologies in its climate/energy strategy and a development-stage hydrogen-mixture fire-refining test elsewhere in the group; this supports a strategic industrial hydrogen signal, not a confirmed external hydrogen purchase at Legnica.',
    summary: 'Very strong high-temperature metallurgy and hydrogen-strategy lead; qualify as strategic/self-use potential pending a Legnica-specific fuel and procurement decision.',
    primaryClassification: 'Strong high-temperature process-heat lead; hydrogen strategy/self-use signal, external offtake not confirmed',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official smelter profile', summary: 'KGHM describes Legnica shaft-furnace smelting, converting, fire refining and electrorefining with approximately 122,000 tonnes/year electrolytic copper output.', sourceUrl: 'https://kghm.com/en/our-business/smelting-and-refining/legnica', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Hydrogen and energy-transition report', summary: 'KGHM reports development of hydrogen technologies and a development-stage attempt to use a hydrogen mixture in fire refining within the group.', sourceUrl: 'https://raportcsr2022.kghm.com/en/our-impact-on-the-environment/energy-transition/', verificationStatus: 'Official integrated report reviewed' },
      { evidenceType: 'Climate policy', summary: 'KGHM’s climate policy names hydrogen technologies, process improvement and transition toward own zero-emission energy sources among its decarbonisation methods.', sourceUrl: 'https://kghm.com/sites/default/files/climate_policy_kghm_leaflet_en_2nd_edition.pdf', verificationStatus: 'Official policy reviewed' },
      { evidenceType: 'Local transformation', summary: 'The Legnica smelter is undergoing a Hybrid/Recycling Smelter transformation, creating a strategic point for production, procurement and energy-transition outreach.', sourceUrl: 'https://media.kghm.com/en/news-and-press-releases/statement-of-the-management-board-of-kghm', verificationStatus: 'Official press source reviewed' },
    ],
    sourceUrls: ['https://kghm.com/en/our-business/smelting-and-refining/legnica', 'https://raportcsr2022.kghm.com/en/our-impact-on-the-environment/energy-transition/', 'https://kghm.com/sites/default/files/climate_policy_kghm_leaflet_en_2nd_edition.pdf', 'https://media.kghm.com/en/news-and-press-releases/statement-of-the-management-board-of-kghm'],
  },
  [contactKey('PCK Raffinerie GmbH')]: {
    description: 'PCK Schwedt is an operating refinery that already uses gray hydrogen in refinery processing. Public transformation sources describe replacing that existing hydrogen with green hydrogen, including planned electrolysis and future pipeline supply; this is direct internal refinery use, not a confirmed external third-party offtake.',
    summary: 'Very strong existing-industrial-hydrogen-use lead; current gray-hydrogen baseline and green replacement route are publicly documented.',
    primaryClassification: 'Existing hydrogen use; refinery feedstock replacement and planned green-hydrogen procurement',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official refinery source', summary: 'PCK operates an integrated refinery producing fuels, power and steam at Schwedt.', sourceUrl: 'https://www.pck.de/en/company', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Government task-force source', summary: 'Brandenburg states that PCK commissioned Siemens Energy planning for an electrolyser intended initially to replace gray hydrogen produced from natural gas with green hydrogen.', sourceUrl: 'https://brandenburg.de/cms/detail.php/bb1.c.759449.de', verificationStatus: 'Government source reviewed' },
      { evidenceType: 'Technical transformation study', summary: 'TransHyDE analysis documents current refinery hydrogen use, including gas-based hydrogen in crude-oil processing and a material hydrogen requirement for the Schwedt site.', sourceUrl: 'https://www.cines.fraunhofer.de/content/dam/zv/cines/dokumente/publikationen/energiesystem/20221123_TransHyDE_Policy_Paper_Raffinerie_Schwedt.pdf', verificationStatus: 'Research source reviewed' },
    ],
    sourceUrls: ['https://www.pck.de/en/company', 'https://brandenburg.de/cms/detail.php/bb1.c.759449.de', 'https://www.cines.fraunhofer.de/content/dam/zv/cines/dokumente/publikationen/energiesystem/20221123_TransHyDE_Policy_Paper_Raffinerie_Schwedt.pdf', 'https://www.pck.de/kontakt'],
  },
  [contactKey('TotalEnergies Raffinerie Mitteldeutschland')]: {
    description: 'TotalEnergies Leuna is a large operating refinery that already consumes hydrogen in refining processes. TotalEnergies and RWE announced a contractual arrangement for approximately 30,000 tonnes/year of green hydrogen for the Leuna refinery from 2030, making this the clearest confirmed future hydrogen procurement signal in this batch.',
    summary: 'Confirmed existing industrial hydrogen use and future green-hydrogen procurement; external supply agreement announced for 2030.',
    primaryClassification: 'Existing hydrogen use; confirmed future green-hydrogen supply agreement',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official refinery profile', summary: 'TotalEnergies describes Leuna as a large crude-oil refinery producing fuels, methanol and other chemical-industry products.', sourceUrl: 'https://totalenergies.de/ueber-uns/standorte/raffinerie-leuna', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official supply agreement', summary: 'RWE states that TotalEnergies will purchase around 30,000 tonnes/year of green hydrogen for the Leuna refinery from 2030.', sourceUrl: 'https://www.rwe.com/en/press/rwe-ag/2025-03-12-rwe-and-totalenergies-agree-long-term-offtake-agreement-for-green-h2/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'TotalEnergies announcement', summary: 'TotalEnergies describes the green-hydrogen partnership with RWE as a decarbonisation route for the Leuna refinery.', sourceUrl: 'https://totalenergies.com/newsroom/germany-totalenergies-and-rwe-join-forces-green-hydrogen-decarbonize-leuna/?lang=eng', verificationStatus: 'Official source reviewed' },
    ],
    sourceUrls: ['https://totalenergies.de/ueber-uns/standorte/raffinerie-leuna', 'https://www.rwe.com/en/press/rwe-ag/2025-03-12-rwe-and-totalenergies-agree-long-term-offtake-agreement-for-green-h2/', 'https://totalenergies.com/newsroom/germany-totalenergies-and-rwe-join-forces-green-hydrogen-decarbonize-leuna/?lang=eng', 'https://totalenergies.de/kontakt'],
  },
  [contactKey('PCC Rokita S.A.')]: {
    description: 'PCC Rokita operates chlor-alkali membrane electrolysis and specialty-chemical production at Brzeg Dolny. Public company material confirms electrolysis-based chlorine production and a hydrogen by-product context; the record supports existing industrial hydrogen production/use in the chemical complex, but not a confirmed external purchase of green hydrogen.',
    summary: 'Strong existing-hydrogen and electrolysis signal; distinguish by-product hydrogen and internal chemical use from external offtake.',
    primaryClassification: 'Existing hydrogen use/production; internal chlor-alkali signal, external offtake not confirmed',
    researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official company profile', summary: 'PCC Rokita describes chlorine and alkali production using a modern membrane electrolysis installation.', sourceUrl: 'https://en.pcc.rokita.pl/about-company/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Chlorine-unit contact record', summary: 'PCC publishes a chlorine-business technologist and an energy-centre route, providing site-specific technical and energy contacts.', sourceUrl: 'https://en.pcc.rokita.pl/reach/contact/', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official contact page', summary: 'PCC publishes chlor-alkali, procurement and energy-centre contacts for the Brzeg Dolny complex.', sourceUrl: 'https://pcc.rokita.pl/dane-kontaktowe/', verificationStatus: 'Official source reviewed' },
    ],
    sourceUrls: ['https://en.pcc.rokita.pl/about-company/', 'https://en.pcc.rokita.pl/reach/contact/', 'https://pcc.rokita.pl/dane-kontaktowe/', 'https://en.pcc.rokita.pl/'],
  },
  [contactKey('PCC Exol S.A.')]: {
    description: 'PCC Exol operates surfactant and specialty-chemical production in Brzeg Dolny and Płock, with reported annual capacity of approximately 144,000 tonnes. Public sources confirm chemical production and major investment, but no target-specific hydrogen procurement or fuel-switch project was found.',
    summary: 'Chemical process-heat lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic process-industry potential; external hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'PCC Exol reports surfactant production in Brzeg Dolny and Płock, more than 290 employees and 144,000 tonnes/year capacity.', sourceUrl: 'https://pcc-exol.eu/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Official investment announcement', summary: 'PCC Exol has operated and expanded chemical production installations at the PCC Rokita site, but the investment record does not identify hydrogen procurement.', sourceUrl: 'https://pcc.eu/en/investment/new-sulfonation-plant-for-pcc-exol-sa-in-brzeg-dolny/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://pcc-exol.eu/', 'https://pcc.eu/en/investment/new-sulfonation-plant-for-pcc-exol-sa-in-brzeg-dolny/', 'https://pcc-exol.eu/de/kontakt/'],
  },
  [contactKey('PCC MCAA Sp. z o.o.')]: {
    description: 'PCC MCAA operates a monochloroacetic-acid plant at the PCC Rokita site in Brzeg Dolny with reported capacity of 50,000 tonnes/year. The process uses chlorine produced within the integrated chemical complex; no external hydrogen procurement or hydrogen fuel-switch project was found.',
    summary: 'Integrated chemical-process lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic process-industry potential; external hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official project profile', summary: 'PCC MCAA describes its MCAA plant, 50,000-tonne/year capacity and integration with PCC Rokita chlorine production.', sourceUrl: 'https://pcc.eu/investition/neue-anlage-zur-produktion-hochreiner-mcaa/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Official company route', summary: 'The PCC Group publishes PCC MCAA as a Polish legal entity and site route.', sourceUrl: 'https://www.pcc.is/about-pcc-worldwide/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://pcc.eu/investition/neue-anlage-zur-produktion-hochreiner-mcaa/', 'https://www.pcc-mcaa.eu/en/', 'https://www.pcc.is/about-pcc-worldwide/'],
  },
  [contactKey('ZPAS S.A. / Nowa Ruda operations')]: {
    description: 'ZPAS operates electrical-prefabrication and industrial-equipment production in Nowa Ruda. Public company material confirms manufacturing halls, powder coating and electrical cabinets, but no hydrogen use, fuel-switch project or external hydrogen procurement.',
    summary: 'Manufacturing lead; hydrogen demand not found.',
    primaryClassification: 'Not found; process-energy potential requires site diligence', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'ZPAS describes Nowa Ruda production facilities for electrical prefabrication, standard products and powder coating.', sourceUrl: 'https://zpasgroup.co.uk/content/11-about-zpas', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://zpasgroup.co.uk/content/11-about-zpas', 'https://zpasgroup.pl/content/11-zpas-o-firmie'],
  },
  [contactKey('3M Wroclaw manufacturing site')]: {
    description: '3M Wrocław is a current Polish manufacturing legal entity with a site at ul. Kowalska 143. Public company material confirms the manufacturing entity and environmental-management framework, but no target-specific hydrogen procurement or fuel-switch project was found.',
    summary: 'Large manufacturing lead; hydrogen demand not found in the public search round.',
    primaryClassification: 'Strategic manufacturing potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company and registry profile', summary: '3M Poland identifies 3M Wrocław as a separate manufacturing legal entity at the Wrocław site.', sourceUrl: 'https://www.3mpolska.pl/3M/pl_PL/firma-pl/o-firmie-3m-pl/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Official sustainability route', summary: '3M identifies environmental-management responsibilities and manufacturing operations in Poland, without a Wrocław hydrogen requirement.', sourceUrl: 'https://www.3mpolska.pl/3M/pl_PL/firma-pl/o-firmie-3m-pl/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://www.3mpolska.pl/3M/pl_PL/firma-pl/o-firmie-3m-pl/'],
  },
  [contactKey('LEIPA Georg Leinfelder GmbH — Mill Schwedt')]: {
    description: 'LEIPA operates a paper mill in Schwedt and is a named cooperation partner in a planned e-SAF project. LEIPA would provide biogenic CO2 from paper production; the evidence supports an e-fuels ecosystem and industrial partnership lead, not a confirmed external hydrogen purchase by the mill.',
    summary: 'Indirect e-fuels/industrial-energy lead; external hydrogen offtake not confirmed.',
    primaryClassification: 'Indirect site/partner signal; external hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [
      { evidenceType: 'Official project announcement', summary: 'LEIPA is described as a cooperation partner in a planned large-scale e-SAF plant in Schwedt and as a source of biogenic CO2 from paper production; no LEIPA hydrogen purchase is stated.', sourceUrl: 'https://www.leipa.com/en/news/detail/planned-large-scale-e-saf-plant-in-schwedt', verificationStatus: 'Official source reviewed' },
      { evidenceType: 'Official supplier route', summary: 'LEIPA publishes a supplier/purchasing route for commercial routing.', sourceUrl: 'https://www.leipa.com/en/for-suppliers', verificationStatus: 'Official source reviewed' },
    ],
    sourceUrls: ['https://www.leipa.com/en/news/detail/planned-large-scale-e-saf-plant-in-schwedt', 'https://www.leipa.com/en/for-suppliers'],
  },
  [contactKey('BUTTING Anlagenbau GmbH & Co. KG')]: {
    description: 'BUTTING Schwedt manufactures tanks, vessels and pipework and provides industrial assembly and service. Public company material does not identify a hydrogen-consuming process, hydrogen procurement project or site-specific fuel-switch requirement.',
    summary: 'Industrial manufacturing lead only; current hydrogen demand not found.',
    primaryClassification: 'Not found; indirect industrial-site lead only', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official site profile', summary: 'The Schwedt site is a metal and equipment manufacturing operation with tanks, vessels, pipework and industrial services; hydrogen demand is not stated.', sourceUrl: 'https://www.butting.com/standorte/schwedt/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://www.butting.com/standorte/schwedt/'],
  },
  [contactKey('Indorama Ventures Fibers Germany / Trevira')]: {
    description: 'Indorama Ventures Fibers Germany / Trevira is a polyester-fibre manufacturing record in Guben. Public corporate material confirms the German Trevira operation and historical manufacturing footprint, but no current target-specific hydrogen procurement, fuel-switch or process-heat conversion was found.',
    summary: 'Polyester manufacturing lead; hydrogen demand not found in public sources.',
    primaryClassification: 'Not found; process-heat potential requires site diligence', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official corporate announcement', summary: 'Indorama Ventures describes the strategic reorganisation of Trevira GmbH in Germany, confirming the entity and business context without a hydrogen-demand commitment.', sourceUrl: 'https://www.indoramaventures.com/en/investor-relations/newsroom/stock-exchange/2305/strategic-reorganization-of-trevira-gmbh-in-germany', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://www.indoramaventures.com/en/investor-relations/newsroom/stock-exchange/2305/strategic-reorganization-of-trevira-gmbh-in-germany'],
  },
  [contactKey('Grupa Azoty ATT Polymers GmbH')]: {
    description: 'ATT Polymers is a Grupa Azoty PA6 producer in Guben. The official company profile confirms polymer production and group relationship, but the research round found no current target-specific hydrogen procurement, fuel-switch project or external supply agreement.',
    summary: 'Chemical/polymer process lead; hydrogen demand not publicly confirmed.',
    primaryClassification: 'Strategic potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'ATT Polymers describes its PA6 production and position within the Grupa Azoty group; no hydrogen requirement is stated.', sourceUrl: 'https://att.grupaazoty.com/en/the-company/about-the-company', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://att.grupaazoty.com/en/the-company/about-the-company'],
  },
  [contactKey('Megaflex Schaumstoff GmbH')]: {
    description: 'Megaflex is an independent polyurethane soft-foam manufacturer in Guben with reported capacity up to 45,000 tonnes/year. Its public material confirms production scale and purchasing routes but does not identify hydrogen use, a fuel-switch project or external hydrogen procurement.',
    summary: 'Energy-intensive manufacturing lead; hydrogen demand not found.',
    primaryClassification: 'Strategic potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'Megaflex describes polyurethane-foam production in Guben and capacity up to 45,000 tonnes/year.', sourceUrl: 'https://megaflex-schaumstoffe.de/en/about-2', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Official purchasing route', summary: 'Megaflex publishes named CEOs for purchasing/sales and a general route; no hydrogen project is stated.', sourceUrl: 'https://megaflex-schaumstoffe.de/index.php/de/kontakt/einverkauf', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://megaflex-schaumstoffe.de/en/about-2', 'https://megaflex-schaumstoffe.de/index.php/de/kontakt/einverkauf'],
  },
  [contactKey('Jack Link’s / Bifi Guben')]: {
    description: 'Jack Link’s LSI Germany operates a new BiFi meat-snack production plant in Guben. Public sources confirm production started in 2024 and that the site has technical and utility roles, but no hydrogen use, fuel-switch project or external hydrogen procurement was found.',
    summary: 'New food-manufacturing process-heat lead; hydrogen demand not found.',
    primaryClassification: 'Strategic potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official plant recruitment site', summary: 'The Guben plant produces BiFi snacks and has a technical/utility team responsible for plant supply systems.', sourceUrl: 'https://www.bifi-karriere.de/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Municipal plant report', summary: 'The Guben municipal report identifies Mateusz Wozniak as the current plant manager in 2026; no hydrogen requirement is stated.', sourceUrl: 'https://www.guben.de/images/downloads/Bericht_BM/8.Legislaturperiode/26-05-06_Bericht_SVV_Endfassung.pdf', verificationStatus: 'Municipal source reviewed' }],
    sourceUrls: ['https://www.bifi-karriere.de/', 'https://www.guben.de/images/downloads/aktuell/pressemeldungen/2024/20240112_6_Richtfest_Jack_Links_LSI_Germany_GmbH_Werk_Guben.pdf', 'https://www.guben.de/images/downloads/Bericht_BM/8.Legislaturperiode/26-05-06_Bericht_SVV_Endfassung.pdf'],
  },
  [contactKey('Bäcker Dreißig')]: {
    description: 'Bäckerei Dreißig is a family-run bakery group with a Guben production/base location. Public sources confirm bakery operations and company leadership but do not identify hydrogen use, hydrogen-ready ovens or external hydrogen procurement.',
    summary: 'Small-to-medium bakery heat lead; hydrogen demand not found.',
    primaryClassification: 'Not found; process-heat potential requires equipment diligence', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'Bäckerei Dreißig describes its bakery history and Guben base; no hydrogen project is stated.', sourceUrl: 'https://baeckerei-dreissig.de/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Official contact page', summary: 'The company publishes the Guben address and contact form; no energy/procurement contact is identified.', sourceUrl: 'https://baeckerei-dreissig.de/kontakt/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://baeckerei-dreissig.de/', 'https://baeckerei-dreissig.de/kontakt/'],
  },
  [contactKey('Rock Tech Lithium')]: {
    description: 'Rock Tech is developing a 24,000-tonnes/year lithium-hydroxide converter in Guben. Public permitting and company sources describe continuous chemical processing with natural-gas and steam utilities, while LEAG and Rock Tech describe a possible future regional green electricity, heat and hydrogen route. This is a strong probable/strategic hydrogen-demand signal, not a confirmed external hydrogen offtake contract.',
    summary: 'Strong future industrial-energy lead with a documented possible hydrogen route; external supply commitment not confirmed.',
    primaryClassification: 'Strong future-demand signal; probable hydrogen/green-energy route, external offtake not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company project page', summary: 'Rock Tech plans a Guben lithium converter producing 24,000 tonnes/year of lithium hydroxide.', sourceUrl: 'https://rocktechlithium.com/en/converter-projects-2/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Regulatory permitting record', summary: 'The permitted process includes calcination, acid roasting, leaching, crystallisation, drying, natural-gas supply and steam utilities; continuous operation is planned.', sourceUrl: 'https://www.uvp-verbund.de/trefferanzeige?docuuid=A2539104-73AF-4CC6-8CBA-294A1EB9539D', verificationStatus: 'Regulatory source reviewed' }, { evidenceType: 'Regional cooperation announcement', summary: 'LEAG and Rock Tech describe possible future hydrogen supply from LEAG’s GigawattFactory and a possible electrolyser at Guben; this is a cooperation/feasibility signal, not a binding hydrogen contract.', sourceUrl: 'https://www.leag.de/de/news/details/lausitzer-lithium-soll-klimaneutral-werden/', verificationStatus: 'Official partner source reviewed' }],
    sourceUrls: ['https://rocktechlithium.com/en/converter-projects-2/', 'https://www.uvp-verbund.de/trefferanzeige?docuuid=A2539104-73AF-4CC6-8CBA-294A1EB9539D', 'https://www.leag.de/de/news/details/lausitzer-lithium-soll-klimaneutral-werden/', 'https://rocktechlithium.com/de/contact-2/'],
  },
  [contactKey('Unylon Polymers')]: {
    description: 'Unylon Polymers is a historical Guben PA6/polymer record associated with Grupa Azoty. Current public evidence confirms the historical entity and production context but does not establish a current operating plant, current hydrogen use or a current procurement route.',
    summary: 'Entity-resolution hold; do not outreach until current operating status is confirmed.',
    primaryClassification: 'Not found; stale or unresolved entity', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Historical company record', summary: 'Public company references identify Unylon Polymers as a Guben PA6 manufacturer acquired by Grupa Azoty, but the current operating status is unresolved.', sourceUrl: 'https://www.kunststoffweb.de/firmen/unylon_polymers_gmbh_f103387', verificationStatus: 'Historical/secondary source reviewed' }, { evidenceType: 'Group logistics source', summary: 'Grupa Azoty references its acquisition of Unylon in Guben in a later logistics-centre announcement; this does not establish current production or hydrogen demand.', sourceUrl: 'https://grupaazoty.com/en/news/grupa-azoty-logistics-centre-opens-in-guben?v=pdf', verificationStatus: 'Official group source reviewed' }],
    sourceUrls: ['https://www.kunststoffweb.de/firmen/unylon_polymers_gmbh_f103387', 'https://grupaazoty.com/en/news/grupa-azoty-logistics-centre-opens-in-guben?v=pdf'],
  },
  [contactKey('Performance Fibers')]: {
    description: 'Performance Fibers is a historical technical-fibre record in the Guben pipeline. Public current company material confirms the global industrial-fibres business, but the research round did not establish a current Guben operating site, current hydrogen use or an external procurement route.',
    summary: 'Entity-resolution hold; current Guben operation must be confirmed before outreach.',
    primaryClassification: 'Not found; stale or unresolved entity', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Current company profile', summary: 'Performance Fibers describes industrial polyester fibres and fabrics globally, but the current Guben site/legal entity is not confirmed.', sourceUrl: 'https://www.linkedin.com/company/performance-fibers', verificationStatus: 'Current corporate profile reviewed' }, { evidenceType: 'Historical site record', summary: 'Historical references associate the Guben fibre operation with Performance Fibers; current operations require direct confirmation.', sourceUrl: 'https://en.wikipedia.org/wiki/Hoechst', verificationStatus: 'Historical/secondary source reviewed' }],
    sourceUrls: ['https://www.linkedin.com/company/performance-fibers', 'https://en.wikipedia.org/wiki/Hoechst'],
  },
  [contactKey('Volvo Buses Wroclaw')]: {
    description: 'The Volvo Buses Wrocław bodybuilding factory was scheduled to close in Q1 2024 and the premises were transferred for reuse by Vargas/Aira. This pipeline record is stale as a Volvo industrial site and is not a current hydrogen-offtake target.',
    summary: 'Closed/divested record; remove from active offtaker outreach and resolve the replacement operator separately.',
    primaryClassification: 'Not found; stale/closed entity', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official Volvo announcement', summary: 'Volvo announced closure of complete-bus production in Wrocław during Q1 2024 and divestment of the premises for reuse.', sourceUrl: 'https://www.volvobuses.com/en/news-stories/press-releases/2023/mar/volvo-buses-changes-business-model-in-europe.html', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Current replacement-site reporting', summary: 'Aira has since used the former factory for heat-pump production, so the pipeline entity should be corrected before any outreach.', sourceUrl: 'https://www.gramwzielone.pl/pompy-ciepla/20328749/150-mln-euro-dla-firmy-produkujacej-pompy-ciepla-w-polsce', verificationStatus: 'Secondary current-status source reviewed' }],
    sourceUrls: ['https://www.volvobuses.com/en/news-stories/press-releases/2023/mar/volvo-buses-changes-business-model-in-europe.html', 'https://www.gramwzielone.pl/pompy-ciepla/20328749/150-mln-euro-dla-firmy-produkujacej-pompy-ciepla-w-polsce'],
  },
  [contactKey('Stelmet S.A. / Zielona Gora-area operations')]: {
    description: 'Stelmet is a wood-product manufacturer in Zielona Góra. Public company material and current professional listings confirm wood-product manufacturing and biomass/pellet-related activity, but no target-specific hydrogen procurement or fuel-switch project was found.',
    summary: 'Wood-processing and drying lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic process-heat potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Current company profile', summary: 'Stelmet is identified as a wood-product manufacturer headquartered in Zielona Góra.', sourceUrl: 'https://www.linkedin.com/company/stelmet-s-a-/', verificationStatus: 'Current profile reviewed' }],
    sourceUrls: ['https://www.linkedin.com/company/stelmet-s-a-/', 'https://www.stelmet.com/'],
  },
  [contactKey('Novita S.A. / textile production')]: {
    description: 'Novita manufactures nonwoven textiles in Zielona Góra. Public sources confirm spunlace and needlepunch production, including drying equipment and energy-efficiency work, but no hydrogen procurement or fuel-switch project was found.',
    summary: 'Textile process-heat lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic process-heat potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'Novita identifies nonwoven production in Zielona Góra and publishes its company route.', sourceUrl: 'https://novita.pl/', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Production-line source', summary: 'The Novita production line includes through-air drying and energy-saving equipment; no hydrogen requirement is stated.', sourceUrl: 'https://www.andritz.com/newsroom-en/nonwoven-and-textile/2020-01-28-novita-group', verificationStatus: 'Supplier source reviewed' }],
    sourceUrls: ['https://novita.pl/', 'https://novita.pl/kontakt/', 'https://www.andritz.com/newsroom-en/nonwoven-and-textile/2020-01-28-novita-group'],
  },
  [contactKey('Pratt & Whitney Kalisz')]: {
    description: 'Pratt & Whitney Kalisz is a large aerospace-component manufacturing plant. Public sources confirm the plant and production role but do not identify hydrogen use, hydrogen-ready furnaces or external hydrogen procurement.',
    summary: 'Metal/aerospace manufacturing lead; hydrogen demand not found.',
    primaryClassification: 'Not found; process-energy diligence required', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official plant profile', summary: 'Pratt & Whitney Kalisz describes itself as a major aerospace production plant in Greater Poland.', sourceUrl: 'https://www.pwk.com.pl/en/home-en-b/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://www.pwk.com.pl/en/home-en-b/'],
  },
  [contactKey('Bosch Goleniów / manufacturing operations')]: {
    description: 'The Bosch Goleniów pipeline record needs current legal-entity and site verification. The research round did not establish a current hydrogen-consuming Bosch plant or public external hydrogen procurement at Goleniów.',
    summary: 'Unresolved site/entity record; do not qualify as an offtaker until the current operating company is confirmed.',
    primaryClassification: 'Not found; entity-resolution hold', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Pipeline record', summary: 'The pipeline names Bosch Goleniów manufacturing operations, but current target-specific company and plant evidence was not located in this research round.', sourceUrl: 'https://www.bosch.pl/', verificationStatus: 'Entity requires confirmation' }],
    sourceUrls: ['https://www.bosch.pl/'],
  },
  [contactKey('Cargill / food processing')]: {
    description: 'The Cargill/Stargard pipeline record points to food and agricultural processing, but the exact legal entity and plant were not established. No target-specific hydrogen use or procurement evidence was found.',
    summary: 'Unresolved site/entity record; exact Cargill operation is required before outreach qualification.',
    primaryClassification: 'Not found; entity-resolution hold', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Pipeline record', summary: 'Cargill is listed as a possible food-processing operation near Stargard, but the exact site and process were not verified.', sourceUrl: 'https://www.cargill.pl/', verificationStatus: 'Entity requires confirmation' }],
    sourceUrls: ['https://www.cargill.pl/'],
  },
  [contactKey('Volkswagen Motor Polska / Polkowice')]: {
    description: 'Volkswagen Motor Polska operates an engine plant in Polkowice. Public sources confirm current production and green-electricity procurement, but no target-specific external hydrogen purchase or hydrogen fuel-switch project was found in this research round.',
    summary: 'Current engine-manufacturing lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic manufacturing potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Official company profile', summary: 'Volkswagen identifies the Polkowice plant as one of the Group’s modern and efficient engine plants.', sourceUrl: 'https://www.volkswagen-newsroom.com/en/volkswagen-motor-polska-sp-z-oo-3741', verificationStatus: 'Official source reviewed' }, { evidenceType: 'Official energy source', summary: 'Volkswagen Poland reports renewable electricity coverage for Volkswagen Motor Polska and other Polish sites; this is not hydrogen demand evidence.', sourceUrl: 'https://www.volkswagen.pl/pl/swiat-volkswagena/aktualnosci/2021/marzec/volkswagen-group-polska-oraz-wszystkie-zaklady-produkcyjne-koncernu-volkswagen.html', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://vwmp.com.pl/', 'https://www.volkswagen-newsroom.com/en/volkswagen-motor-polska-sp-z-oo-3741', 'https://www.volkswagen.pl/pl/swiat-volkswagena/aktualnosci/2021/marzec/volkswagen-group-polska-oraz-wszystkie-zaklady-produkcyjne-koncernu-volkswagen.html'],
  },
  [contactKey('Sandvik / Legnica-area manufacturing')]: {
    description: 'Sandvik is listed in the Legnica-area manufacturing pipeline. Public company routes confirm industrial manufacturing presence, but the exact Polish plant and current hydrogen/process-heat requirement were not established.',
    summary: 'Entity/site-resolution hold; hydrogen demand not confirmed.',
    primaryClassification: 'Not found; entity-resolution hold', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Pipeline/local route', summary: 'The pipeline record identifies Sandvik manufacturing near Legnica, but the exact operating entity and process were not resolved.', sourceUrl: 'https://www.home.sandvik/pl/kontakt/', verificationStatus: 'Current site requires confirmation' }],
    sourceUrls: ['https://www.home.sandvik/pl/kontakt/'],
  },
  [contactKey('Toyota Motor Manufacturing Poland / Walbrzych')]: {
    description: 'Toyota Motor Manufacturing Poland operates engine and transmission production in the Wałbrzych region. Public sources and hydrogen-valley material identify Toyota as a hydrogen-economy stakeholder, but no plant-specific external hydrogen purchase or fuel-switch commitment was found.',
    summary: 'Strategic hydrogen ecosystem lead; plant-specific offtake not confirmed.',
    primaryClassification: 'Indirect hydrogen ecosystem signal; external offtake not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Hydrogen-valley source', summary: 'Toyota Motor Manufacturing Poland is identified as a stakeholder in the Lower Silesian Hydrogen Valley; this is ecosystem evidence, not an offtake contract.', sourceUrl: 'https://arp.pl/en/what-we-do/energy-transformation/hydrogen-valleys/', verificationStatus: 'Public ecosystem source reviewed' }, { evidenceType: 'Industrial-zone source', summary: 'Toyota is identified as a Wałbrzych-area automotive manufacturing investor.', sourceUrl: 'https://invest-park.com.pl/wp-content/uploads/2020/04/Investment-Lands-in-WSEZ.pdf', verificationStatus: 'Zone source reviewed' }],
    sourceUrls: ['https://arp.pl/en/what-we-do/energy-transformation/hydrogen-valleys/', 'https://invest-park.com.pl/wp-content/uploads/2020/04/Investment-Lands-in-WSEZ.pdf'],
  },
  [contactKey('Faurecia / automotive components')]: {
    description: 'Faurecia/Forvia has automotive-component operations in the Wałbrzych and Lower Silesian area. Public sources confirm the industrial footprint and sustainability route, but no plant-specific hydrogen procurement or fuel-switch project was found.',
    summary: 'Automotive-component process-heat lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic manufacturing potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Industrial-zone source', summary: 'Faurecia is identified among automotive-component operations in the Wałbrzych Special Economic Zone.', sourceUrl: 'https://invest-park.com.pl/wp-content/uploads/2020/04/Investment-Lands-in-WSEZ.pdf', verificationStatus: 'Zone source reviewed' }, { evidenceType: 'Corporate sustainability route', summary: 'FORVIA publishes group sustainability information without a Poland-specific hydrogen procurement commitment.', sourceUrl: 'https://www.forvia.com/en', verificationStatus: 'Corporate source reviewed' }],
    sourceUrls: ['https://invest-park.com.pl/wp-content/uploads/2020/04/Investment-Lands-in-WSEZ.pdf', 'https://www.forvia.com/en'],
  },
  [contactKey('NSK Steering Systems Poland')]: {
    description: 'NSK Steering Systems Poland is an automotive-component manufacturing record in the Wałbrzych area. Public sources confirm the site and procurement contacts already held in the application, but no plant-specific hydrogen use or external hydrogen procurement was found.',
    summary: 'Automotive-component manufacturing lead; hydrogen demand not confirmed.',
    primaryClassification: 'Strategic manufacturing potential; hydrogen demand not confirmed', researchStatus: 'needs_source_verification', signalDate: '2026-10-16',
    evidence: [{ evidenceType: 'Industrial-zone source', summary: 'NSK is identified among steering-system component manufacturers in the Wałbrzych Special Economic Zone.', sourceUrl: 'https://invest-park.com.pl/wp-content/uploads/2020/04/Investment-Lands-in-WSEZ.pdf', verificationStatus: 'Zone source reviewed' }, { evidenceType: 'Official locations route', summary: 'NSK publishes Poland locations and corporate routes; no hydrogen requirement is stated.', sourceUrl: 'https://www.nsk.com/locations/', verificationStatus: 'Official source reviewed' }],
    sourceUrls: ['https://invest-park.com.pl/wp-content/uploads/2020/04/Investment-Lands-in-WSEZ.pdf', 'https://www.nsk.com/locations/'],
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
  'bewerbung@bifi-karriere.de': { status: 'safe', deliverable: true, checkedAt: '2026-10-16' },
  'biuro@investparkbialogard.pl': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'burkhard.reuss@totalenergies.com': { status: 'safe', deliverable: true, checkedAt: '2026-10-16' },
  'd.loehr@megaflex-schaumstoffe.de': { status: 'safe', deliverable: true, checkedAt: '2026-10-16' },
  'georg.klein@jacklinks.com': { status: 'catch_all', deliverable: false, checkedAt: '2026-10-16' },
  'grzegorz.sulowski@pcc.eu': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'info-kostrzyn@arcticpaper.com': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'info.ms@mercerint.com': { status: 'catch_all', deliverable: false, checkedAt: '2026-10-16' },
  'info@butting-schwedt.de': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16' },
  'info@cropenergies.de': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16' },
  'info@megaflex-schaumstoffe.de': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16' },
  'info@pck.de': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16' },
  'info@rocktechlithium.com': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16' },
  'info@verbio.de': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'konrad.bobrowski@arcticpaper.com': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'luvena@luvena.pl': { status: 'safe', deliverable: true, checkedAt: '2026-10-16' },
  'michael.bluoss@butting-schwedt.de': { status: 'safe', deliverable: true, checkedAt: '2026-10-16' },
  'michal.jarczynski@arcticpaper.com': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'novita@novita.com.pl': { status: 'safe', deliverable: true, checkedAt: '2026-10-16' },
  'oferty@pcc.eu': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'purchase@leipa.com': { status: 'role_account', deliverable: true, checkedAt: '2026-10-16' },
  'slawomir.gralak@arcticpaper.com': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'zakupy.rokita@pcc.eu': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'zarzad_exol@pcc.eu': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
  'zbigniew.wesolowski@arcticpaper.com': { status: 'unknown', deliverable: false, checkedAt: '2026-10-16' },
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

export function hydrogenLocalContacts(company) {
  try { const local = JSON.parse(localStorage.getItem(`hydrogen-offtaker:contacts:v1:${contactKey(company)}`)); return Array.isArray(local) ? local : []; } catch { return []; }
}

export function saveHydrogenContacts(company, contacts) {
  localStorage.setItem(`hydrogen-offtaker:contacts:v1:${contactKey(company)}`, JSON.stringify(contacts));
}
