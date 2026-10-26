import { redirect } from "next/navigation";

// Historical link. Writers now enter only invoice/tax status, not seller rights.
export default function LegacyWriterSellerRightsPage() {
  redirect("/satis-erisim/odeme-vergi-bilgileri");
}
