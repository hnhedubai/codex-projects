from pathlib import Path
from docx import Document

source = Path(r"C:\Users\mohdz\Downloads\PROCEDIMIENTO DE TRANSACCIÓN CIF 2 - Bilbao borrador rev2.docx")
output = Path(r"C:\Users\mohdz\codex-projects\outputs\PROCEDIMIENTO CIF 2 Bilbao English Translation.docx")

translations = {
    0: "CIF TRANSACTION PROCEDURE 2",
    2: "1. The Buyer issues an ICPO in accordance with this procedure, which is included in the ICPO, together with the Buyer’s company registration certificate.",
    3: "2. The Seller drafts a sale and purchase contract. The Buyer reviews it, makes the necessary amendments, signs it, and returns it to the Seller in WORD format within 3 business days. The Seller sends the final contract to the Buyer in PDF format; the Buyer confirms it and issues an acceptance letter.",
    4: "3. The Seller signs the CPA and sends the vessel to the Buyer up to the destination port. The Seller also sends the Buyer a copy of the CPA contract.",
    5: "4. The Seller sends the following transaction documents to the Buyer by email:",
    6: "A. Undertaking to Supply",
    7: "B. Statement of Product Availability",
    8: "C. Certificate of Origin",
    9: "D. Product Passport",
    10: "E. ATSC",
    11: "F. Fresh SGS (Q&Q)",
    12: "G. Q88.",
    13: "The Buyer confirms receipt of the documents by postal mail and sends an email confirmation within 24 hours.",
    14: "5. Once the above has been completed, the Seller issues the Buyer a contract for the transfer of title to the goods. The Buyer signs it and returns it to the Seller. The Seller legalizes the contract before the competent authorities and sends the legalized contract and the certificate of transfer of title to the product to the Buyer, after which the Seller proceeds with customs clearance and other internal procedures.",
    15: "6. Once the above has been completed and the export authorization has been confirmed by the Competent Authorities, the Seller, with approval of the Charter Party Agreement (CPA) and the Shipping Schedule by the Port Authorities, may provide the following documents confirming the quality of the Goods:",
    16: "* A legalized Chartered Transportation Contract (CPA) with the Administration of the Loading Port.",
    17: "Injection Report",
    18: "Product Distribution Certificate.",
    19: "\"Certificate of Transfer of Ownership of the Distribution.\"",
    20: "~ Export License",
    21: "Export Permit",
    22: "Tank Receipt.",
    23: "Authorization for the Dip Test.",
    24: "7. The Seller issues a commercial invoice and sends it to the Buyer. The Seller must grant and activate a 3% discount (security deposit) in favor of the Buyer. If the Seller fails to deliver the goods to the Buyer, this 3% deposit will be refunded or cancelled.",
    25: "8. The cost of SGS product verification at the loading port shall be borne by the Seller. The Seller invites the Buyer to attend the inspection and witness the final inspection and the transaction-management meeting to negotiate a future transaction (optional for the Buyer).",
    26: "9. The Seller signs the NCNDA/MFPA with all intermediaries involved and sends a notarized copy to the Seller’s bank.",
    27: "10. Loading and shipment of the goods commence according to the schedule. Once the vessel arrives at the destination port and the SGS inspection is completed, the Buyer shall transfer the full amount to the Seller by bank transfer within 3 to 5 business days.",
    28: "11. The Seller shall pay all commissions to the intermediaries in accordance with the IMFPA within 24 hours after receiving the Buyer’s payment for the shipment. Conclusion."
}

doc = Document(str(source))
for index, text in translations.items():
    doc.paragraphs[index].text = text

output.parent.mkdir(parents=True, exist_ok=True)
doc.save(str(output))
print(output)
