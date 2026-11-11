export const H2_PRIORITY_CATEGORIES=['Ultra High','High','Strong','Moderate','Low','Very Low'];

// The source status remains the explanation; this is the concise filterable
// priority layer for the H2 Dev workspace.
const CATEGORY_BY_ID={
 'h2dev2:acwa':'Ultra High',
 'h2dev2:alter-enersun':'Low',
 'h2global10:brighthy':'High',
 'h2global10:carlton-gheco':'High',
 'h2dev:cip':'Ultra High',
 'h2rtb25:countrywide':'Moderate',
 'h2rtb25:dh2-energy':'Moderate',
 'h2dev2:enagas-renovable':'Ultra High',
 'h2dev:eneanowaenergia':'High',
 'h2dev:energy-group-mgge':'Moderate',
 'h2global10:eternal-power':'Moderate',
 'h2global10:european-energy':'High',
 'h2dev2:everfuel':'Low',
 'h2rtb25:fuella':'Low',
 'h2rtb25:gen2-energy':'Moderate',
 'h2rtb25:geopura':'Strong',
 'h2rtb25:greenh-norway':'Strong',
 'h2rtb25:h2apex':'High',
 'h2rtb25:h2carrier':'Moderate',
 'h2rtb25:h2v':'Strong',
 'h2global10:hdf-energy':'Strong',
 'h2rtb25:hive-hydrogen':'Moderate',
 'h2dev:hy24':'Ultra High',
 'h2dev2:hy2gen':'Moderate',
 'h2rtb25:hycc-power2x':'Strong',
 'h2dev:hydro-h2':'Moderate',
 'h2rtb25:hydropulse':'Strong',
 'h2rtb25:hydrospider':'Moderate',
 'h2rtb25:hyds':'Strong',
 'h2global10:hygen-energy':'Low',
 'h2global10:hygenco':'Strong',
 'h2rtb25:hynergy-hy2b':'Moderate',
 'h2dev:hynfra':'Strong',
 'h2rtb25:hyphen':'Moderate',
 'h2rtb25:hypion':'Moderate',
 'h2rtb25:hyro':'Moderate',
 'h2dev:kgal-innoenergy':'Ultra High',
 'h2dev:lafrentz-nexus':'Moderate',
 'h2rtb25:lhyfe':'Strong',
 'h2dev2:masdar':'Ultra High',
 'h2dev2:moeve':'High',
 'h2rtb25:morgen':'High',
 'h2rtb25:norwegian-hydrogen':'Moderate',
 'h2dev2:omv':'Ultra High',
 'h2dev:orlen':'Ultra High',
 'h2rtb25:p2x-solutions':'High',
 'h2dev:polenergia':'Very Low',
 'h2rtb25:protium':'High',
 'h2dev2:ptx':'High',
 'h2global10:ric-energy':'Strong',
 'h2dev2:rwe':'Ultra High',
 'h2rtb25:stormfisher':'Moderate',
 'h2rtb25:tyczka-hydrogen':'Moderate',
 'h2global10:verbund-green-hydrogen':'Ultra High',
 'h2global10:yamna':'Strong'
};

export function h2PriorityCategory(record){
 const category=CATEGORY_BY_ID[record?.id];
 if(!H2_PRIORITY_CATEGORIES.includes(category))throw new Error(`Missing H2 priority category for ${record?.id||'record'}`);
 return category;
}
