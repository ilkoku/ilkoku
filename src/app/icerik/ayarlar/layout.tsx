import { requireCmsAdmin } from "@/lib/cms-access";

export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireCmsAdmin("/icerik/ayarlar");
  return children;
}
