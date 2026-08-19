import Link from "next/link";
import { archiveCmsRedirectAction, saveCmsRedirectAction } from "@/features/cms/redirect-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import { parseCmsRedirectValue } from "@/lib/cms-redirects";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import growth from "../GrowthOperationsWorkbench.module.css";

type RedirectRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};
type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type ValidRedirect = RedirectRow & { source: string; target: string; code: number; invalid: false };
type InvalidRedirect = RedirectRow & { source: string; target: string; code: number; invalid: true };
type RedirectItem = ValidRedirect | InvalidRedirect;

const errorMessages: Record<string, string> = {
  yol: "Yalnız site içi ve güvenli yollar kullanılabilir. Yönetim/API alanları yönlendirilemez.",
  ayni: "Eski ve yeni adres aynı olamaz.",
  dongu: "Bu kayıt bir yönlendirme döngüsü oluşturuyor. A→B→A gibi zincirler kaydedilemez.",
  veri: "Aktif yönlendirme kayıtlarından en az biri bozuk. Döngü grafiği güvenilir olmadığı için yeni kayıt oluşturma durduruldu.",
};

export const dynamic = "force-dynamic";

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}
function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}
function redirectHref(params: Record<string, string | string[] | undefined>, patch: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const key of ["q", "durum", "sec"] as const) {
    const current = param(params, key);
    if (current) query.set(key, current);
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) query.set(key, value);
    else query.delete(key);
  }
  const suffix = query.toString();
  return suffix ? `/icerik/yonlendirmeler?${suffix}` : "/icerik/yonlendirmeler";
}
function chainFor(item: RedirectItem, activeMap: Map<string, ValidRedirect>) {
  if (item.invalid) return [item.source || item.contentKey];
  const result = [item.source, item.target];
  const visited = new Set<string>([item.source]);
  let cursor = item.target;
  for (let step = 0; step < 20; step += 1) {
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const next = activeMap.get(cursor);
    if (!next) break;
    result.push(next.target);
    cursor = next.target;
  }
  return result;
}
function risk(item: RedirectItem, activeMap: Map<string, ValidRedirect>, inbound: Map<string, number>) {
  if (item.invalid) return { label: "Bozuk", level: "high" };
  if (item.status === "archived") return { label: "Arşiv", level: "clean" };
  const chain = chainFor(item, activeMap);
  if (chain.length > 2) return { label: "Zincir", level: "medium" };
  if ((inbound.get(item.source) ?? 0) > 0) return { label: "Ara hedef", level: "medium" };
  return { label: "Doğrudan", level: "clean" };
}

export default async function RedirectsPage({ searchParams }: PageProps) {
  await requireCmsAdmin("/icerik/yonlendirmeler");
  const query = await searchParams;
  const errorCode = param(query, "hata");

  let rows: RedirectRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<RedirectRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'redirect'
      ORDER BY updatedAt DESC
      LIMIT 500
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Büyüme</span><h1>Yönlendirmeler</h1><p>Yönlendirme graph’ı doğrulanamadığında yeni 308 kararı üretilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Yönlendirme verileri okunamadı.</strong><p>Bu durum “henüz yönlendirme yok” anlamına gelmez. Mevcut graph okunamadığı için oluşturma ve arşivleme aksiyonları durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/yonlendirmeler">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const items: RedirectItem[] = rows.map((row) => {
    const value = parseCmsRedirectValue(row.valueJson);
    return value
      ? { ...row, source: value.source || row.contentKey, target: value.target, code: value.code, invalid: false as const }
      : { ...row, source: row.contentKey, target: "", code: 308, invalid: true as const };
  });
  const valid = items.filter((item): item is ValidRedirect => !item.invalid);
  const invalid = items.filter((item): item is InvalidRedirect => item.invalid);
  const active = valid.filter((item) => item.status === "published");
  const activeMap = new Map(active.map((item) => [item.source, item]));
  const inbound = new Map<string, number>();
  for (const item of active) inbound.set(item.target, (inbound.get(item.target) ?? 0) + 1);
  const invalidActive = invalid.filter((item) => item.status === "published").length;
  const chainCount = active.filter((item) => chainFor(item, activeMap).length > 2).length;

  const q = param(query, "q").trim().toLocaleLowerCase("tr-TR");
  const statusFilter = param(query, "durum") || "all";
  const selectedKey = param(query, "sec");
  const filtered = items.filter((item) => {
    if (q && !`${item.source} ${item.target}`.toLocaleLowerCase("tr-TR").includes(q)) return false;
    if (statusFilter === "active" && item.status !== "published") return false;
    if (statusFilter === "archived" && item.status !== "archived") return false;
    if (statusFilter === "invalid" && !item.invalid) return false;
    if (statusFilter === "chain" && (item.invalid || item.status !== "published" || chainFor(item, activeMap).length <= 2)) return false;
    return true;
  });
  const selected = filtered.find((item) => item.contentKey === selectedKey) ?? filtered[0] ?? null;
  const selectedChain = selected ? chainFor(selected, activeMap) : [];
  const selectedRisk = selected ? risk(selected, activeMap, inbound) : null;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Büyüme</span><h1>Yönlendirmeler</h1><p>Kalıcı 308 kurallarını graph olarak yönetin; zincire dönüşen kuralları, ara hedefleri ve bozuk kayıtları karar vermeden önce görün.</p></div>
        <div className="content-profile"><strong>{active.length} aktif kural</strong><small>{chainCount} zincir · {invalid.length} bozuk kayıt</small></div>
      </div>

      {errorCode && errorMessages[errorCode] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Yönlendirme kaydedilemedi</strong><p>{errorMessages[errorCode]}</p></div> : null}
      {param(query, "kayit") === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Yönlendirme kaydedildi.</strong></div> : null}
      {param(query, "arsiv") === "1" ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Yönlendirme arşivlendi.</strong></div> : null}
      {invalidActive > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalidActive} bozuk kayıt aktif graph içinde.</strong><p>Graph güvenilir olmadığı için yeni kural ve hedef güncelleme işlemleri kilitli.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Aktif 308</span><strong>{active.length}</strong><small>public trafikte uygulanıyor</small></article>
          <article className={ops.summaryCard}><span>Zincirli kural</span><strong>{chainCount}</strong><small>birden fazla hop</small></article>
          <article className={ops.summaryCard}><span>Arşiv</span><strong>{valid.filter((item) => item.status === "archived").length}</strong><small>publicte uygulanmıyor</small></article>
          <article className={ops.summaryCard}><span>Bozuk kayıt</span><strong>{invalid.length}</strong><small>{invalidActive} aktif graph içinde</small></article>
        </div>

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>Yönlendirme graph’ı</span><strong>{filtered.length} kural gösteriliyor</strong></div>
            <form method="get" className={ops.searchForm}><input type="search" name="q" defaultValue={param(query, "q")} placeholder="Eski veya yeni URL ara" />{statusFilter !== "all" ? <input type="hidden" name="durum" value={statusFilter} /> : null}<button type="submit">Ara</button></form>
            <div className={ops.filters}><span className={ops.railLabel}>Durum</span><div className={ops.filterRow}>
              {[{ key: "all", label: "Tümü" }, { key: "active", label: "Aktif" }, { key: "chain", label: "Zincir" }, { key: "archived", label: "Arşiv" }, { key: "invalid", label: "Bozuk" }].map((filter) => <Link key={filter.key} data-active={statusFilter === filter.key} href={redirectHref(query, { durum: filter.key === "all" ? undefined : filter.key, sec: undefined })}>{filter.label}</Link>)}
            </div></div>
            {filtered.length === 0 ? <div className={ops.empty}>Bu filtrelerde yönlendirme yok.</div> : <div className={ops.itemList}>{filtered.map((item) => {
              const itemRisk = risk(item, activeMap, inbound);
              return <Link key={item.contentKey} href={redirectHref(query, { sec: item.contentKey })} className={ops.itemLink} data-active={selected?.contentKey === item.contentKey}>
                <div className={ops.itemTop}><strong>{item.source}</strong><span className={growth.priority} data-level={itemRisk.level}>{itemRisk.label}</span></div>
                <p>{item.invalid ? "Parse edilemiyor" : `→ ${item.target}`}</p>
                <div className={ops.itemMeta}><span>{item.status === "published" ? "Aktif" : "Arşiv"}</span>{!item.invalid ? <span>{chainFor(item, activeMap).length - 1} hop</span> : null}</div>
              </Link>;
            })}</div>}
          </aside>

          <main className={ops.detail}>
            {!selected ? <div className={ops.empty}><strong>İncelenecek yönlendirme yok.</strong></div> : <>
              <div className={ops.detailHeader}>
                <div className={ops.detailTopline}>{selectedRisk ? <span className={growth.priority} data-level={selectedRisk.level}>{selectedRisk.label}</span> : null}<span className={ops.badge} data-tone={selected.invalid ? "failed" : selected.status === "published" ? "published" : "initial"}>{selected.invalid ? "Bozuk" : selected.status === "published" ? "Aktif 308" : "Arşiv"}</span></div>
                <div><span className={ops.eyebrow}>Seçili yönlendirme</span><h2>{selected.source}</h2><p>{selected.invalid ? "Hedef verisi parse edilemiyor." : `→ ${selected.target}`}</p></div>
                <div className={ops.detailMetaGrid}>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>HTTP kodu</span><strong>{selected.invalid ? "—" : selected.code}</strong><small>kalıcı yönlendirme</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Zincir uzunluğu</span><strong>{selected.invalid ? "—" : `${Math.max(1, selectedChain.length - 1)} hop`}</strong><small>{selectedChain.length > 2 ? "optimizasyon adayı" : "doğrudan akış"}</small></div>
                  <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Son güncelleme</span><strong>{formatDate(selected.updatedAt)}</strong><small>Europe/Istanbul</small></div>
                </div>
              </div>
              <div className={ops.detailBody}>
                {selected.invalid ? <div className={`${ops.infoBox} ${ops.blocker}`}><strong>Bu kayıt düzenlenemez.</strong><p>Raw JSON parse edilemediği için source/target graph’ına güvenilemiyor. Sistem Sağlığı üzerinden teşhis edin.</p></div> : <>
                  <div className={growth.chain}>{selectedChain.map((path, index) => <div className={growth.chainStep} key={`${path}-${index}`}><span>{index + 1}</span><div><strong>{path}</strong><small>{index === 0 ? "Eski public URL" : index === selectedChain.length - 1 ? "Nihai hedef" : "Ara yönlendirme"}</small></div></div>)}</div>
                  {selected.status === "published" && invalidActive === 0 ? <div className={ops.scheduleBox}><strong>Hedefi güncelle</strong><p>Source sabit kalır. Yeni hedef mevcut active graph’a karşı normalize edilir ve döngü kontrolünden geçer.</p><form action={saveCmsRedirectAction} className={growth.builder}><input type="hidden" name="source" value={selected.source} /><label><span>Yeni hedef</span><input name="target" required maxLength={150} defaultValue={selected.target} autoComplete="off" /></label><div className={ops.actionRow}><button type="submit">Hedefi Güncelle</button></div></form></div> : null}
                  {selected.status === "published" ? <form action={archiveCmsRedirectAction}><input type="hidden" name="source" value={selected.source} /><button type="submit">Bu Kuralı Arşivle</button></form> : <div className={ops.infoBox}><strong>Arşivlenmiş kural</strong><p>Public trafikte uygulanmaz. Gerekirse sağdaki yeni kural alanından aynı source ile yeniden oluşturabilirsiniz.</p></div>}
                </>}
              </div>
            </>}
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Yeni 308</span><strong>Yeni taşıma kuralı oluştur</strong></div>
            <div className={ops.sideBody}>
              {invalidActive > 0 ? <div className={`${ops.infoBox} ${ops.blocker}`}><strong>Yeni kural kilitli.</strong><p>Aktif graph içinde bozuk kayıt varken cycle analizi güvenilir değildir.</p></div> : <form action={saveCmsRedirectAction} className={growth.builder}><label><span>Eski URL yolu</span><input name="source" required maxLength={150} placeholder="/eski-sayfa" autoComplete="off" /></label><span className={growth.redirectArrow}>↓ 308</span><label><span>Yeni URL yolu</span><input name="target" required maxLength={150} placeholder="/yeni-sayfa" autoComplete="off" /></label><p className={growth.builderHint}>Yalnız site içi public yollar. Yönetim/API alanları, aynı source-target ve döngüler server-side engellenir.</p><button type="submit">308 Kuralını Kaydet</button></form>}
              <div className={ops.infoBox}><strong>Graph prensibi</strong><p>Mümkünse eski URL doğrudan nihai hedefe gitmeli. Birden fazla hop çalışan bir kuraldır ama bakım ve SEO için sadeleştirme adayıdır.</p></div>
              <div className={ops.actionRow}><Link href="/icerik/seo">SEO Merkezi</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
