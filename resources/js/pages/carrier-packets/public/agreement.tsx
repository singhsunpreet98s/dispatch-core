import { SignaturePad } from '@/components/signature-pad';
import { Button } from '@/components/ui/button';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, PenLine } from 'lucide-react';
import { useState } from 'react';

interface PacketInfo { uuid: string; company_name: string; mc_number: string }
interface Customer { full_name: string | null; address: string | null; phone: string | null }
interface Props {
    packet: PacketInfo;
    customer: Customer;
    documentTypes: string[];
}

const DOC_LABELS: Record<string, string> = {
    mc_authority: 'MC Authority',
    w9:           'W-9',
    coi:          'COI / Certificate of Insurance',
    void_check:   'Void Check / Notice of Assignment',
};

function Section({ title }: { title: string }) {
    return <p className="mt-6 mb-2 font-bold text-gray-900">{title}</p>;
}

function AgreementBody({ company }: { company: string }) {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return (
        <div className="text-[13px] leading-relaxed text-gray-700 space-y-3">
            <div className="flex flex-col items-center mb-6">
                <img src="/assets/images/logo.png" alt="Uniship Cargo" className="h-16 w-auto mb-4" />
                <h2 className="text-center text-lg font-bold uppercase tracking-wide text-gray-900">BROKER - CARRIER AGREEMENT</h2>
            </div>

            <p>This Transportation Agreement (the "Agreement"), is entered into this <strong>{today}</strong>, between <strong>Uniship Cargo Inc</strong> (hereinafter referred to as "BROKER") and <strong>{company}</strong> (hereinafter referred to as "CARRIER").</p>
            <p>WHEREAS, "BROKER" is a person (or company) who arranges with an operator to carry the goods of another person (or company), for compensation and by commercial motor vehicle and may be duly registered where required.</p>
            <p>WHEREAS, "CARRIER" is a person (or company) registered ("registered" means operating under authority issued by all applicable regulatory authorities) to carry the goods (property) of another person (or company) by commercial motor vehicle for compensation (copies of Operating Authorities are attached hereto as Appendix C). WHEREAS, the name "SHIPPER" is the customer of the BROKER and is also known but not limited to the name's consignor, consignee and receiver.</p>

            <Section title="1. CARRIER REPRESENTS AND WARRANTS THAT IT" />
            <div className="pl-4 space-y-2">
                <p><strong>A.</strong> is an operator of commercial motor vehicles and/or a motor carrier, authorized to provide the transportation of goods under contracts with shippers and receivers and/or brokers of materials, wares, merchandise and general commodities, and</p>
                <p><strong>B.</strong> shall transport the goods (property), under its own Operating Authority and subject to the terms of this Agreement, and</p>
                <p><strong>C.</strong> makes the representations herein for the purpose of inducing BROKER to enter into this Agreement, and</p>
                <p><strong>D.</strong> agrees that a Shipper's insertion of BROKER's name as the carrier on a bill of lading shall be for the Shipper's convenience only and shall not change BROKER's or CARRIER's status as defined above, and</p>
                <p><strong>E.</strong> will not re-broker, assign or interline the shipments hereunder, without prior written consent of BROKER. If CARRIER breaches this provision, BROKER shall have the right of paying the money it owes CARRIER directly to the delivering carrier, in lieu of payment to CARRIER. Upon BROKER's payment to delivering carrier, CARRIER shall not be released from any liability to BROKER under this Agreement. In addition to the indemnity obligation in Par 1.H, CARRIER will be liable for consequential damages for violation of this Paragraph, and</p>
                <p><strong>F.</strong> is in, and shall maintain compliance during the term of this Agreement, with all applicable federal, provincial (or state) and local laws relating to the provision of its services including, but not limited to: transportation of Dangerous Goods (or Hazardous Materials), (including the licensing and training of drivers), to the extent that any shipments hereunder constitute Dangerous Goods (or Hazardous Materials); security regulations; customs regulations; owner/operator lease regulations; loading and securement of freight regulations; implementation and maintenance of driver safety regulations including, but not limited to, hiring, controlled substances, and hours of service regulations; sanitation, temperature, and contamination requirements for transporting food, perishable, and other products, qualification and licensing and training of drivers; implementation and maintenance of equipment safety regulations; maintenance and control of the means and method of transportation including, but not limited to, performance of its drivers, and</p>
                <p><strong>G.</strong> CARRIER will notify BROKER immediately if any Operating Authority is revoked, suspended or rendered inactive for any reason; and/or if it is sold, or if there is a change in control of ownership, and/or any insurance required hereunder is threatened to be or is terminated, cancelled, suspended, or revoked for any reason, and</p>
                <p><strong>H.</strong> CARRIER shall defend, indemnify and hold BROKER and its shipper customer harmless from any claims, actions or damages, arising out of its performance under this Agreement, including cargo loss and damage, theft, delay, damage to property, and personal injury or death. BROKER shall not be liable to the CARRIER for any claims, actions or damages due to the negligence of the CARRIER, or the shipper. The obligation to defend shall include all costs of defense as they accrue, and</p>
                <p><strong>I.</strong> does not have an "Unsatisfactory" safety rating issued by the Federal Motor Carrier Safety Administration (FMCSA), U.S. Department of Transportation, or any provincial regulatory authority and will notify BROKER in writing immediately if its safety rating is changed to "Unsatisfactory" or "Conditional", and</p>
                <p><strong>J.</strong> authorizes BROKER to invoice CARRIER's freight charges to shipper, consignee, or third parties responsible for payment, and</p>
                <p><strong>K.</strong> has investigated, monitors, and agrees to conduct business hereunder based on the credit-worthiness of BROKER and is granting BROKER credit terms accordingly.</p>
            </div>

            <Section title="2. BROKER RESPONSIBILITIES:" />
            <div className="pl-4 space-y-2">
                <p><strong>A. SHIPMENTS, BILLING &amp; RATES:</strong> BROKER agrees to solicit and obtain freight transportation business for CARRIER to the mutual benefit of CARRIER and BROKER, and shall offer CARRIER at least three (3) loads/shipments annually. BROKER shall inform CARRIER of (a) place of origin and destination of all shipments; and (b) if applicable, any special shipping instructions or special equipment requirements, of which BROKER has been timely notified.</p>
                <p><strong>B.</strong> BROKER agrees to conduct all billing services to shippers. CARRIER shall invoice BROKER for its (CARRIER's) charges, as mutually agreed in writing, by fax, or by electronic means, contained in BROKER's Load Confirmation Sheet(s) incorporated herein by reference (Exhibit A, et seq.). Additional rates for truckload or LTL shipments, or modifications or amendments of the above rates, or additional rates, may be established to meet changing market conditions, shipper requirements, BROKER requirements, and/or specific shipping schedules as mutually agreed upon, and shall be confirmed in writing (or by fax) by both Parties.</p>
                <p><strong>C. RATES:</strong> Additionally, any rates, which may be verbally agreed upon, shall be deemed confirmed in writing where CARRIER has billed the agreed rate and BROKER has paid it. All written confirmations of rates, including confirmations by billing and payment, shall be incorporated herein by reference as part of Exhibit A, Amendment 1, et seq. Rates or charges, including but not limited to stop-offs, detention, loading or unloading, fuel surcharges, or other accessorial charges, released rates or values, or tariff rules or circulars, shall only be valid when specifically agreed to in a signed writing by the Parties.</p>
                <p><strong>D. PAYMENT:</strong> The Parties agree that BROKER is the sole party responsible for payment of CARRIER's charges. Failure of BROKER to collect payment from its customer shall not exonerate BROKER of its obligation to pay CARRIER. BROKER agrees to pay CARRIER's invoice within thirty (30) days of receipt of proof of delivery, provided CARRIER is not in default under the terms of this Agreement. If BROKER has not paid CARRIER's invoice as agreed, and CARRIER has complied with the terms of this Agreement, CARRIER may seek payment from the Shipper or other party responsible for payment after giving BROKER twenty (20) business days advance written notice.</p>
                <p><strong>E. BOND:</strong> If applicable, BROKER shall maintain a surety bond on file with the Federal Motor Carrier Safety Administration (FMCSA) in the form and amount not less than that required by that agency's regulations.</p>
                <p><strong>F.</strong> If applicable, BROKER will notify CARRIER immediately if its Operating Authority is revoked, suspended or rendered inactive for any reason; and/or if it is sold, or if there is a change in control of ownership, and/or any insurance required hereunder is threatened to be or is terminated, cancelled, suspended, or revoked for any reason.</p>
            </div>

            <Section title="3. CARRIER RESPONSIBILITIES:" />
            <div className="pl-4 space-y-2">
                <p><strong>A. EQUIPMENT:</strong> Subject to its representations and warranties in Paragraph 1 above, CARRIER agrees to provide the necessary equipment and qualified personnel for completion of the transportation services required for BROKER and/or its customers. CARRIER will not supply equipment that has been used to transport hazardous wastes, solid or liquid. CARRIER agrees that all shipments will be transported and delivered with reasonable dispatch, or as otherwise agreed in writing.</p>
                <p><strong>B. BILLS OF LADING:</strong> CARRIER shall issue a Uniform Bill of Lading for the property it receives for transportation under this Agreement. Unless otherwise agreed in writing, CARRIER shall become fully responsible/liable for the freight when it takes/receives possession thereof, and the trailer(s) is loaded, regardless of whether a bill of lading has been issued, and/or signed, and/or delivered to CARRIER, and which responsibility/liability shall continue until delivery of the shipment to the consignee and the consignee signs the bill of lading or delivery receipt.</p>
                <p><strong>C. LOSS &amp; DAMAGE CLAIMS:</strong> i. CARRIER shall comply with 49 C.F.R. §370.1 et seq. and any amendments and/or any other applicable regulations adopted by the Federal Motor Carrier Safety Administration, U.S. Department of Transportation, or any applicable federal, state or provincial regulatory agency, for processing all loss and damage claims and salvage.</p>
                <p>ii. CARRIER liability for any cargo damage, loss or theft from any cause shall be determined under the Carmack Amendment 49 USC 14706 as governing shipments according to its terms, and in respect of shipments originating in Canada under the uniform bill of lading in effect in the province of Canada where the carrier issues a bill of lading.</p>
                <p>iii. Special Damages: CARRIER indemnification liability (Par 1.H) for freight loss and damage claims shall include legal fees which shall constitute special damages, the risk of which is expressly assumed by CARRIER.</p>
                <p>iv. Except as provided in Par 1.E above, neither Party shall be liable to the other for consequential damages without prior written notification of the risk of loss and its approximate financial amount, and agreement to assume such responsibility in writing.</p>
                <p>v. Notwithstanding the terms of 49 CFR 370.9, CARRIER shall pay, decline or make settlement offer in writing on all cargo loss or damage claims within 60 days of receipt of the claim. Failure of CARRIER to pay, decline or offer settlement within this 60 day period shall be deemed admission by CARRIER of full liability for the amount claimed and a material breach of this Agreement.</p>
                <p><strong>D. INSURANCE:</strong> CARRIER shall furnish BROKER with Certificate(s) of Insurance, or insurance policies providing thirty (30) days advance written notice of cancellation or termination, and unless otherwise agreed, subject to the following minimum limits: Public liability $1,000,000 motor vehicle (including hired and non-owned vehicles), property damage, and personal injury liability $1,000,000 or ($2,000,000 if transporting hazardous materials and/or dangerous goods); cargo damage/loss $150,000; workers' compensation with limits required by law.</p>
                <p><strong>E. ASSIGNMENT OF RIGHTS:</strong> CARRIER automatically assigns to BROKER all its rights to collect freight charges from Shipper or any responsible third party on receipt of payment from BROKER.</p>
            </div>

            <Section title="4. MISCELLANEOUS:" />
            <div className="pl-4 space-y-2">
                <p><strong>A. INDEPENDENT CONTRACTOR:</strong> It is understood and agreed that the relationship between BROKER and CARRIER is that of independent contractor and that no employer/employee relationship exists, or is intended. BROKER has no control of any kind over CARRIER, including but not limited to routing of freight.</p>
                <p><strong>B. NON-EXCLUSIVE AGREEMENT:</strong> CARRIER and BROKER acknowledge and agree that this contract does not bind the respective Parties to exclusive services to each other. Either party may enter into similar agreements with other carriers, brokers, or freight forwarders.</p>
                <p><strong>C. WAIVER OF PROVISIONS:</strong> i. Failure of either Party to enforce a breach or waiver of any provision or term of this Agreement shall not be deemed to constitute a waiver of any subsequent failure or breach, and shall not affect or limit the right of either Party to thereafter enforce such a term or provision.</p>
                <p>ii. This Agreement is for specified services pursuant to 49 U.S.C. §14101(b), where applicable. To the extent that terms and conditions herein are inconsistent with Part (b), Subtitle IV, of Title 49 U.S.C. (ICC Termination Act of 1995), the Parties expressly waive any or all rights and remedies they may have under the Act.</p>
                <p><strong>D. DISPUTES:</strong> In the event of a dispute arising out of this Agreement, the Party's sole recourse (except as provided below) shall be to arbitration. Proceedings shall be conducted under the rules of the ADR Institute of Ontario (ADR) upon mutual agreement of the Parties. Arbitration proceedings shall be started within eighteen (18) months from the date of delivery or scheduled date of delivery of the freight. The decision of the arbitrators shall be binding and final. Venue and controlling law shall be Ontario.</p>
                <p><strong>E. NO BACK SOLICITATION:</strong> Unless otherwise agreed in writing, CARRIER shall not knowingly solicit freight shipments for a period of 24 months following termination of this agreement for any reason, from any shipper, consignor, consignee, or other customer of BROKER, when such shipments of shipper customers were first tendered to CARRIER by BROKER. In the event of breach, BROKER shall be entitled to a commission of twenty percent (20%) of the gross transportation revenue received by CARRIER for the transportation of said freight as liquidated damages.</p>
                <p><strong>F. CONFIDENTIALITY:</strong> The Parties agree that all of their financial information and that of their customers, including but not limited to freight and brokerage rates, amounts received for brokerage services, amounts of freight charges collected, freight volume requirements, as well as personal customer information, shall be treated as Confidential, and shall not be disclosed or used for any reason without prior written consent.</p>
                <p><strong>G. MODIFICATION OF AGREEMENT:</strong> This Agreement and Exhibit A et. seq. attached, may not be amended, except by mutual written agreement, or the procedures set forth above (Pars 2.B and 2.C).</p>
                <p><strong>H. NOTICES:</strong> All notices provided or required by this Agreement, shall be made in writing and delivered, return receipt requested, to the addresses shown herein with postage prepaid; or by confirmed fax. THE PARTIES shall promptly notify each other of any claim that is asserted against either of them by anyone arising out of the Parties' performance of this Agreement.</p>
                <p><strong>J. CONTRACT TERM:</strong> The term of this Agreement shall be one year from the date hereof and thereafter it shall automatically be renewed for successive one (1) year periods, unless terminated, upon thirty (30) day's prior written notice, with or without cause, by either Party at any time, including the initial term.</p>
                <p><strong>K. SEVERANCE:</strong> In the event any of the terms of this Agreement are determined to be invalid or unenforceable, no other terms shall be affected and the unaffected terms shall remain valid and enforceable as written.</p>
                <p><strong>L. COUNTERPARTS:</strong> This Agreement may be executed in any number of counterparts each of which shall be deemed to be a duplicate original hereof.</p>
                <p><strong>M. FAX CONSENT:</strong> The Parties to this Agreement are authorized to fax to each other at the numbers shown herein shipment availabilities, equipment and rate promotions, or any advertisements of new services.</p>
                <p><strong>N. ENTIRE AGREEMENT:</strong> Except for Exhibit A and its amendments, and unless otherwise agreed in writing, this Agreement contains the entire understanding of the Parties and supersedes all verbal or written prior agreements, arrangements, and understandings of the Parties relating to the subject matter stated herein.</p>
            </div>
        </div>
    );
}

export default function CarrierAgreement({ packet, customer, documentTypes }: Props) {
    const [signature, setSignature] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    function handleSign(e: React.FormEvent) {
        e.preventDefault();
        if (!signature || submitting) return;
        setSubmitting(true);
        router.post(
            route('packet.sign', packet.uuid),
            { signature },
            {
                onError: (errs) => { setErrors(errs); setSubmitting(false); },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <>
            <Head title={`Agreement — ${packet.company_name}`} />

            <div className="min-h-screen bg-gray-100 py-10 px-4">
                <div className="mx-auto max-w-4xl">

                    {/* Submitted info summary */}
                    <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
                        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Your Submitted Information</h2>
                        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                            <div><dt className="text-gray-400">Name</dt><dd className="font-medium text-gray-800">{customer.full_name ?? '—'}</dd></div>
                            <div><dt className="text-gray-400">Phone</dt><dd className="font-medium text-gray-800">{customer.phone ?? '—'}</dd></div>
                            <div><dt className="text-gray-400">Address</dt><dd className="font-medium text-gray-800">{customer.address ?? '—'}</dd></div>
                        </dl>
                        {documentTypes.length > 0 && (
                            <>
                                <div className="my-3 border-t" />
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Documents uploaded</p>
                                <ul className="flex flex-wrap gap-3">
                                    {documentTypes.map((type) => (
                                        <li key={type} className="flex items-center gap-1.5 text-sm text-gray-700">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            {DOC_LABELS[type] ?? type}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    {/* Agreement document */}
                    <form onSubmit={handleSign}>
                        <div className="rounded-xl border bg-white shadow-sm">
                            {/* Document body */}
                            <div className="p-8 sm:p-12">
                                <AgreementBody company={packet.company_name} />

                                {/* Signature block — mirrors the PDF layout */}
                                <div className="mt-10 grid grid-cols-1 gap-6 border border-gray-300 rounded-lg p-6 sm:grid-cols-2">
                                    {/* Broker side */}
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <p className="font-bold text-gray-900 text-base">BROKER</p>
                                        <div>
                                            <p className="text-xs text-gray-400 mb-1">Authorized Signature</p>
                                            <div className="h-14 flex items-end">
                                                <img src="/storage/signature/admin/sign.png" alt="Broker signature" className="max-h-14 w-auto" />
                                            </div>
                                            <div className="mt-1 border-t border-gray-400 w-48" />
                                        </div>
                                        <p><span className="text-gray-400">Printed Name:</span> CHARANJIT VASSAN</p>
                                        <p><span className="text-gray-400">Title:</span> Broker</p>
                                        <p><span className="text-gray-400">Company Address:</span> 1601 Pennsylvania Ave, Linden NJ 07036</p>
                                        <p><span className="text-gray-400">Phone:</span> 908-765-8090</p>
                                        <p><span className="text-gray-400">Email:</span> dispatch@unishipcargo.com</p>
                                    </div>

                                    {/* Carrier side — signature pad */}
                                    <div className="space-y-2 text-sm text-gray-700 sm:border-l sm:border-gray-200 sm:pl-6">
                                        <p className="font-bold text-gray-900 text-base">CARRIER</p>
                                        <div>
                                            <div className="mb-1 flex items-center gap-1.5">
                                                <PenLine className="h-3.5 w-3.5 text-gray-400" />
                                                <p className="text-xs text-gray-400">Draw your signature below</p>
                                            </div>
                                            <SignaturePad onChange={setSignature} />
                                            {errors.signature && <p className="mt-1 text-xs text-red-500">{errors.signature}</p>}
                                            {!signature && <p className="mt-1 text-xs text-gray-400">Signature required to submit.</p>}
                                        </div>
                                        <p><span className="text-gray-400">Printed Name:</span> {customer.full_name ?? '—'}</p>
                                        <p><span className="text-gray-400">Title:</span> Carrier</p>
                                        <p><span className="text-gray-400">Address:</span> {customer.address ?? '—'}</p>
                                    </div>
                                </div>

                                <p className="mt-6 text-xs text-gray-400 text-center">
                                    By signing above, you confirm you have read and agree to all terms of this Agreement.
                                </p>
                            </div>

                            {/* Submit bar */}
                            <div className="border-t bg-gray-50 px-8 py-4 rounded-b-xl flex items-center justify-end gap-4">
                                <p className="text-xs text-gray-400 flex-1">
                                    MC# {packet.mc_number} · {packet.company_name}
                                </p>
                                <Button
                                    type="submit"
                                    size="lg"
                                    disabled={!signature || submitting}
                                >
                                    {submitting ? 'Saving…' : 'Sign & Complete →'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
