import { LegalView } from "@/components/site/legal-view";
import { LEGAL_DOCS } from "@/lib/legal";
export const metadata = { title: `${LEGAL_DOCS["terms-of-use"].title} | Glowith` };
export default function Page() { return <LegalView docKey="terms-of-use" />; }
