// Research checkpoint, 22 October 2026. Published identities/routes are NOT
// deliverability checks, person-email verification, or confirmed JV mandates.
export const researchedAt = '2026-10-22';
const route = (email,source,type='Generic company route',status='Published corporate routing only; not the named person’s own email. No delivery check performed.') => ({email,source,type,status});
const person = (name,title,role,source,extra={}) => ({name,title,role,source,...extra});
const sermManagement='https://www.sermsang.com/en/management/';
const sermContact='https://www.sermsang.com/en/contact/';
const acenManagement='https://www.acenrenewables.com/about-us/board-of-directors/';
const acenContact='https://www.acenrenewables.com/investors/';
const ixContact='https://www.ixrenewables.com/en/contact';
const ixProject='https://www.ixrenewables.com/en/news/ix-renewables-and-asia-cement-corporation-join-forces-to-sign-cooperation-agreement-for-rui-li-1-floating-offshore-wind-project';
const mercuryContact='https://mercuryrenewables.ie/contact-us/';
const mercuryPlanning='https://www.pleanala.ie/publicaccess/EIAR-NIS/317560/Environmental/Volume%20II%20Environmental%20Impact%20Assessment%20Report/1.%20Chapter%201%20-%20Introduction.pdf';
const ggContact='https://greengenius.com/pl/kontakty/';
const somevaTeam='https://www.somevarenewables.com.au/about-someva/';
const somevaContact='https://www.somevarenewables.com.au/contact/';
const somevaHearing='https://www.ipcn.nsw.gov.au/sites/default/files/2025-05/Applicant%20meeting%20transcript_1.pdf';
const sembTeam='https://www.sembcorp.com/about-us/our-leadership/';
const sembIR='https://www.sembcorp.com/media/yrcplozn/sci-investor-presentation-nov-2025.pdf';
const arraRegister='https://find-and-update.company-information.service.gov.uk/company/16474136/officers';
const arraContact='https://www.arra.energy/privacy';
const aboManagement='https://www.aboenergy.com/en/company/managing-board.html';
const aboIR='https://www.aboenergy.com/media/pdf/flyer/IR-Presentation.pdf';
const aboSales='https://www.aboenergy.com/en/company/project-sales.html';
const windonJV='https://news.cision.com/se/windon/r/windon-energy-group-ab-ingar-aktieagaravtal-om-bildande-av-joint-venture-for-modular-vindkraftstekno,c4309195';
const iberTeam='https://www.iberdrola.com/about-us/management-team/executives';
const iberIR='https://www.iberdrola.com/accionistas-inversores';

const newProviders=['ChatGPT web search','Exa','Firecrawl — official websites'];
const socialLimit='LinkedIn findings are publicly indexed research, not a successful live profile/post retrieval. Firecrawl does not support LinkedIn; no private reading activity is accessible. Social activity alone is not an acquisition mandate.';
const navContact='https://navarisenergy.com/';
const eweContact='https://eurowindenergy.com/contact';
const vsbContact='https://www.vsb.energy/de/de/kontakt/';
const wpdContact='https://www.wpd.de/impressum/';
const eefContact='https://www.eef.de/en/contact';
export const partnerContactResearch = {
 'alcazar-energy':{
  rounds:4,providers:newProviders,corporateRoutes:[route('info@alcazarenergy.com','https://alcazarenergy.com/contact/')],
  conclusion:'Western Balkan capital deployment evidenced; new external-project acceptance unconfirmed. Official team headings confirm current roles; older biography text may lag promotions. LinkedIn is indexed-only; no outreach.',
  contacts:[
   person('Daniel Calderon','Co-Founder & Managing Partner','Executive investment/JV introduction','https://alcazarenergy.com/team/',{linkedin:'https://www.linkedin.com/in/daniel-calderon1',emails:[route('dcalderon@alcazarenergy.com','https://disclosures.ifc.org/project-detail/SII/46314/alcazar-energy-partners-ii-scsp','Published business email — dated institutional source','IFC publishes this named route; current receipt requires Reoon and identity review.')],phone:'+971 4 422 9606',phoneSource:'https://disclosures.ifc.org/project-detail/SII/46314/alcazar-energy-partners-ii-scsp',caveats:[socialLimit]}),
   person('Tim Sheahan','Associate Partner','Investment/project-finance and Stip sponsor contact','https://alcazarenergy.com/team/',{linkedin:'https://www.linkedin.com/in/tim-sheahan-94138146/',emails:[route('tsheahan@alcazarenergy.com','https://www.ebrd.com/home/work-with-us/projects/psd/56032.html','Published business email','EBRD names Tim as the sponsor company contact for Stip.')],caveats:['Official heading and public profile say Associate Partner; older body copy still says Principal. Latest heading is used.',socialLimit]}),
   person('Daniel Lancha','Partner','Investment and regional execution introduction','https://alcazarenergy.com/team/',{linkedin:'https://www.linkedin.com/in/daniel-lancha-4aa8b637'}),
   person('Piotr Woloszczenko','Principal, Investment Team','Origination and execution of investments','https://alcazarenergy.com/team/',{linkedin:'https://www.linkedin.com/in/piotrwoloszczenko/'}),
   person('Enrico Casari','Principal, Investment Team','Origination and investment monitoring','https://alcazarenergy.com/team/',{linkedin:'https://www.linkedin.com/in/enricocasari'})
  ]
 },
 'fortis-energy':{
  rounds:4,providers:newProviders,corporateRoutes:[route('info@fortisenergy.com','https://www.fortisenergy.com/en/group-companies')],
  conclusion:'Regional investment intent and Serbian wind development evidenced. Corporate route serves the CEE office covering Serbia, North Macedonia and Bosnia. No external project acceptance or Bosnian wind mandate confirmed.',
  contacts:[
   person('Velimir Gavrilović','Chief Operational Officer','CEE investment and development introduction','https://balkangreenenergynews.com/velimir-gavrilovic-fortis-energy-we-are-developing-huge-portfolio-in-see/',{linkedin:'https://www.linkedin.com/in/velimir-gavrilovic-74744559',caveats:[socialLimit]}),
   person('Ivan Radovic','Head of Project Finance — public profile','Project finance and investment structuring introduction','https://www.linkedin.com/in/ivan-radovic-4346996',{linkedin:'https://www.linkedin.com/in/ivan-radovic-4346996',caveats:['Public-profile appointment; confirm current remit.',socialLimit]}),
   person('Furkan Kol','Business Development Specialist — public profile','Local developer and commercial routing','https://www.linkedin.com/in/furkan-kol',{linkedin:'https://www.linkedin.com/in/furkan-kol',caveats:['Business-development route, not established equity approval authority.',socialLimit]}),
   person('Burak Yıldırım','Published Fortis representative — chamber directory','North Macedonia company introduction; executive title unconfirmed','https://ematto.mk/Public/Members/Details/Default.cshtml/?company=FORTIS+ENERGY&id=53',{emails:[route('burak.yildirim@uck.com.tr','https://ematto.mk/Public/Members/Details/Default.cshtml/?company=FORTIS+ENERGY&id=53','Published business email — chamber directory','Member directory publishes this group-domain address; current affiliation and receipt need confirmation.')],caveats:['Directory does not establish a C-level title. Preserve group-domain route separately from Fortis corporate inbox.']})
  ]
 },
 'windey-energy':{
  rounds:4,providers:newProviders,corporateRoutes:[route('europe@windeyenergy.com','https://windeyenergy.com/en/about_contact.html','Shared Serbian/European corporate route'),route('overseas@windeyenergy.com','https://windeyenergy.com/en/about_contact.html','Shared international corporate route')],phone:'+86 571 87397666',
  conclusion:'Fintel-specific Serbian equity strategy evidenced by September 2026 agreement. No funded amount, closed shareholding, external-project invitation or Bosnia mandate established.',
  contacts:[
   person('Cheng Chenguang','General Manager','Executive strategic partnership escalation','https://windeyenergy.com/en/news_show?id=225'),
   person('Yuhang Qi','Investment and development — public profile','Investment-team introduction; profile location Sarajevo does not establish a country investment mandate','https://www.linkedin.com/in/yuhang-qi-338824224',{linkedin:'https://www.linkedin.com/in/yuhang-qi-338824224',caveats:['Current authority/region needs confirmation through company office.',socialLimit]}),
   person('Kaya Dülek','Business Development Director — public profile','Regional commercial/partnership routing; equity authority unconfirmed','https://www.linkedin.com/in/kaya-d%C3%BClek-0b204b25',{linkedin:'https://www.linkedin.com/in/kaya-d%C3%BClek-0b204b25',caveats:[socialLimit]})
  ]
 },
 'cwp-europe':{
  rounds:4,providers:newProviders,corporateRoutes:[route('office.serbia@cwp.global','https://www.cwp.eu/contact-us','Shared Serbia office route'),route('office.romania@cwp.global','https://www.cwp.eu/contact-us','Shared Romania office route')],phone:'+381 11 785 0020',
  conclusion:'Regional wind development/investment evidenced in Albania, Bulgaria and Serbia. Montenegro announcement is solar/storage. External acquisition mandate and project-specific JV availability require confirmation.',
  contacts:[
   person('Dimitar Enchev','Chief Executive Officer, CWP Europe','Executive regional wind investment introduction','https://www.cwp.eu/news/cwp-europe-and-the-european-commission-to-advance-renewable-energy-in-albania-and-montenegro',{linkedin:'https://www.linkedin.com/in/dimitar-enchev-7553455'}),
   person('Maja Turković','Executive Vice President','Western Balkan development and partnership introduction','https://www.cwp.eu/news/cwp-europe-and-the-european-commission-to-advance-renewable-energy-in-albania-and-montenegro',{linkedin:'https://www.linkedin.com/in/maja-turkovic-736747',findings:[{text:'Indexed April 2026 post invites regional energy-transition discussions at Adria Future Summit; not a specific buying commitment.',source:'https://www.linkedin.com/posts/maja-turkovic-736747_happy-to-be-part-of-adria-future-summit-2026-activity-7452400098157879296-eoQI'}],caveats:['Same-name marketing professional excluded.',socialLimit]}),
   person('Viktor Garbev','Executive Vice President','Regional executive partnership introduction','https://www.cwp.eu/news/cwp-europe-and-the-european-commission-to-advance-renewable-energy-in-albania-and-montenegro'),
   person('Simeon Todorov, CFA','Head of Financial Analytics — public profile','Financial evaluation and internal investment routing','https://bg.linkedin.com/in/simeon-todorov-cfa',{linkedin:'https://bg.linkedin.com/in/simeon-todorov-cfa',caveats:[socialLimit]}),
   person('Nikola Miladinovic','Project Manager — public profile','Serbian wind-development technical routing','https://www.linkedin.com/in/nikola-miladinovic-161905226',{linkedin:'https://www.linkedin.com/in/nikola-miladinovic-161905226',caveats:['Project management, not investment approval authority.',socialLimit]})
  ]
 },
 'rezolv-energy':{
  rounds:4,providers:newProviders,corporateRoutes:[route('info@rezolv.energy','https://rezolv.energy/contact/')],phone:'+420 227 316 222',
  conclusion:'Current official team page confirms CEO, CIO, CFO, COO and country managers. Wind investment evidence is strongest in Romania; Bulgarian operating example is solar. Do not infer a Bosnian buying mandate.',
  contacts:[
   person('Alastair Hammond','Chief Executive Officer','Executive wind partnership and investment escalation','https://rezolv.energy/team/',{linkedin:'https://www.linkedin.com/in/alastair-hammond',caveats:[socialLimit]}),
   person('Bernard Kiernan','Chief Investment Officer','Primary acquisition and investment introduction','https://rezolv.energy/team/',{linkedin:'https://www.linkedin.com/in/bernard-kiernan-a0765721'}),
   person('Magda Nelešovská','Chief Financial Officer','Financing, M&A and capital-structure introduction','https://rezolv.energy/team/'),
   person('Martin Langham','Chief Operating Officer','Development-to-operation and execution introduction','https://rezolv.energy/team/',{linkedin:'https://www.linkedin.com/in/martin-langham-fiet-a6269611'}),
   person('Jennifer Boca','Chief Sustainability Officer','ESG and environmental/social diligence','https://rezolv.energy/team/'),
   person('Marian Pavel','Country Manager Romania','Romanian wind project and acquisition routing','https://rezolv.energy/team/'),
   person('Gergana Sazlaykova','Country Manager Bulgaria','Bulgarian platform introduction; wind mandate unconfirmed','https://rezolv.energy/team/')
  ]
 },
 'navaris':{
  rounds:3,providers:newProviders,corporateRoutes:[route('info.berlin@navarisenergy.com',navContact)],phone:'+49 30 863 2362 20',
  conclusion:'Germany-focused wind acquisition/cooperation invitation verified on the live transaction page. Navaris is the renamed German Qualitas platform, not an additional independent Qualitas buyer. Parent Fund VI activity must not be conflated with Navaris project acceptance.',
  contacts:[
   person('Johannes Overbeck','Chief Executive Officer, Navaris','Executive acquisition and development partnership introduction',navContact,{linkedin:'https://www.linkedin.com/in/johannes-overbeck-cfa-79555718',findings:[{text:'Publicly indexed September 2026 post announces Navaris and its development platform; not a project-specific investment commitment.',source:'https://www.linkedin.com/posts/johannes-overbeck-cfa-79555718_navaris-activity-7506269884499181569-_o20'}],caveats:[socialLimit]}),
   person('Adrián Cabrejas Azagra','Partner, Germany and Poland — Qualitas Energy parent group (public profile)','Parent investment-origination / SPA / JV introduction; not established as Navaris operating management','https://www.linkedin.com/in/adriancabrejas',{linkedin:'https://www.linkedin.com/in/adriancabrejas',confidence:'Public-profile role; current remit and Navaris routing unresolved',findings:[{text:'Indexed October 2026 group repost concerns German investment scale-up. It does not establish a Navaris mandate or direct project allocation.',source:'https://www.linkedin.com/posts/qualitas-energy-global_qualitas-plans-german-scale-up-pfi-activity-7515681539389583360-MQby'}],caveats:['Navaris corporate inbox is an indirect introduction, not this parent-group partner’s personal mailbox.',socialLimit]})
  ]
 },
 'eurowind-energy':{
  rounds:3,providers:newProviders,corporateRoutes:[route('info-de@eurowindenergy.com',eweContact,'Shared Germany corporate route'),route('info@ewe.dk',eweContact,'Shared group corporate route')],phone:'+49 40 85382777-0',
  conclusion:'Company-issued release dated 6 May 2026 explicitly seeks cooperation partners, wind projects at all permitting stages and operating wind farms in Germany. Verify current criteria directly before treating a particular project as eligible.',
  contacts:[
   person('David Christopher Stahl','Managing Director Germany','Primary Germany acquisition/cooperation escalation','https://www.renewablepress.com/energy/press-release-8815-eurowind-energy-and-blackstone-at-full-throttle',{findings:[{text:'Named speaker explicitly seeking wind-project and operating-wind-farm opportunities in the 6 May 2026 company release.',source:'https://www.renewablepress.com/energy/press-release-8815-eurowind-energy-and-blackstone-at-full-throttle'}],caveats:['No attributable personal LinkedIn URL established in this bounded search; do not substitute another person’s profile.']}),
   person('Jeppe Udby','Chief Development Officer','Group development and hybrid/wind partnership introduction',eweContact,{linkedin:'https://www.linkedin.com/in/jeppe-udby-3b937044',findings:[{text:'Indexed October 2026 public post about the Renalfa partnership discusses expanding a hybrid platform to include wind; not confirmation of our project’s acceptance.',source:'https://www.linkedin.com/posts/jeppe-udby-3b937044_renalfa-eurowind-activity-7512186496360292352-MHSs'}],caveats:['Germany inbox is a shared country introduction, not Jeppe’s individual mailbox.',socialLimit]}),
   person('Armin Liese','Published Eurowind media contact','Media/referral only — not the acquisition decision-maker','https://www.renewablepress.com/energy/press-release-8815-eurowind-energy-and-blackstone-at-full-throttle',{emails:[route('arli@eurowindenergy.com','https://www.renewablepress.com/energy/press-release-8815-eurowind-energy-and-blackstone-at-full-throttle','Published media business email','Company-issued release names this media contact; not a commercial mandate or delivery check.')],phone:'+49 151 20848451',caveats:['Use the German corporate desk for acquisition proposals. Media contact retained as a clearly labelled referral only.']})
  ]
 },
 'vsb-group':{
  rounds:3,providers:newProviders,corporateRoutes:[route('info@vsb.energy',vsbContact)],phone:'+49 351 21183 400',
  conclusion:'Live German website explicitly invites wind-project purchases and joint ventures. Thomas Winkler’s German managing-director role is supported by a July 2026 company release. Do not use former group CEO Felix Grolman as current leadership.',
  contacts:[
   person('Thomas Winkler','Managing Director, VSB Germany','Executive German JV/acquisition introduction','https://www.vsb.energy/de/en/newsroom/press/press-detail/vsb-germany-successfully-completes-expansion-of-the-vockenrod-wind-farm/',{linkedin:'https://www.linkedin.com/in/thomas-winkler-83a06644',findings:[{text:'Indexed February 2026 personal post discusses the Elster wind project and delivery; not a new buying invitation.',source:'https://www.linkedin.com/posts/thomas-winkler-83a06644_it-was-a-great-honour-to-participate-in-the-activity-7432858540219949056-nIW_'}],caveats:[socialLimit]}),
   person('Finn Wöbking','Head of M&A, Repowering and Cooperations — public profile','Target functional acquisition/cooperation lead','https://www.linkedin.com/in/finn-w%C3%B6bking-a41087147',{linkedin:'https://www.linkedin.com/in/finn-w%C3%B6bking-a41087147',confidence:'Public-profile title; present appointment should be confirmed with VSB',caveats:['No relevant public personal acquisition post established. No published individual email found.',socialLimit]})
  ]
 },
 'wpd':{
  rounds:3,providers:newProviders,corporateRoutes:[route('info@wpd.de',wpdContact)],phone:'+49 421 16866-10',
  conclusion:'wpd onshore GmbH & Co. KG publishes a German acquisition/cooperation invitation from initial idea to fully permitted development. Personal functional roles are public-profile sourced; no fresh personal acquisition post was established.',
  contacts:[
   person('Rami Ramadan','Cooperation management / national portfolio — public profile','German cooperation and developer-partnership introduction','https://www.linkedin.com/in/rami-ramadan-7b213b224',{linkedin:'https://www.linkedin.com/in/rami-ramadan-7b213b224',caveats:['Relevant public industry activity is not evidence of reading behaviour, endorsement or a personal investment mandate.',socialLimit]}),
   person('Markus Twardzik','Senior Project Manager — project purchases and cooperation (public profile)','Functional wind-project acquisition/cooperation introduction','https://www.linkedin.com/in/markus-twardzik-79581b98',{linkedin:'https://www.linkedin.com/in/markus-twardzik-79581b98',caveats:[socialLimit]}),
   person('Andreas Bürkle','Project acquisition, onshore wind — public profile','Project acquisition desk introduction','https://www.linkedin.com/in/andreas-b%C3%BCrkle-bb50a72a2',{linkedin:'https://www.linkedin.com/in/andreas-b%C3%BCrkle-bb50a72a2',caveats:[socialLimit]})
  ]
 },
 'eef':{
  rounds:3,providers:newProviders,corporateRoutes:[route('info@eef.de','https://eef.de/haeufige-fragen/wer-ist-eef-und-welche-vision-verfolgt-das-unternehmen')],phone:'+49 30 3434659-04',
  conclusion:'Official developer partnership page invites tailored cooperation; official contact directory publishes named work emails for development, investments, finance and managing directors. Germany-focused mandate; email delivery and specific investment approval remain unverified.',
  contacts:[
   person('Florian Rosenbusch','Director of Project Development, Networks & Construction','Primary developer-partnership and wind-project introduction',eefContact,{linkedin:'https://www.linkedin.com/in/florian-rosenbusch-746312128/',emails:[route('florian.rosenbusch@eef.de',eefContact,'Published business email','Official directory attributes this work address to Florian; no delivery verification.')],phone:'+49 30 3434659-20',findings:[{text:'Indexed September 2026 WindEnergy Hamburg post invites meetings with existing partners and new contacts.',source:'https://www.linkedin.com/posts/florian-rosenbusch-746312128_in-zwei-wochen-ist-es-wieder-so-weit-windenergy-activity-7503338974636171264-jmAz'}],caveats:[socialLimit]}),
   person('Hajo Kallsen','Director of Investments','Primary investment and acquisition introduction',eefContact,{emails:[route('hajo.kallsen@eef.de',eefContact,'Published business email','Official directory attribution; no delivery verification.')],phone:'+49 40 2530549-07'}),
   person('Nigel Nyirenda','Managing Director & Partner','Executive partnership and investment escalation',eefContact,{linkedin:'https://www.linkedin.com/in/nigel-nyirenda-7332782b2',emails:[route('nigel.nyirenda@eef.de',eefContact,'Published business email','Official directory attribution; no delivery verification.')],phone:'+49 30 3434659-10'}),
   person('Niklas Hinz','Managing Director & Partner','Executive partnership and investment escalation',eefContact,{emails:[route('niklas.hinz@eef.de',eefContact,'Published business email','Official directory attribution; no delivery verification.')],phone:'+49 30 3434659-12'}),
   person('Joest Bunse, CFA','Director of Project Finance & Asset Management','Investment structuring, financing and asset diligence',eefContact,{linkedin:'https://www.linkedin.com/in/joest-bunse-cfa-abab96253',emails:[route('joest.bunse@eef.de',eefContact,'Published business email','Official directory title supersedes shorter indexed financing title; no delivery verification.')],phone:'+49 30 3434659-14'}),
   person('Leonie Neef','Project management strategic cooperation','Operational strategic-partnership introduction',eefContact,{emails:[route('leonie.neef@eef.de',eefContact,'Published business email','Official directory attribution; no delivery verification.')],phone:'+49 30 3434659-41'})
  ]
 },
 'sermsang-power':{
  rounds:3,corporateRoutes:[route('ir@sermsang.co.th',sermContact),route('info@sermsang.co.th',sermContact)],phone:'+66 2 628 0991-2 ext. 165',
  conclusion:'CEO, COO, deputy CEO and CFO supported by official management and the 2025 sustainability report. Existing Bago investment activity is not an invitation for an additional JV partner.',
  contacts:[
   person('Varut Tummavaranukub','Chief Executive Officer; Acting Chief Strategy Officer','Executive investment/strategy escalation',sermManagement),
   person('Passakorn Panyaratanakorn','Chief Operating Officer','Operational and Bago project escalation',sermManagement),
   person('Chayut Leehacharoenkul','Chief Financial Officer','Project finance, financial diligence and capital-structure routing',sermManagement,{findings:[{text:'IFC’s Sermsang Wind disclosure names Chayut as CFO and publishes an alternative company address, infor@sermsang.co.th; retain the exact spelling, not a guessed correction.',source:'https://disclosures.ifc.org/project-detail/SII/49587/sermsang-wind'}],emails:[route('infor@sermsang.co.th','https://disclosures.ifc.org/project-detail/SII/49587/sermsang-wind','Published project/company route','IFC-published project contact address; unusual infor spelling retained exactly. Not a personal email; current delivery untested.')]}),
   person('Thantaporn Kraipisitkul','Deputy Chief Executive Officer','Senior financial/strategic escalation','https://sustainability.sermsang.com/en/document/viewer/180/sustainability-reports-2025')
  ]
 },
 'acen':{
  rounds:3,corporateRoutes:[route('investorrelations@acenrenewables.com',acenContact)],phone:'+63 2 7730 6300',
  conclusion:'Official leadership and Philippine exchange records support the investment, development and finance decision-maker map. Route investment proposals through the corporate office; no new third-party JV opening confirmed.',
  contacts:[
   person('Eric Francia','President and Chief Executive Officer','Executive sponsor for strategic partnerships',acenManagement),
   person('Patrice Clausse','Group Chief Investment Officer; President and CEO of ACEN Investments','Primary investment/JV decision route',acenManagement,{linkedin:'https://ph.linkedin.com/in/patriceclausse'}),
   person('Jonathan Back','Group Chief Finance Officer and Group Chief Strategy Officer','Financing, valuation and strategic structure',acenManagement),
   person('Jose Maria Zabaleta','Group Chief Operating Officer and Group Chief Development Officer','Project development and delivery partnership escalation',acenManagement),
   person('Miguel de Jesus','Managing Director, Philippines','Philippine country/project introduction','https://careers.acenrenewables.com/content/About-Us/?locale=en_US')
  ]
 },
 'terrawind':{
  rounds:3,corporateRoutes:[route('info@terrawind.co.jp','https://terrawindrenewables.squarespace.com/privacy-policy')],phone:'+81 3 4330 8710',
  conclusion:'Official 2026 project notices confirm Oliver Senter as representative director. Thomas Pelofi’s professional profile reports CIO appointment from June 2026; no published direct executive email found.',
  contacts:[
   person('Oliver Senter','Representative Director','Executive approval and APAC wind partnerships','https://www.terrawind.co.jp/',{linkedin:'https://jp.linkedin.com/in/oliver-senter-51b6a240'}),
   person('Thomas Pelofi','Chief Investment Officer — professional-profile confirmation','Acquisitions, financing and investment assessment','https://jp.linkedin.com/in/thomas-pelofi-82672b7',{linkedin:'https://jp.linkedin.com/in/thomas-pelofi-82672b7',confidence:'Medium — self-reported current role',caveats:['LinkedIn reports appointment from June 2026; no direct person-email or company management-page confirmation found.']}),
   person('Ryan Chua','Senior Managing Director, Stonepeak — sponsor-side contact','Sponsor-side introduction only; not a TerraWind employee','https://www.terrawind.co.jp/',{corporateRoutes:[],caveats:['Named in TerraWind’s March 2024 investment announcement. Historical sponsor context; current role and contact route require refresh.'],roleStatus:'Historical sponsor-side reference'})
  ]
 },
 'ix-renewables':{
  rounds:3,corporateRoutes:[route('info@ixrenewables.com',ixContact),route('RL1inquiry@ixrenewables.com','https://www.ixrenewables.com/en/news/rui-li-1-offshore-wind-project-announces-strategic-partnership-with-gf-corp','Shared Rui-Li 1 project route')],phone:'+31 88 88 60 888',
  conclusion:'Company website confirms the CEO and Taiwan representative; Rui-Li announcements provide a dedicated project inbox and a named press contact. Those routes do not prove an unallocated equity/JV mandate.',
  contacts:[
   person('Eric Kamphues','Chief Executive Officer','Executive and project-partnership escalation','https://www.ixrenewables.com/en/about-us'),
   person('Lars Hummel','Country Representative, Taiwan','Local developer/partner introduction',ixContact,{phone:'+886 2 2704 9292 ext. 1150',corporateRoutes:[route('taiwan@ixrenewables.com',ixContact,'Shared Taiwan office route')]}),
   person('Queena Lin','Published press contact for Rui Li 1 cooperation announcement','Communications/referral only, not a confirmed investment decision-maker',ixProject,{emails:[route('queena.lin@ixrenewables.com',ixProject,'Published business email','Company announcement attributes this work address to Queena Lin. No delivery check performed.')],phone:'+886 953 810 188'}),
   person('Masatomo Kono','Senior Project Manager, Japan','Japanese project/technical routing, not C-level',ixContact,{phone:'+81 3 6871 8571',corporateRoutes:[route('japan@ixrenewables.com',ixContact,'Shared Japan office route')]})
  ]
 },
 'pc1-group':{
  rounds:4,corporateRoutes:[route('ir@pc1group.vn','https://www.pc1group.vn/store/uploads/2025/04/web-ta.pdf','Published investor-relations route — dated source','Published in a 2025 company meeting notice; current delivery and recipient require confirmation.')],
  conclusion:'July 2026 appointment disclosure supersedes the old leadership list. Former leaders are retained and labelled historical. New appointments are supported by the company notice relayed by HOSE/CafeF and contemporaneous reporting; no named direct emails confirmed.',
  contacts:[
   person('Vũ Dương','Former General Director — Vũ Ánh Dương in July 2026 reporting','Historical record only; do not address as current CEO','https://www.dnse.com.vn/senses/tin-tuc/pc1-co-tong-giam-oc-moi-35251785',{roleStatus:'Historical — replaced July 2026',caveats:['Original abbreviated name retained to avoid losing the existing card. Source uses Vũ Ánh Dương; any LinkedIn identity match needs rechecking.']}),
   person('Dang Quoc Tuong','Former Deputy General Director — reported replaced July 2026','Historical EPC leadership record; not a current-authority claim','https://www.dnse.com.vn/senses/tin-tuc/pc1-co-tong-giam-oc-moi-35251785',{roleStatus:'Historical — replaced July 2026'}),
   person('Lê Văn Dũng','General Director — July 2026 appointment','Current reported executive introduction route','https://cafef.vn/du-lieu/pc1-2938685/pc1-bo-nhiem-ba-trinh-khanh-linh-giu-chuc-chu-tich-hdqt-ong-le-van-dung-giu-chuc-tong-giam-doc-tu-2472026.chn',{findings:[{text:'Company-signed personnel-change notice is linked from the HOSE-relayed announcement.',source:'https://cafef1.mediacdn.vn/download/270726/pc1-thong-bao-thay-doi-nhan-su-0.pdf'}],caveats:['Reporting differs on 24 versus 30 July effective dates; appointment period is retained without resolving that date discrepancy.']}),
   person('Trịnh Khánh Linh','Chair of the Board — July 2026 appointment','Board-level strategic escalation','https://cafef.vn/du-lieu/pc1-2938685/pc1-bo-nhiem-ba-trinh-khanh-linh-giu-chuc-chu-tich-hdqt-ong-le-van-dung-giu-chuc-tong-giam-doc-tu-2472026.chn'),
   person('Nguyễn Thanh Hương','Finance Director — reported July 2026 appointment','Financial diligence and capital routing','https://nguoiquansat.vn/pc1-tiep-tuc-kien-toan-ban-lanh-dao-bo-nhiem-pho-tong-giam-doc-moi-308747.html',{confidence:'Medium — contemporaneous reporting; direct employer contact confirmation outstanding'})
  ]
 },
 'mercury-renewables':{
  rounds:3,corporateRoutes:[route('info@mercuryrenewables.ie',mercuryContact)],
  conclusion:'Irish planning documents identify John Duffy as managing director and Tim Bills-Everett as principal. Lobbying registration publishes John’s business email; liaison contacts are separate from equity decision-makers.',
  contacts:[
   person('John Duffy','Managing Director — identified in Firlough planning documents','Primary sponsor/executive introduction',mercuryPlanning,{emails:[route('jduffy@mercuryrenewables.ie','https://www.lobbying.ie/organisation/3103/mercury-renewables-services-limited','Published business email — dated registration','Irish lobbying registration last updated May 2022 attributes this address to John Duffy. Current delivery untested.')],phone:'+44 7836 556964',phoneSource:'https://www.lobbying.ie/organisation/3103/mercury-renewables-services-limited',caveats:['Published registration is dated 2022; reconfirm current receipt before relying on it.']}),
   person('Tim Bills-Everett','Principal — Firlough planning-document attribution','Sponsor/finance introduction',mercuryPlanning,{caveats:['Planning document records joining as principal in 2018; current mandate and direct email are not independently confirmed.']}),
   person('Caitlin Duffy','Community Liaison Officer','Local referral only; not a C-level or equity decision-maker',mercuryContact,{emails:[route('cduffy@mercuryrenewables.ie',mercuryContact,'Published business email','Official contact page names the recipient. No delivery check.')],phone:'+353 87 0979700'}),
   person('Anna Gallagher','Community Liaison Officer','Local referral only; not a C-level or equity decision-maker',mercuryContact,{emails:[route('agallagher@mercuryrenewables.ie',mercuryContact,'Published business email','Official contact page names the recipient. No delivery check.')],phone:'+353 87 6183458'})
  ]
 },
 'green-genius':{
  rounds:4,corporateRoutes:[route('hello@greengenius.pl',ggContact,'Shared Poland office route'),route('info@greengenius.com',ggContact)],phone:'+48 537 537 327',
  conclusion:'EBRD confirms Ruslan as CEO. Poland’s published acquisition desk remains the practical commercial route. Old CFO-directory entries conflict with the individual’s departure post; do not treat Rokas Bancevičius as current CFO.',
  contacts:[
   person('Ruslan Sklepovič','Chief Executive Officer','Executive investment and growth escalation','https://www.ebrd.com/home/news-and-events/news/2026/ebrd-increases-stake-in-lithuania-s-green-genius.html'),
   person('Modestas Šinkevičius','Management Board member; CFO title reported by directory','Group financial/strategic introduction','https://greengenius.com/wp-content/uploads/2026/04/Business-Overview-2025.pdf',{linkedin:'https://lt.linkedin.com/in/modestas-%C5%A1inkevi%C4%8Dius-60492655',confidence:'High for board membership; CFO title requires confirmation',caveats:['Official 2025 business overview confirms board membership, not the CFO title. Do not infer a current CFO appointment solely from a directory.']}),
   person('Beata Snarska','Poland representative / government-listed prokurent','Polish company introduction; current investment mandate unconfirmed','https://www.gov.pl/attachment/9c9445d7-d0dd-41de-bd31-07c464f05a95',{confidence:'Medium — government-listed affiliation; current executive title unresolved'}),
   person('Rokas Bancevičius','Former CFO — departure stated on professional profile','Historical finance reference only','https://lt.linkedin.com/in/rokas-b',{linkedin:'https://lt.linkedin.com/in/rokas-b',corporateRoutes:[],roleStatus:'Historical — departure reported',caveats:['Self-reported departure conflicts with stale directories. Do not approach as Green Genius’s current CFO.']}),
   person('Martyna Giedraitė','Press contact — published company contact page','Communications/referral, not an investment decision-maker',ggContact,{emails:[route('martyna.giedraite@greengenius.com',ggContact,'Published press email','Published press routing; delivery not checked.')]} )
  ]
 },
 'geo-wind-power-tanzania':{
  rounds:4,corporateRoutes:[route('info@geowindpower.tz','https://geowindpower.tz/','Shared project/company route')],
  conclusion:'Four rounds did not establish a source-backed current named C-level officer. Keep the project desk and a separately labelled historical NDC institutional route; do not equate historical ownership with today’s seller authority.',
  contacts:[person('National Development Corporation — institutional referral','Office of the Managing Director — historical Singida project-brief route','Institutional clarification of project history and present ownership; not Geo Wind’s current CEO','https://www.tic.go.tz/uploads/documents/en-1658411360-The%20latest%20version%20of%20The%20Project%20Briefs%202022.pdf',{corporateRoutes:[route('info@ndc.go.tz','https://ndc.go.tz/management/','Indirect institutional referral route')],caveats:['The 2022 government brief describes an NDC/Power Pool East Africa JV. The current project website does not resolve that ownership history. No current named Geo Wind executive confirmed.']})]
 },
 'someva-renewables':{
  rounds:3,corporateRoutes:[route('community@someva.com.au',somevaContact,'Shared company/project route')],phone:'+61 428 208 795',
  conclusion:'Company team page and planning-hearing transcript identify sponsor, development and project delivery leads. Media contacts are retained as external referral routes, not decision-makers or Someva employees.',
  contacts:[
   person('Jamie Chivers','Founder and Managing Director','Business development, finance and sponsor decision route',somevaTeam,{linkedin:'https://au.linkedin.com/in/jamie-chivers-8aba28b'}),
   person('Tim Mead','Development Director','Development/JV project introduction',somevaHearing),
   person('Geoff Dutaillis','Chair; strategic adviser','Board-level investment and strategic escalation',somevaTeam),
   person('George Furrer','Commercial Manager','Commercial terms, offtake, OEM negotiation and financial-model workstreams',somevaTeam),
   person('John Choi','Financial Controller','Acquisition handovers, JV accounting and financial diligence',somevaTeam),
   person('Tom Stokes','Engineering Manager','Wind/solar design and technical-diligence routing',somevaTeam),
   person('Michelle Willis-Davis','Senior Development Manager','Sunny Corner development and strategic operating relationships',somevaTeam),
   person('Angela Rozali','Senior Development Manager','Development, EPC structures and technical/commercial project evaluation',somevaTeam),
   person('Luke Veivers','Development Manager','Coonerang and other Someva project-development routing',somevaTeam),
   person('Derek Powell','Project Director','Project delivery and technical execution',somevaHearing),
   person('James Nicholas','Development Manager','Pottinger project-development routing',somevaHearing),
   person('Felicity Stening','Director of Community and Government Engagement','Stakeholder/government routing, not equity approval',somevaTeam,{caveats:['Planning transcript spells the surname Stenning; company team-page spelling is used.']}),
   person('Chris Williams','Kaizen external media contact for Someva','External communications referral only','https://www.somevarenewables.com.au/wp-content/uploads/2025/08/Media-release-Independent-Planning-Commission-of-NSW-approves-Pottinger-Energy-Park.pdf',{corporateRoutes:[],emails:[route('chris@kaizenco.au','https://www.somevarenewables.com.au/wp-content/uploads/2025/08/Media-release-Independent-Planning-Commission-of-NSW-approves-Pottinger-Energy-Park.pdf','Published external-agency business email','Company release names this external interview contact; not Someva’s investment lead.')],phone:'+61 480 386 879'}),
   person('Ben Hornbrook','Kaizen external media contact for Someva','External communications referral only','https://www.somevarenewables.com.au/wp-content/uploads/2025/08/Media-release-Independent-Planning-Commission-of-NSW-approves-Pottinger-Energy-Park.pdf',{corporateRoutes:[],emails:[route('ben@kaizenco.au','https://www.somevarenewables.com.au/wp-content/uploads/2025/08/Media-release-Independent-Planning-Commission-of-NSW-approves-Pottinger-Energy-Park.pdf','Published external-agency business email','Company release names this external interview contact; not Someva’s investment lead.')],phone:'+61 431 180 161'})
  ]
 },
 'sembcorp-marri':{
  rounds:4,corporateRoutes:[route('investorrelations@sembcorp.com',sembIR,'Shared group investor-relations route')],phone:'+65 6723 3113',
  conclusion:'Group leadership is supported by the official leadership page. Sembcorp completed Alinta’s acquisition in June 2026 and retained Jeff Dimery. Group leadership and IR routes do not establish a specific Marri equity-sale mandate.',
  contacts:[
   person('Wong Kim Yin','Group Chief Executive Officer','Group strategy and major investment escalation',sembTeam),
   person('Eugene Cheng','Group Chief Financial Officer','Group capital and financial structuring',sembTeam),
   person('Jeff Dimery','Managing Director and CEO, Alinta Energy','Australian platform introduction; subsidiary executive, not group CEO','https://www.sembcorp.com/news-and-insights/news/2026/sembcorp-industries-completes-acquisition-of-alinta-energy/',{caveats:['Retained Alinta executive after June 2026 acquisition. Sembcorp IR is an indirect group introduction, not Jeff’s individual mailbox.']}),
   person('Ling Xin Jin','Head, Group Corporate Communications and Investor Relations — November 2025 publication','Named group introduction route',sembIR,{emails:[route('ling.xinjin@sembcorp.com',sembIR,'Published business email — dated source','Named in the November 2025 company presentation; current receipt untested.')]}),
   person('Thomas Teo','Senior Manager, Group Corporate Communications and Investor Relations — November 2025 publication','Investor-relations introduction',sembIR,{emails:[route('thomas.teo@sembcorp.com',sembIR,'Published business email — dated source','Named in November 2025 company presentation; current receipt untested.')]}),
   person('Sam Trinh','Manager, Group Corporate Communications and Investor Relations — November 2025 publication','Investor-relations introduction',sembIR,{emails:[route('haisam.trinhthi@sembcorp.com',sembIR,'Published business email — dated source','Named in November 2025 company presentation; current receipt untested.')]})
  ]
 },
 'arra-pan-european-platform':{
  rounds:4,corporateRoutes:[route('hello@arra.energy',arraContact)],
  conclusion:'Companies House confirms Eric Dulle and Ryan Serbu as directors. Arra is an M&A marketplace/intermediary; the underlying wind-platform owner and actual sell-side mandate remain undisclosed.',
  contacts:[
   person('Eric Dulle','Co-founder and registered Director, Arra Energy Ltd','Named transaction introduction; intermediary, not the disclosed asset owner',arraRegister,{linkedin:'https://uk.linkedin.com/in/eric-lr-dulle',emails:[route('edulle@arra.energy','https://www.gramwzielone.pl/gielda-oze/kupie/20350191/purchase-of-pv-and-bess-projects-rtb-phase-2','Published company transaction route','Address published in a February 2026 arra acquisition notice; named association inferred from matching director name and email, not independently person-email verified.')],phone:'+44 7949 254053',phoneSource:'https://www.gramwzielone.pl/gielda-oze/kupie/20350191/purchase-of-pv-and-bess-projects-rtb-phase-2'}),
   person('Ryan Serbu','Co-founder and registered Director, Arra Energy Ltd','Named transaction introduction; intermediary',arraRegister,{linkedin:'https://uk.linkedin.com/in/ryan-serbu'})
  ]
 },
 'star-energy-sea':{
  rounds:4,corporateRoutes:[],
  conclusion:'Exact Vietnam company page and recruitment/partner posts identify Le Thi Ngoc Anh. No legal-entity confirmation, C-level appointment or source-backed public email was established. Unrelated UK, US and Indonesian Star Energy companies were excluded.',
  contacts:[person('Le Thi Ngoc Anh','Published STAR ENERGY contact — executive title unconfirmed','Named Vietnam partnership/recruitment introduction, not a verified CEO','https://vn.linkedin.com/in/le-thi-ngoc-anh-b2909810b',{linkedin:'https://vn.linkedin.com/in/le-thi-ngoc-anh-b2909810b',confidence:'Medium for company-profile connection; C-level authority unresolved',caveats:['Company LinkedIn lists this person and directs enquiries to her; it does not establish legal ownership or a C-level designation.','No published corporate email, personal email or professional mobile found. Use LinkedIn only after identity/mandate confirmation.']})]
 },
 'abo-energy':{
  rounds:4,corporateRoutes:[route('presse@aboenergy.com','https://www.aboenergy.com/en/company/general-management.html','Shared press/IR route')],
  conclusion:'Official project-sales page publishes Susanne’s named business email. Investor presentation supplies three additional named work routes. Published titles/contacts are not delivery verification or proof of an available project.',
  contacts:[
   person('Susanne von Mutius','Managing Director — Project Finance and Sales','Primary project-sale, financing and collaboration introduction',aboSales,{emails:[route('susanne.mutius@aboenergy.com',aboSales,'Published business email','Official project-sales page attributes this work address to Susanne. No delivery check.')]}),
   person('Alexander Koffka','General Manager — published investor presentation','Corporate/IR introduction',aboIR,{emails:[route('alexander.koffka@aboenergy.com',aboIR,'Published business email','Named in April 2026 investor presentation; delivery not checked.')],phone:'+49 611 267 65 515'}),
   person('Dr Karsten Schlageter','Managing Director; Managing Board spokesperson','Executive and strategic investment escalation',aboManagement,{emails:[route('karsten.schlageter@aboenergy.com',aboIR,'Published business email','Named in April 2026 investor presentation; delivery not checked.')],phone:'+49 611 267 65 639'}),
   person('André Hassinger','Investor Relations Manager','Named investor-relations routing',aboIR,{emails:[route('andre.hassinger@aboenergy.com',aboIR,'Published business email','Named in April 2026 investor presentation; delivery not checked.')],phone:'+49 162 6088476'}),
   person('Dr Thomas Treiling','Managing Director — Project and Business Development','Development-market and project introduction',aboManagement)
  ]
 },
 'windon-ridgeblade':{
  rounds:4,corporateRoutes:[route('info@windon.se',windonJV)],phone:'+46 723 19 12 34',
  conclusion:'Company appointment notice supersedes stale CEO directories: Christoffer Johansson became CEO in November 2024 and is named in the February 2026 JV release. RidgeBlade co-venturers are separately identified, not assumed Windon employees.',
  contacts:[
   person('Christoffer Johansson','Chief Executive Officer','Primary corporate/JV financing introduction',windonJV,{emails:[route('christoffer@windonenergygroup.se','https://spotlightstockmarket.com/media/gptba5mw/windon-aar-2024.pdf','Published business email — dated source','Published in signed April 2025 annual-report signature record; present delivery untested.')],findings:[{text:'Company announced CEO appointment effective 15 November 2024; replaces older directories naming Henrik Karstensen as group CEO.',source:'https://news.cision.com/se/windon/r/windon-energy-group-ab-utser-christoffer-johansson-till-ny-vd---henrik-karstensen-tar-ny-roll-inom-n,c4067398'}]}),
   person('Igor Rogelj','Named RidgeBlade Newco co-venturer — planned 20% interest','Technology/IP and JV structure; not a confirmed Windon employee',windonJV,{caveats:['Release describes intended Newco structure; formation, present ownership and personal mandate need confirmation. Shared Windon inbox is an indirect introduction only.']}),
   person('Morten Lindholt','Named RidgeBlade Newco co-venturer — planned 20% interest','Technology/IP and JV structure; not a confirmed Windon employee',windonJV,{caveats:['Earlier LOI sources spell Lindholdt; February 2026 binding-agreement release spells Lindholt. Preserve this identity discrepancy for confirmation.']}),
   person('Henrik Karstensen','Former Group CEO; new key-account development role announced November 2024','Commercial referral only; do not label current group CEO','https://news.cision.com/se/windon/r/windon-energy-group-ab-utser-christoffer-johansson-till-ny-vd---henrik-karstensen-tar-ny-roll-inom-n,c4067398',{emails:[route('henrik@windon.se','https://spotlightstockmarket.com/media/gptba5mw/windon-aar-2024.pdf','Published business email — dated source','Published in April 2025 annual report; current role/receipt needs confirmation.')],roleStatus:'Former CEO — retained as commercial referral'})
  ]
 },
 'iberdrola-romeo':{
  rounds:3,corporateRoutes:[route('investor.relations@iberdrola.es',iberIR,'Shared investor-relations route')],phone:'+34 917 842 804',
  conclusion:'Current official organisation chart and executives page support CEO Pedro Azagra and CFO José Sainz Armada. IR team is publicly named. These are general escalation routes, not proof that the historical Romeo portfolio process is still open.',
  contacts:[
   person('Pedro Azagra','Chief Executive Officer','Group strategic investment and partnership escalation',iberTeam),
   person('José Sainz Armada','Chief Financial Officer','Capital structure, asset rotation and financial escalation',iberTeam),
   person('Ignacio Sánchez Galán','Executive Chairman','Board/executive strategic escalation','https://www.iberdrola.com/about-us/management-team/organisation-chart'),
   person('Ignacio Cuenca Arambarri','Director of Investor Relations','Named corporate introduction route',iberIR),
   person('Isabel Sánchez Herrero','Investor Relations Manager — institutional investors','Institutional-investor enquiry routing',iberIR)
  ]
 }
};

const key = value => String(value||'').normalize('NFKC').trim().toLowerCase();
const uniqueRoutes = routes => routes.filter((item,index,all)=>item.email&&all.findIndex(other=>key(other.email)===key(item.email))===index);
export function applyPartnerContactResearch(records,contacts) {
 for(const record of records){
  const checkpoint=partnerContactResearch[record.id];
  if(!checkpoint)continue;
  const list=contacts[record.id]||(contacts[record.id]=[]);
  for(const update of checkpoint.contacts){
   let saved=list.find(item=>key(item.name)===key(update.name));
   if(!saved){saved={name:update.name};list.push(saved);}
   else if(!saved.originalImportedRecord&&!saved.research)saved.originalImportedRecord=JSON.parse(JSON.stringify(saved));
   const original=saved.originalImportedRecord||{};
   // Existing business/personal emails stay in place and retain their provenance.
   const legacy=original.email?[route(original.email,original.source||'','Imported email route; type not independently confirmed',original.verification||'Existing route retained; no new verification.')]:[];
   const corporateRoutes=Object.hasOwn(update,'corporateRoutes')?update.corporateRoutes:checkpoint.corporateRoutes;
   const existingEmails=Array.isArray(saved.emails)?saved.emails:[];
   const emails=uniqueRoutes([...(update.emails||[]),...existingEmails,...legacy]);
   Object.assign(saved,{title:update.title,role:update.role,source:update.source,emails,corporateRoutes,
    verification:update.roleStatus||'Published research — role/source limitations shown; no email delivery verification',
    status:update.roleStatus||'Published research — no delivery or person-email verification',
    corporateRouteStatus:corporateRoutes.length?'Published corporate/referral route — not a person-email match':emails.some(item=>!/historical|personal|candidate/i.test(item.type))?'Published work route retained; generic corporate inbox not established':'Unresolved — no adequately sourced current corporate email route established',
    research:{asOf:researchedAt,entity:record.company,projectConnection:checkpoint.conclusion,decisionRelevance:update.role,
     findings:[{text:`Published source identifies ${update.name}: ${update.title}.`,source:update.source},...(update.findings||[])],
     caveats:['No Reoon delivery check or verified person-email match. A title or inbox does not prove current JV availability.','No public personal email found in these research rounds.',...(update.caveats||[])],
     nextAction:update.roleStatus?.startsWith('Historical')?'Confirm the replacement through the company office; retain this record for history.':'Request an introduction and confirm the person’s current remit and project mandate before discussing confidential information.',
     confidence:update.confidence||'Source-backed published role; direct receipt/mandate unverified',verification:`${(checkpoint.providers||['ChatGPT web search']).join('; ')}; no email verification or outreach.`},
    researchRounds:checkpoint.rounds,roleStatus:update.roleStatus||'Published role — current remit should be confirmed'});
   if(update.linkedin)saved.linkedin=update.linkedin;
   if(!saved.email)saved.email=emails.find(item=>!/historical|candidate|personal/i.test(item.type))?.email||corporateRoutes[0]?.email||'';
   const number=update.phone||(!update.roleStatus&&!Object.hasOwn(update,'corporateRoutes')?checkpoint.phone:'');
   if(!saved.phone&&number)saved.phone=number;
   const existingPhoneDetails=Array.isArray(saved.phoneDetails)?saved.phoneDetails:[];
   if(number&&!existingPhoneDetails.some(item=>key(item.number)===key(number)))existingPhoneDetails.push({number,type:update.phone?'Published professional contact — not assumed personal':'Shared corporate office',source:update.phoneSource||(update.phone?update.source:corporateRoutes[0]?.source||update.source),status:'Published; current recipient not independently confirmed'});
   saved.phoneDetails=existingPhoneDetails;
   const sources=[...(saved.sources||[]),{title:'Role / decision relevance',url:update.source},...emails.filter(item=>item.source).map(item=>({title:item.type,url:item.source})),...corporateRoutes.map(item=>({title:item.type,url:item.source})),...(update.findings||[]).filter(item=>item.source).map(item=>({title:item.text,url:item.source}))];
   saved.sources=sources.filter((item,index,all)=>item.url&&all.findIndex(other=>other.url===item.url)===index);
  }
  // Retain team cards and their emails; attach the new corporate route and ledger.
  for(const saved of list)if(!saved.research){
   if(!saved.originalImportedRecord)saved.originalImportedRecord=JSON.parse(JSON.stringify(saved));
   saved.corporateRoutes=checkpoint.corporateRoutes;
   saved.corporateRouteStatus=checkpoint.corporateRoutes.length?'Published shared corporate route; named decision-maker authority is separate':'Unresolved — no current published corporate email established';
   saved.research={asOf:researchedAt,entity:record.company,projectConnection:checkpoint.conclusion,decisionRelevance:saved.role||'Existing company/team route',findings:[{text:checkpoint.conclusion,source:saved.source}],caveats:['Existing contact retained; no delivery verification, new seller mandate or outreach.'],confidence:'See individual named contacts and source limitations'};
  }
  const newSources=list.flatMap(item=>item.sources||[]).map(item=>item.url);
  record.sources=[...new Set([...(record.sources||[]),...newSources])];
  record.contactResearch={asOf:researchedAt,status:'completed',rounds:checkpoint.rounds,providers:checkpoint.providers||['ChatGPT web search'],conclusion:checkpoint.conclusion,contacts:list.length,verification:'No Reoon checks; no outreach. Existing relationship status/history untouched.'};
 }
 return {companies:records.length,contacts:Object.values(contacts).flat().length,asOf:researchedAt};
}
