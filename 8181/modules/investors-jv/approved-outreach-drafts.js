// Approved 5 November 2026 Solar/Wind Investors & JV outreach templates.
// Keep the bullet layout intact. Replace [Name], [Company] and [Evidence URL]
// before sending; do not use this file as evidence of a company mandate.

export const APPROVED_SOLAR_WIND_DRAFTS=Object.freeze({
 evidence:`Dear [Name],

I am contacting you in reference to [Company]'s published partnership or investment route, where the company presents routes for renewable-energy collaboration.

[Evidence URL]

I represent a selected, mandated portfolio of solar/PV and wind-energy opportunities available for potential investment, acquisition, joint venture and co-development. The portfolio includes:

• Capacity 510 MW across Albania, Croatia and Kosovo,
• offtake/PPA agreements arranged,
• all land secured,
• 70%–75% bankability secured,
• government and municipality approvals in place,
• shovel-ready / RTB opportunities.

Could you confirm whether [Company] is currently reviewing external opportunities and whether a 30-minute meeting would be convenient to discuss the preferred countries, capacity range and development stages?

We ensure our best cooperation and look for a long-term fruitful business relationship.

Best regards,
Mubashir`,
 noEvidence:`Dear [Name],

A brief enquiry regarding [Company]'s current renewable-energy investment and partnership criteria.

I represent a selected, mandated portfolio of solar/PV and wind-energy opportunities available for potential investment, acquisition, joint venture and co-development. The portfolio includes:

• Capacity 510 MW across Albania, Croatia and Kosovo,
• offtake/PPA agreements arranged,
• all land secured,
• 70%–75% bankability secured,
• government and municipality approvals in place,
• shovel-ready / RTB opportunities.

Could you confirm whether [Company] is currently reviewing external opportunities and whether a 30-minute meeting would be convenient to discuss the preferred countries, capacity range and development stages?

We ensure our best cooperation and look for a long-term fruitful business relationship.

Best regards,
Mubashir`
});

export function approvedSolarWindDraft(kind,{name='[Name]',company='[Company]',evidenceUrl='[Evidence URL]'}={}){
 const template=APPROVED_SOLAR_WIND_DRAFTS[kind];
 if(!template)throw new Error(`Unknown approved Solar/Wind draft: ${kind}`);
 return template.replaceAll('[Name]',name).replaceAll('[Company]',company).replaceAll('[Evidence URL]',evidenceUrl);
}
