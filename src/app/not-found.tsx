import Link from "next/link";
import { Brand } from "@/components/ui/Brand";
import { tr } from "@/content";

export default function NotFound() {
  return (
    <main className="system-state" aria-labelledby="not-found-title">
      <div className="system-state__brand"><Brand /></div>
      <p className="system-state__code">{tr.system.notFound.code}</p>
      <h1 id="not-found-title">{tr.system.notFound.title}</h1>
      <p>{tr.system.notFound.description}</p>
      <Link className="button button--primary" href="/">{tr.system.notFound.action}</Link>
    </main>
  );
}
