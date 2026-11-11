import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/mohdz/codex-projects/outputs/en590-buyer-research";
const outputPath = `${outputDir}/EN590-Buyer-Research.xlsx`;

const companies = [
  ["Abo International Group Ltd.", "Canada", "Trading house / buyer RFQ", "50,000 MT", "2026 buyer listing for EN590 10 ppm for China; CIF/FOB stated. Principal authority and financing unverified.", "Active listing; not an awarded tender", "https://abotaichi.com/home-page/ | https://eximnext.com/buy-lead/diesel-en590-10ppm-canada-1783430789-13"],
  ["New Asma Limited", "Hong Kong", "Trading house / importer-side sourcer", "50,000 MT/month", "2026 buyer listing for EN590 10 ppm for China; profile indicates sourcing for Chinese buyers. Own-account mandate unverified.", "Active listing; not an awarded tender", "https://eximnext.com/buy-lead/diesel-en590-10ppm-hong-kong-1781000532-28 | https://metalandsteel.com/Directory/Details/Name/new-asma-limited/ItemID/18453"],
  ["EUROGAS LLC", "Netherlands", "Buyer-posted importer RFQ", "50,000 MT trial", "RFQ for EN590 10 ppm, CIF Rotterdam; identity and link to the Dutch poster remain unverified.", "Posted request; entity not independently verified", "https://www.tradewheel.com/buyers/importing-en590-10-ppm-diesel-need-quotes/1006810/ | https://www.exporthub.com/eurogas-10595702/"],
  ["Krapivstev Capital", "Spain", "Self-declared buyer in LOI", "30,000 MT/shipment", "LOI/request for EN590 10 ppm every 15 days, CIF Izmir or Gebze; corporate registration and mandate unverified.", "Stated intention; not a signed supply agreement", "https://www.tradewheel.com/buyers/long-term-purchase-inquiry-for-30000-mt-en590-diesel/999966/"],
  ["Hamgug Imc", "South Korea", "Trading house / buyer RFQ", "50,000 MT/month", "RFQ for EN590 10 ppm, 50,000 MT x 12 months CIF Ulsan; buyer identity and mandate require verification.", "Unawarded buyer request", "https://importer.tradekey.com/buyoffer/Petroleum-Supplier-3366855.html"],
  ["Bangladesh Petroleum Corporation", "Bangladesh", "State-owned petroleum importer / procuring entity", "100,000 MT events; separate 25,000–50,000 MT gasoil tender", "Government procurement reporting documents EN590-10 ppm direct imports and BPC as the procuring entity. The 25,000–50,000 MT tender was approximately 50 ppm and closed 3 Sep 2026; EN590 purchases were approved direct procurement, not confirmed open RFQs.", "Genuine institutional buyer; current open status not confirmed", "https://www.bpc.gov.bd | https://www.bppa.gov.bd/advertisement-goods/details-98126.html | https://online.thedailystar.net/business/news/govt-approves-import-26-lakh-more-tonnes-fuel-4140061 | https://en.bd-pratidin.com/national/2026/03/27/59590 | https://en.samakal.com/bangladesh/170848861/proposal-to-import-another--tonnes-of-diesel-approved | https://www.tbsnews.net/bangladesh/energy/fuel-supply-accelerate-as-tender-time-cut-from-42-to-10-days-1417831"],
];

const contacts = [
  ["Abo International Group / ABOGLOBE INTERNATIONAL INC", "Dr. Li Zhong", "CEO", "DRLI@ABOGLOBE.COM", "+1-778-927-1147 / +1-778-928-1177", "Canada", "Lead from company contact page / Perplexity; verify procurement role", "http://abotaichi.com/contact/"],
  ["New Asma Limited", "Miss Eling Ho", "Agent contact", "Unavailable", "+852 9755 8056 (WhatsApp)", "Hong Kong", "Third-party agent listing; not verified as EN590 desk", "https://agricoariztia-ltda.com/"],
  ["Bangladesh Petroleum Corporation", "Mohammad Zahid Hossain", "General Manager, Commercial & Operations", "gm_commercial@bpc.gov.bd", "+880 1713755377 / +880 1829589366", "Bangladesh", "Official procurement contact cited in BPPA material", "https://www.bppa.gov.bd/advertisement-goods/details-98126.html"],
  ["Hamgug Imc", "Mr. Eui Young Chang", "Named buyer contact", "Unavailable", "Unavailable", "South Korea", "Marketplace contact; email and phone gated/unavailable", "https://www.globalbuyersonline.com/tradeleads/details.asp?xpyr=1130829"],
  ["Krapivstev Capital", "Ogtay Sadikhov", "Named contact in separate LPG listing", "Unavailable", "Gated", "Spain", "Not EN590 evidence; do not treat as verified EN590 procurement contact", "https://www.tradewheel.com/buyers/long-term-purchase-inquiry-for-30000-mt-en590-diesel/999966/"],
];

const rejected = [
  ["Exxon Mobil Kazakhstan Inc.", "Kazakhstan", "Supplier/exporter counterparty, not buyer", "Named supplier to BPC for 100,000 MT EN590-10 ppm", "https://online.thedailystar.net/business/news/govt-approves-import-26-lakh-more-tonnes-fuel-4140061"],
  ["AP Energy Investments Limited", "Unverified", "Supplier-side counterparty, not buyer", "Named proposed supplier under BPC emergency procurement", "https://en.bd-pratidin.com/national/2026/03/27/59590"],
  ["Superstar International (Group) Limited", "Unverified", "Supplier-side counterparty, not buyer", "Named proposed supplier for 200,000 MT EN590 Euro-5 10 ppm", "https://en.bd-pratidin.com/national/2026/03/27/59590"],
  ["Majeda Oil Company Limited", "Unverified", "Supplier-side counterparty, not buyer", "Named proposed supplier to BPC for 100,000 MT", "https://en.samakal.com/bangladesh/170848861/proposal-to-import-another--tonnes-of-diesel-approved"],
  ["Archer Energy LLC", "Unverified", "Supplier-side counterparty, not buyer", "Named proposed supplier to BPC for 100,000 MT", "https://www.tbsnews.net/bangladesh/energy/fuel-supply-accelerate-as-tender-time-cut-from-42-to-10-days-1417831"],
  ["DBS Trading House FZCO", "United Arab Emirates", "Supplier/trading-house counterparty, not buyer", "Proposed 1,000,000 MT EN590-10 ppm supply; approval not confirmed", "https://www.tbsnews.net/bangladesh/energy/fuel-supply-accelerate-as-tender-time-cut-from-42-to-10-days-1417831"],
  ["Maxwell International SPC", "Oman", "Wrong specification / supplier-side", "100,000 MT at 50 ppm, not EN590 10 ppm", "https://www.tbsnews.net/bangladesh/energy/fuel-supply-accelerate-as-tender-time-cut-from-42-to-10-days-1417831"],
  ["Kazakh Gas Processing Plant LLP", "Kazakhstan", "Producer/supplier; wrong classification", "High-speed diesel/AGO, not specifically EN590 10 ppm", "https://www.tbsnews.net/bangladesh/energy/fuel-supply-accelerate-as-tender-time-cut-from-42-to-10-days-1417831"],
  ["PT Bumi Siak Pusako Zapin", "Indonesia", "Supplier-side / wrong specification", "60,000 MT of 0.5% sulfur gasoil, not EN590 10 ppm", "https://online.thedailystar.net/business/news/govt-approves-import-26-lakh-more-tonnes-fuel-4140061"],
  ["Anonymous Tunisia lead", "Tunisia", "Anonymous marketplace lead", "50,000 MT EN590 10 ppm request; no legal company, port, CIF terms, or corporate contact", "https://www.exporthub.com/"],
  ["Anonymous Bangladesh lead", "Bangladesh", "Anonymous marketplace lead", "50,000–100,000 MT request; no legal company or verifiable procurement desk", "https://www.go4worldbusiness.com/"],
  ["Anonymous Canada lead", "Canada", "Anonymous marketplace lead", "100,000 MT CIF Houston request; no legal company or official contact", "https://www.go4worldbusiness.com/"],
  ["Anonymous Germany lead", "Germany", "Expired/unverified marketplace lead", "100,000 MT trial plus 200,000 MT/month request; legal buyer undisclosed", "https://www.go4worldbusiness.com/"],
  ["Anonymous UAE lead", "United Arab Emirates", "Anonymous marketplace lead", "100,000 MT CIF Rotterdam request; legal company not established", "https://www.go4worldbusiness.com/"],
  ["Anonymous Indonesia lead", "Indonesia", "Anonymous marketplace lead", "50,000–100,000 MT request; legal company and procurement desk undisclosed", "https://www.go4worldbusiness.com/"],
  ["New Asma education listing", "Hong Kong", "Contact-role mismatch", "Public contact details relate to student recruitment/agent activity, not verified EN590 procurement", "https://connect.pierapps.com/widgets/agencies/992"],
  ["Krapivstev Capital LPG listing", "Spain", "Wrong product / entity evidence", "Separate LPG listing; does not verify EN590 buying activity", "https://www.tradewheel.com/buyers/long-term-purchase-inquiry-for-30000-mt-en590-diesel/999966/"],
  ["EUROGAS LLC", "Netherlands", "Exact legal entity unverified", "Perplexity did not verify a matching Netherlands LLC; similarly named Eurogas entities are different", "https://www.kvk.nl/en/search/ | https://eurogas.org/"],
  ["Hamgug Imc", "South Korea", "Exact legal entity unverified", "Named marketplace contact exists, but no public corporate registry match or official procurement desk verified", "https://dart.fss.or.kr | https://kobdi.co.kr/business-search/"],
];

function writeSheet(sheet, title, subtitle, headers, rows, widths) {
  const cols = headers.length;
  const last = String.fromCharCode(64 + cols);
  sheet.showGridLines = false;
  sheet.getRange("A1").values = [[title]];
  sheet.getRange("A2").values = [[subtitle]];
  sheet.getRange(`A4:${last}4`).values = [headers];
  if (rows.length) sheet.getRange(`A5:${last}${rows.length + 4}`).values = rows;
  sheet.getRange(`A1:${last}1`).format = { fill: "#1F4E78", font: { color: "#FFFFFF", bold: true, size: 14 }, rowHeight: 26 };
  sheet.getRange(`A2:${last}2`).format = { font: { color: "#666666", italic: true, size: 10 }, wrapText: true, rowHeight: 28 };
  sheet.getRange(`A4:${last}4`).format = { fill: "#E7E6E6", font: { bold: true, color: "#000000" }, wrapText: true, verticalAlignment: "center", rowHeight: 34 };
  if (rows.length) sheet.getRange(`A5:${last}${rows.length + 4}`).format = { wrapText: true, verticalAlignment: "top" };
  widths.forEach((width, i) => sheet.getRangeByIndexes(0, i, rows.length + 4, 1).format.columnWidth = width);
  sheet.freezePanes.freezeRows(4);
}

const workbook = Workbook.create();
writeSheet(workbook.worksheets.add("Companies"), "EN590 Buyer Research — Companies", "All retained buyer-side records, including qualified leads whose current open status or mandate still requires verification.", ["Company", "Country", "Buyer role", "Cargo / batch", "Evidence and qualification notes", "Status", "Source URLs"], companies, [28, 16, 28, 20, 65, 34, 70]);
writeSheet(workbook.worksheets.add("Contacts"), "EN590 Buyer Research — Contacts", "Public contact details found during research. Contact-role confidence is stated explicitly.", ["Company", "Contact name", "Role", "Email", "Phone / channel", "Country", "Verification note", "Source URL"], contacts, [34, 24, 32, 30, 30, 16, 55, 55]);
writeSheet(workbook.worksheets.add("Rejected"), "EN590 Buyer Research — Rejected / Unverified", "Preserved exclusions: suppliers, wrong specifications, anonymous leads, role mismatches, and unverified entities.", ["Name", "Country", "Reason", "Evidence / exclusion note", "Source URL"], rejected, [34, 18, 32, 65, 70]);

await workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
