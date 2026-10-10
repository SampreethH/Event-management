import { MessageCircle, Phone } from "lucide-react";
import { telUrl, whatsappUrl } from "@/lib/booking/whatsapp";
import { CONCIERGE_PHONE, CONCIERGE_WHATSAPP } from "@/lib/public-config";

/** Always-reachable human: WhatsApp and click-to-call for bespoke consultations. */
export function ConciergeDock() {
  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-2 sm:right-6 sm:bottom-6">
      <a
        href={whatsappUrl(CONCIERGE_WHATSAPP, "Hi Festoon! I'd like help planning a celebration.")}
        target="_blank"
        rel="noopener noreferrer"
        className="glass grid size-13 place-items-center rounded-full text-mint-300 transition-transform hover:scale-105"
        aria-label="Chat with the concierge on WhatsApp"
      >
        <MessageCircle className="size-6" />
      </a>
      <a href={telUrl(CONCIERGE_PHONE)} className="grid size-13 place-items-center rounded-full bg-tangerine text-white shadow-glow-coral transition-transform hover:scale-105" aria-label="Call the concierge">
        <Phone className="size-5" />
      </a>
    </div>
  );
}
