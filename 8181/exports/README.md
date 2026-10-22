# Outreach export

Use **Export outreach data (JSON)** in the top bar of Investors & JV or Listed Projects.
Each click downloads `outreach-data.json` and atomically replaces this folder's copy with the same UTF-8 bytes.
The export reads local source records and that browser's saved investor favourites, sectors and added contact identities. It does not modify records, expose write methods or call external services.

The requested project `id` and `internalName` are internal references and identify assets. Therefore the combined file is confidential internal input, **not an anonymous document for external circulation**. All other project fields are banded/allowlisted. An email builder must not insert these two internal-reference fields into externally shared messages.

Capacity bands use lower-inclusive, upper-exclusive boundaries. The highest band includes its lower boundary. Before-RTB is mapped to Pre-construction, not Ready-to-build. Source claims alone do not populate a verified strength. Sector classifications do not establish an investment mandate. Investor `intent` is a literal classification of the stored status label, not independently verified buying interest.

No email addresses, phones, social links, credentials, source documents, owner fields or workflow notes are exported. Unsupported or corrupt local state, prohibited content and disk failures stop the export instead of producing a partial file. The generated JSON is excluded from version control.
