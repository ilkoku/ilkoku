import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync, truncateSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { inspectDayCloseArchive, compareDayCloseArchives } from "./commerce-day-close-compare.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(root,path),"utf8");
const file = source("src/features/commerce/day-close-export.ts");
const compiled = ts.transpileModule(file, {
  fileName: "day-close-export.ts",
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length,0);
const mod = { exports: {} };
const execute = runInNewContext("(function(require, module, exports, Buffer) {\n"+compiled.outputText+"\n})",{});
execute((id) => {
  assert.equal(id,"node:crypto");
  return { createHash };
},mod,mod.exports,Buffer);
const exportModule = mod.exports;

const validOrder = () => ({
  orderNo: "ILK-ABCDE1234", status: "paid", paidAt: new Date("2026-10-25T18:00:00+03:00"),
  sellerMode: "platform_direct",authorPublicId: "writer001",workTitle: "Kitap 1",currency: "TRY",
  originalAmount: 12000n,discountAmount: 0n, finalAmount: 12000n,couponCode: null,
  commission: {
    commissionRateBps: 2000, serviceFeeRateBps: 500,source: "work",
    sourceEventId: "rule-001", calculationVersion: "rate-v1",
  },
  quote: {
    calculationVersion: "quote-v1",taxTreatment: "net_plus_vat",vatRateBasisPoints: 2000,
    listNetAmount: 10000n,listVatAmount: 2000n,listGrossAmount: 12000n,
    discountGrossAmount: 0n,payableGrossAmount: 12000n,
  },
  payments: [{
    status: "succeeded",amount: 12000n,currency: "TRY",
    completedAt: new Date("2026-10-25T18:00:00+03:00"),
  }],
  taxReview: {
    documentKind: "gvk18_expense_receipt", decision: "verified",
    reviewedAt: new Date("2026-10-20T12:00:00+03:00"),
    validUntil: new Date("2026-11-30T23:59:00+03:00"),
  },
});
const make = (orders) => exportModule.buildDayCloseFiles({
  day: "2026-10-25",orders,ledger: [{
    id:"ledger-1",entryType:"sale_gross",amount:12000n,currency:"TRY",
    createdAt:new Date("2026-10-25T18:00:00+03:00"),
    orderNo:"ILK-ABCDE1234",authorPublicId:"writer001",
  }],refunds:[],
});
test("Istanbul closing window is closed-day-only and offset-correct",() => {
  const now = new Date("2026-10-26T00:03:00+03:00");
  const period = exportModule.closedDayRange("2026-10-25",now);
  assert.equal(period.start.toISOString(),"2026-10-24T21:00:00.000Z");
  assert.equal(period.end.toISOString(),"2026-10-25T21:00:00.000Z");
  assert.equal(exportModule.closedDayRange("2026-10-26",now),null);
  assert.equal(exportModule.closedDayRange("2026-02-30",now),null);
  assert.equal(exportModule.closedDayRange("2026-13-01",now),null);
});

test("Excel formula injection is neutralized in every source text column",() => {
  const csv = exportModule.safeCsv([["name","amount"],['=HYPERLINK("evil")',1200n],["+SUM(1,2)",10n],[" @a",0]]);
  assert.ok(csv.includes("'\u003dHYPERLINK"));
  assert.ok(csv.includes("'+SUM"));
  assert.ok(csv.includes("' @a"));
  assert.ok(csv.includes("1200"));
});

test("day close ZIP has CSV, generic field map and JSON manifest with content hashes",() => {
  const result = make([validOrder()]);
  assert.equal(result.manifest.version,"day-close-v1");
  assert.equal(result.manifest.batchKey,"ILK-DAY-2026-10-25");
  assert.equal(result.manifest.salesCount,1);
  assert.equal(result.manifest.readySalesCount,1);
  assert.equal(result.manifest.checkedGrossMinor,"12000");
  assert.equal(result.manifest.checkedVatMinor,"2000");
  assert.equal(result.manifest.preparationRows,1);
  assert.equal(result.manifest.reviewedAuthorSummaryGroups,1);
  assert.equal(result.manifest.liraWorksheetRows,1);
  assert.equal(result.manifest.unmatchedGrossLedgerOrderCount,0);
  assert.equal(result.manifest.ledgerSummaryGroups,1);
  assert.equal(result.manifest.refundLedgerMatchedGroups,0);
  assert.equal(result.manifest.refundLedgerReviewGroups,0);
  assert.equal(result.manifest.periodBridgeCurrencyGroups,1);
  assert.equal(result.files.length,13);
  assert.deepEqual([...result.files.map(f=>f.name)],[
    "siparisler.csv","finans_hareketleri.csv","iadeler.csv","iade_ledger_mutabakat.csv",
    "gunluk_satis_iade_koprusu.csv","uyarilar.csv",
    "mutabakat.csv","gun_sonu_ozet.csv","muhasebe_on_hazirlik.csv",
    "yazar_hesap_ozeti.csv","muhasebe_tl_inceleme.csv","alan_esleme.json","manifest.json",
  ]);
  for (const f of result.files.filter(x=>x.name.endsWith(".csv"))) {
    assert.equal(result.manifest.fileHashes[f.name],createHash("sha256").update(f.data).digest("hex"));
  }
  assert.equal(result.zip.readUInt32LE(0),0x04034b50);
  assert.equal(result.zip.readUInt32LE(result.zip.length-22),0x06054b50);
  assert.equal(result.zip.readUInt16LE(10),0,"fixed DOS file time");
  assert.equal(result.zip.readUInt16LE(12),0x0021,"valid 1980-01-01 local ZIP date");
  const centralOffset=result.zip.readUInt32LE(result.zip.length-22+16);
  assert.equal(result.zip.readUInt32LE(centralOffset),0x02014b50);
  assert.equal(result.zip.readUInt16LE(centralOffset+12),0,"fixed DOS directory time");
  assert.equal(result.zip.readUInt16LE(centralOffset+14),0x0021,"matching central ZIP date");
  const second = make([validOrder()]);
  assert.deepEqual(result.zip,second.zip,"unchanged source rows yield same bytes/batch hash");
});

test("official vendor handoff gates distinguish verified internal columns from unverified external formats", () => {
  const result=make([validOrder()]);
  const mapping=JSON.parse(result.files.find(f=>f.name==="alan_esleme.json").data);
  const audit=mapping.sourceColumnAudit;
  assert.equal(audit.verificationScope,"ILKOKU_INTERNAL_COLUMN_NAMES_ONLY");
  assert.match(mapping.fields.satis_tarihi_utc.meaning,/not bank settlement/);
  assert.match(mapping.fields.satis_brut_kurus.meaning,/independent bank clearing not verified/);
  assert.equal(audit.internalSourceColumnsMatchDeclarations,true);
  assert.equal(audit.vendorImportReady,false);
  assert.equal(audit.fiscalApproval,false);
  assert.equal(audit.dataRows,1);
  assert.deepEqual([...audit.internalSourceColumns].sort(),
    Object.keys(mapping.fields).sort());
  assert.equal(audit.declaredColumnCount,19);
  assert.equal(result.manifest.sourceMappingVerified,true);
  assert.equal(result.manifest.vendorImportReady,false);
  for(const vendor of ["logo","mikro","parasut"]){
    assert.equal(audit.vendors[vendor].destinationSchemaVerified,false);
    assert.equal(audit.vendors[vendor].automaticImportReady,false);
    assert.equal(audit.vendors[vendor].postToVendorAllowed,false);
    assert.equal(audit.vendors[vendor].readiness,
      "BLOCKED_REQUIRES_EXTERNAL_ACCOUNTANT_REVIEW");
    assert.ok(audit.vendors[vendor].sourceUrl.startsWith("https://"));
    assert.equal(Object.values(audit.vendors[vendor].requirements)
      .filter(Boolean).length,0);
  }
});

test("writer reference and work description must exist before sales pass accounting preflight", () => {
  const badWriter=validOrder();
  badWriter.authorPublicId="   ";
  const a=make([badWriter]);
  assert.equal(a.manifest.readySalesCount,0);
  assert.equal(a.manifest.preparationRows,0);
  assert.equal(a.manifest.liraWorksheetRows,0);
  assert.equal(a.manifest.reviewedAuthorSummaryGroups,0);
  assert.ok(a.files.find(f=>f.name==="uyarilar.csv").data.includes("YAZAR_KODU_EKSIK"));

  const badTitle=validOrder();
  badTitle.workTitle="\t ";
  const b=make([badTitle]);
  assert.equal(b.manifest.readySalesCount,0);
  assert.equal(b.manifest.preparationRows,0);
  assert.ok(b.files.find(f=>f.name==="uyarilar.csv").data.includes("ESER_ADI_EKSIK"));
});

test("a processed refund with no order reference cannot pass financial preflight", () => {
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[],refunds:[{
      id:"R-UNBOUND",orderNo:" ",amount:1500n,currency:"TRY",
      status:"processed",processedAt:new Date("2026-10-25T12:00:00+03:00"),
      orderCurrency:"TRY",orderFinalAmount:12000n,
      orderPaidAt:new Date("2026-10-20T12:00:00+03:00"),
      cumulativeProcessedAmount:1500n,historicalCurrencyMismatch:false,
    }],
  });
  assert.equal(result.manifest.flaggedRefundCount,1);
  assert.equal(result.manifest.reviewedRefundMinor,"0");
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data
    .includes("IADE_SIPARIS_BAGI_EKSIK"));
  assert.equal(result.manifest.refundLedgerMatchedGroups,0);
});

test("verified sale totals reconcile between writer rollup, preparation and manifest", () => {
  const result=make([validOrder()]);
  const mapping=JSON.parse(result.files.find(f=>f.name==="alan_esleme.json").data);
  assert.equal(mapping.sourceColumnAudit.authorTotalsReconciled,true);
  assert.equal(mapping.sourceColumnAudit.validatedAuthorSummaryRows,1);
  assert.equal(mapping.sourceColumnAudit.writerAndWorkReferencesRequired,true);
  assert.equal(mapping.sourceColumnAudit.refundOrderReferenceRequired,true);
  assert.equal(result.manifest.authorTotalsReconciled,true);
  assert.equal(result.manifest.reviewedAuthorSummaryGroups,1);
  assert.equal(result.manifest.preparationRows,1);
  assert.equal(result.manifest.reviewedCommissionIllustrationMinor,"2000");
  assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"500");
});

test("Paraşüt Excel, Mikro mutating APIs and Logo product modules remain distinct unverified tracks", () => {
  const mapping=JSON.parse(make([validOrder()])
    .files.find(f=>f.name==="alan_esleme.json").data);
  assert.equal(mapping.sourceColumnAudit.vendors.parasut.track,
    "ACCOUNT_DOWNLOADED_EXCEL_TEMPLATE_REQUIRED");
  assert.equal(mapping.sourceColumnAudit.vendors.mikro.track,
    "MUTATING_API_EXISTS_BUT_NOT_USED_NO_FILE_SCHEMA_VERIFIED");
  assert.equal(mapping.sourceColumnAudit.vendors.logo.track,
    "PRODUCT_SPECIFIC_FILE_OR_PARTNER_IMPORT_UNCONFIRMED");
  assert.equal(mapping.customerLegalIdentity,
    "NOT_EXPORTED_MUST_BE_VERIFIED_EXTERNALLY");
  assert.equal(mapping.documentType,"NOT_DETERMINED");
});

test("missing snapshot, coupon, duplicate payments and 0TL produce review lines, not invoices",() => {
  const unknownSeller = validOrder();
  unknownSeller.orderNo = "ILK-SELLER-UNKNOWN";
  unknownSeller.sellerMode = null;
  const missing = validOrder();
  missing.commission = null;
  missing.orderNo = "ILK-MISSING";
  const duplicate = validOrder();
  duplicate.orderNo = "ILK-DUPLICATE";
  duplicate.payments.push({ ...duplicate.payments[0] });
  const coupon = validOrder();
  coupon.orderNo = "ILK-COUPON";
  coupon.couponCode = "PROMO";
  const zero = validOrder();
  zero.orderNo = "ILK-ZERO";
  zero.originalAmount = 0n;
  zero.finalAmount = 0n;
  zero.quote = null;
  zero.payments = [];
  const result = make([missing, duplicate, coupon, zero, unknownSeller]);
  assert.equal(result.manifest.salesCount,5);
  assert.equal(result.manifest.readySalesCount,0);
  assert.equal(result.manifest.flaggedSalesCount,5);
  assert.equal(result.manifest.zeroAmountCount,1);
  const issues = result.files.find(x=>x.name==="uyarilar.csv").data;
  assert.ok(issues.includes("KOMISYON_SNAPSHOT_EKSIK_GECERSIZ"));
  assert.ok(issues.includes("TAHSILAT_KAYDI_MUTABAKATSIZ"));
  assert.ok(issues.includes("KUPON_VERGI_MATRAHI_INCELEME"));
  assert.ok(issues.includes("SIFIR_TL_MALI_BELGE_DEGIL"));
  assert.ok(issues.includes("SATICI_ILKOKU_DOGRULANMADI"));
  assert.equal(result.manifest.checkedGrossMinor,"0");
});

test("complete 0 TL snapshots remain traceable but never enter taxable accounting preparation",() => {
  const order = validOrder();
  order.orderNo = "ILK-ZERO-VALID-SNAPSHOT";
  order.originalAmount = 0n;
  order.discountAmount = 0n;
  order.finalAmount = 0n;
  order.commission = {
    commissionRateBps: 1500, serviceFeeRateBps: 500, source: "global",
    sourceEventId: null, calculationVersion: "rate-v1",
  };
  order.quote = {
    calculationVersion: "quote-v1", taxTreatment: "net_plus_vat",
    vatRateBasisPoints: 2000, listNetAmount: 0n, listVatAmount: 0n,
    listGrossAmount: 0n, discountGrossAmount: 0n, payableGrossAmount: 0n,
  };
  order.payments = [];
  const result = exportModule.buildDayCloseFiles({
    day: "2026-10-25",
    orders: [order],
    ledger: [{
      id: "ledger-zero", entryType: "sale_gross", amount: 0n,
      currency: "TRY", createdAt: order.paidAt,
      orderNo: order.orderNo, authorPublicId: order.authorPublicId,
    }],
    refunds: [],
  });
  assert.equal(result.manifest.salesCount, 1);
  assert.equal(result.manifest.zeroAmountCount, 1);
  assert.equal(result.manifest.readySalesCount, 0);
  assert.equal(result.manifest.flaggedSalesCount, 1);
  assert.equal(result.manifest.preparationRows, 0);
  assert.equal(result.manifest.reviewedAuthorSummaryGroups, 0);
  assert.equal(result.manifest.liraWorksheetRows, 0);
  for (const key of [
    "checkedGrossMinor", "checkedVatMinor",
    "reviewedCommissionIllustrationMinor", "reviewedServiceFeeIllustrationMinor",
  ]) {
    assert.equal(result.manifest[key], "0", key);
  }
  const csv = (name) => result.files.find(f => f.name === name).data;
  assert.ok(csv("siparisler.csv").includes(order.orderNo));
  assert.ok(csv("uyarilar.csv").includes("SIFIR_TL_MALI_BELGE_DEGIL"));
  for (const name of ["muhasebe_on_hazirlik.csv", "yazar_hesap_ozeti.csv", "muhasebe_tl_inceleme.csv"]) {
    assert.ok(!csv(name).includes(order.orderNo), name);
  }
});

test("day close route is admin-only, ZIP-only, non-mutating and excludes customer fiscal identity",() => {
  const route = source("src/app/admin/finans-gelirler/gun-sonu-aktarim/indir/route.ts");
  const repo = source("src/features/commerce/day-close-repository.ts");
  const page = source("src/app/admin/finans-gelirler/gun-sonu-aktarim/page.tsx");
  const overview = source("src/app/admin/finans-gelirler/page.tsx");
  assert.ok(route.includes('user.role !== "admin"'));
  assert.ok(route.includes('status: 403'));
  assert.ok(route.includes('Content-Type": "application/zip"'));
  assert.ok(route.includes("private, no-store"));
  assert.ok(repo.includes("closedDayRange(day, now)"));
  assert.ok(repo.includes("DAY_CLOSE_MAX_ROWS + 1"));
  assert.ok(repo.includes("status: { in: [\"paid\", \"refunded\"] }"));
  const cron = source("src/app/api/internal/commerce/day-close/route.ts");
  assert.ok(cron.includes("ILKOKU_DAY_CLOSE_CRON_SECRET"));
  assert.ok(cron.includes("ILKOKU_DAY_CLOSE_ARCHIVE_DIR"));
  assert.ok(cron.includes("timingSafeEqual("));
  assert.ok(cron.includes("constants.O_EXCL"));
  assert.ok(cron.includes('reason: "archived_day_changed_manual_review_required"'));
  assert.ok(cron.includes("previousIstanbulDay(now)"));
  assert.ok(cron.includes("result.manifest.flaggedSalesCount + result.manifest.flaggedRefundCount"));
  assert.ok(page.includes("İlkOku fatura düzenlemez."));
  assert.ok(overview.includes("gun-sonu-aktarim"));
  for (const code of [route,repo,cron]) {
    for (const forbidden of [
      "financialLedger.create(", "authorBalance.update(", "payment.create(",
      "payout.create(", "order.update(", "invoice.create(",
    ]) assert.ok(!code.includes(forbidden),"Never mutate financial data or issue invoices: "+forbidden);
  }
});

test("generic mapping is explicitly unverified and cannot serve as an invoice payload",() => {
  const result=make([validOrder()]);
  const map=JSON.parse(result.files.find(f=>f.name==="alan_esleme.json").data);
  assert.equal(map.status,"UNVERIFIED_VENDOR_MAPPING");
  for (const vendor of ["logo","mikro","parasut"]) {
    assert.equal(map.vendors[vendor].schemaVerified,false);
    assert.equal(map.vendors[vendor].automaticImportReady,false);
  }
  assert.equal(map.documentType,"NOT_DETERMINED");
  assert.equal(map.customerLegalIdentity,"NOT_EXPORTED_MUST_BE_VERIFIED_EXTERNALLY");
  const preparation=result.files.find(f=>f.name==="muhasebe_on_hazirlik.csv").data;
  assert.ok(preparation.includes("komisyon_net_ornek_kurus"));
  assert.ok(preparation.includes("2000"));
  assert.ok(preparation.includes("DIS_MUHASEBE_BELGE_KONTROLU_GEREKLI"));
  assert.equal(result.manifest.preparationRows,1);
});

test("missing, duplicate and wrong gross ledger entries block the accounting preparation",() => {
  const input={
    day:"2026-10-25",orders:[validOrder()],ledger:[],refunds:[],
  };
  const noLedger=exportModule.buildDayCloseFiles(input);
  assert.equal(noLedger.manifest.readySalesCount,0);
  assert.equal(noLedger.manifest.preparationRows,0);
  assert.equal(noLedger.manifest.unmatchedGrossLedgerOrderCount,1);
  assert.ok(noLedger.files.find(f=>f.name==="uyarilar.csv").data.includes("LEDGER_BRUT_SATIS_MUTABAKATSIZ"));
  const base={
    id:"entry01",entryType:"sale_gross",orderNo:"ILK-ABCDE1234",
    authorPublicId:"writer001",createdAt:new Date("2026-10-25T18:00:00+03:00"),
    currency:"TRY",amount:12000n,
  };
  const duplicate=exportModule.buildDayCloseFiles({
    ...input,ledger:[base,{...base,id:"entry02"}],
  });
  assert.equal(duplicate.manifest.readySalesCount,0);
  assert.equal(duplicate.manifest.preparationRows,0);
  const wrong=exportModule.buildDayCloseFiles({
    ...input,ledger:[{...base,amount:11900n}],
  });
  assert.equal(wrong.manifest.readySalesCount,0);
  const matched=exportModule.buildDayCloseFiles({...input,ledger:[base]});
  assert.equal(matched.manifest.readySalesCount,1);
  assert.equal(matched.manifest.preparationRows,1);
  const reconciliation=matched.files.find(f=>f.name==="mutabakat.csv").data;
  assert.ok(reconciliation.includes("LEDGER_KONTROLU_GECTI"));
  assert.ok(reconciliation.includes("TAHSILAT_KONTROLU_GECTI"));
  assert.ok(reconciliation.includes("TEMEL_MUTABAKAT_GECTI"));
});

test("coupon and uncertain seller are excluded from accountant preparation, never silently invoiced",() => {
  const order=validOrder();
  order.couponCode="TANITIM";
  const flagged=make([order]);
  assert.equal(flagged.manifest.preparationRows,0);
  assert.equal(flagged.files.find(f=>f.name==="muhasebe_on_hazirlik.csv").data.split("\r\n").filter(Boolean).length,1);
});

test("late post-midnight ledger reconciles prior paid day without polluting its daily ledger summary", () => {
  const crossDayLedger = {
    id:"late01",entryType:"sale_gross",amount:12000n,currency:"TRY",
    createdAt:new Date("2026-10-26T00:02:00+03:00"),
    orderNo:"ILK-ABCDE1234",authorPublicId:"writer001",
  };
  const result = exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[validOrder()],ledger:[],refunds:[],
    reconciliationLedger:[crossDayLedger],
  });
  assert.equal(result.manifest.readySalesCount,1);
  assert.equal(result.manifest.unmatchedGrossLedgerOrderCount,0);
  assert.equal(result.manifest.ledgerCount,0);
  assert.equal(result.manifest.ledgerSummaryGroups,0);
  const dayLedger=result.files.find(f=>f.name==="finans_hareketleri.csv").data;
  assert.ok(!dayLedger.includes("late01"),"Ledger posted next day must not appear in prior day's movement CSV");
  assert.ok(result.files.find(f=>f.name==="mutabakat.csv").data.includes("LEDGER_KONTROLU_GECTI"));
  assert.equal(result.manifest.preparationRows,1);
});

test("daily financial movements summarize signed minor units by type/currency without double counting", () => {
  const when=new Date("2026-10-25T13:00:00+03:00");
  const ledger=[
    {id:"a",entryType:"sale_gross",amount:12000n,currency:"TRY",createdAt:when,orderNo:"ILK-ABCDE1234",authorPublicId:"writer001"},
    {id:"b",entryType:"sale_gross",amount:4500n,currency:"TRY",createdAt:when,orderNo:"ILK-B",authorPublicId:"writer002"},
    {id:"c",entryType:"platform_commission",amount:600n,currency:"TRY",createdAt:when,orderNo:"ILK-B",authorPublicId:"writer002"},
    {id:"d",entryType:"refund",amount:-200n,currency:"TRY",createdAt:when,orderNo:"ILK-B",authorPublicId:"writer002"},
  ];
  const result=exportModule.buildDayCloseFiles({day:"2026-10-25",orders:[],ledger,refunds:[]});
  const sum=result.files.find(f=>f.name==="gun_sonu_ozet.csv").data;
  assert.equal(result.manifest.ledgerSummaryGroups,3);
  assert.ok(sum.includes('"sale_gross","TRY",2,16500'),"Gross entry count and amounts");
  assert.ok(sum.includes('"refund","TRY",1,-200'),"Preserve signed refund amounts");
  assert.ok(sum.includes('LEDGER_TURU_TOPLAMI_MUHASEBE_GELIRI_DEGIL'));
  assert.equal(result.manifest.readySalesCount,0);
});

test("repository loads sales' own ledger records independent of ledger day and keeps day ledger date-bounded", () => {
  const repo=source("src/features/commerce/day-close-repository.ts");
  assert.ok(repo.includes('financialLedgerEntries: {'));
  assert.ok(repo.includes('where: { entryType: "sale_gross" }'));
  assert.ok(repo.includes('reconciliationLedger: orders.flatMap'));
  assert.ok(repo.includes('prisma.financialLedger.findMany({'));
  assert.ok(repo.includes('where: { createdAt: { gte: period.start, lt: period.end } }'));
  assert.ok(repo.includes('order.refundedAt >= period.end'));
});

test("reconciliation CSV does not certify a mismatched or duplicate capture", () => {
  const order=validOrder();
  order.payments.push({ ...order.payments[0] });
  const result=make([order]);
  const ledgerResult=result.files.find(f=>f.name==="mutabakat.csv").data;
  assert.ok(ledgerResult.includes("LEDGER_KONTROLU_GECTI"));
  assert.ok(ledgerResult.includes("INCELEME_GEREKLI"));
  assert.ok(!ledgerResult.includes("TEMEL_MUTABAKAT_GECTI"));
  assert.equal(result.manifest.preparationRows,0);
});

test("0TL order unexpectedly carrying a successful capture is always flagged", () => {
  const order=validOrder();
  order.originalAmount=0n;
  order.finalAmount=0n;
  order.quote=null;
  order.payments=[{status:"succeeded",amount:1n,currency:"TRY",completedAt:order.paidAt}];
  const result=make([order]);
  const issues=result.files.find(f=>f.name==="uyarilar.csv").data;
  assert.ok(issues.includes("SIFIR_TL_GEREKSIZ_TAHSILAT"));
  assert.equal(result.manifest.preparationRows,0);
});


test("same-day partial refund on paid order blocks full commission and service previews without dropping source records", () => {
  const sale=validOrder();
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",
    orders:[sale],
    ledger:[{
      id:"sale-ledger",entryType:"sale_gross",amount:12000n,currency:"TRY",
      createdAt:new Date("2026-10-25T18:00:00+03:00"),
      orderNo:sale.orderNo,authorPublicId:sale.authorPublicId,
    }],
    refunds:[{
      id:"partial-same-day",orderNo:sale.orderNo,amount:2500n,currency:"TRY",
      status:"processed",processedAt:new Date("2026-10-25T20:00:00+03:00"),
      orderCurrency:"TRY",orderFinalAmount:12000n,orderPaidAt:sale.paidAt,
      cumulativeProcessedAmount:2500n,historicalCurrencyMismatch:false,
    }],
  });
  assert.equal(result.manifest.salesCount,1);
  assert.equal(result.manifest.refundsCount,1);
  assert.equal(result.manifest.flaggedSalesCount,1);
  assert.equal(result.manifest.preparationRows,0);
  assert.equal(result.manifest.reviewedCommissionIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedCommissionVatIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedServiceFeeVatIllustrationMinor,"0");
  assert.ok(result.files.find(x=>x.name==="uyarilar.csv").data
    .includes("SATIS_GUNU_IADE_MALI_INCELEME"));
  assert.ok(result.files.find(x=>x.name==="siparisler.csv").data.includes("12000"));
  assert.ok(result.files.find(x=>x.name==="iadeler.csv").data.includes("2500"));
  assert.ok(result.files.find(x=>x.name==="gunluk_satis_iade_koprusu.csv").data
    .includes('"TRY",1,0,1,12000,0,1,1,0,2500,2500,9500'));
});

test("processed refunds reconcile to paid order and cumulative historical balance", () => {
  const common={
    orderNo: "ILK-PAID-2026", status: "processed",
    processedAt: new Date("2026-10-25T17:00:00+03:00"),
    orderCurrency: "TRY", currency: "TRY",
    orderFinalAmount: 12000n,
    orderPaidAt: new Date("2026-10-20T14:00:00+03:00"),
    historicalCurrencyMismatch: false,
  };
  const ok=exportModule.buildDayCloseFiles({
    day: "2026-10-25",orders:[],ledger:[],
    refunds:[{...common,id:"r1",amount:5000n,cumulativeProcessedAmount:9000n}],
  });
  assert.equal(ok.manifest.flaggedRefundCount,0);
  assert.equal(ok.manifest.reviewedRefundMinor,"5000");
  assert.ok(ok.files.find(f=>f.name==="iadeler.csv").data.includes("TEMEL_KONTROL_GECTI"));
  assert.ok(!ok.files.find(f=>f.name==="uyarilar.csv").data.includes("KUMULATIF_IADE_TAHSILATI_ASIYOR"));
  const over=exportModule.buildDayCloseFiles({
    day: "2026-10-25",orders:[],ledger:[],
    refunds:[{...common,id:"r2",amount:6000n,cumulativeProcessedAmount:15000n}],
  });
  assert.equal(over.manifest.flaggedRefundCount,1);
  assert.equal(over.manifest.reviewedRefundMinor,"0");
  assert.ok(over.files.find(f=>f.name==="uyarilar.csv").data.includes("KUMULATIF_IADE_TAHSILATI_ASIYOR"));
  assert.ok(over.files.find(f=>f.name==="iadeler.csv").data.includes("INCELEME_GEREKLI"));
});

test("refunds reject currency mismatch, missing historical sum, zero amount and never create ledger records", () => {
  const disputed=exportModule.buildDayCloseFiles({
    day: "2026-10-25",orders:[],ledger:[],
    refunds:[{
      id:"bad",orderNo:"ILK-FOREIGN",amount:0n,currency:"EUR",
      status:"processed",processedAt:new Date("2026-10-25T12:00:00+03:00"),
      orderCurrency:"TRY",orderFinalAmount:12000n,orderPaidAt:null,
      historicalCurrencyMismatch:true,
    }],
  });
  assert.equal(disputed.manifest.flaggedRefundCount,1);
  const issues=disputed.files.find(f=>f.name==="uyarilar.csv").data;
  assert.ok(issues.includes("IADE_PARA_BIRIMI_UYUSMAZLIGI"));
  assert.ok(issues.includes("IADE_TUTARI_GECERSIZ"));
  assert.ok(issues.includes("IADE_ORIJINAL_ODEME_DURUMU_DOGRULANAMADI"));
  assert.ok(issues.includes("KUMULATIF_IADE_TAHSILATI_ASIYOR"));
  assert.equal(disputed.manifest.preparationRows,0);
});

test("refund repository aggregates all processed refunds only up to closing date", () => {
  const repository=source("src/features/commerce/day-close-repository.ts");
  assert.ok(repository.includes('prisma.refund.groupBy({'));
  assert.ok(repository.includes('by: ["orderId", "currency"]'));
  assert.ok(repository.includes('processedAt: { lt: period.end }'));
  assert.ok(repository.includes('cumulativeProcessedAmount: refundTotals.get(refund.orderId)'));
  assert.ok(!repository.includes("refund.create("));
});


test("verified invoice authors have zero intermediary service, verified GVK18 has a distinct 5% illustration", () => {
  const gvk=make([validOrder()]);
  const gvkLine=gvk.files.find(f=>f.name==="muhasebe_on_hazirlik.csv").data;
  assert.ok(gvkLine.includes('"gvk18_expense_receipt"'));
  assert.ok(gvkLine.includes(",2000,2000,500,500,"));
  assert.equal(gvk.manifest.reviewedCommissionIllustrationMinor,"2000");
  assert.equal(gvk.manifest.reviewedServiceFeeIllustrationMinor,"500");
  assert.equal(gvk.manifest.reviewedGvk18DocumentSales,1);
  const invoiced=validOrder();
  invoiced.taxReview={...invoiced.taxReview,documentKind:"commercial_invoice"};
  const standard=make([invoiced]);
  const standardLine=standard.files.find(f=>f.name==="muhasebe_on_hazirlik.csv").data;
  assert.ok(standardLine.includes('"commercial_invoice"'));
  assert.ok(standardLine.includes(",2000,2000,0,0,"));
  assert.equal(standard.manifest.reviewedServiceFeeIllustrationMinor,"0");
  assert.equal(standard.manifest.reviewedInvoiceDocumentSales,1);
  const selfEmployed=validOrder();
  selfEmployed.taxReview={...selfEmployed.taxReview,documentKind:"self_employed_receipt"};
  assert.equal(make([selfEmployed]).manifest.reviewedServiceFeeIllustrationMinor,"0");
});

test("default 15% frozen order commission stays separate from document-specific 5% fee", () => {
  const writer=validOrder();
  writer.commission={...writer.commission,commissionRateBps:1500,source:"global",sourceEventId:null};
  const result=make([writer]);
  assert.equal(result.manifest.reviewedCommissionIllustrationMinor,"1500");
  assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"500");
});

test("tax review expiring exactly at payment timestamp is not valid", () => {
  const sale=validOrder();
  sale.taxReview={...sale.taxReview,validUntil:sale.paidAt};
  const result=make([sale]);
  assert.equal(result.manifest.preparationRows,0);
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("YAZAR_MALI_BELGE_DOGRULANAMADI"));
});

test("missing, later, revoked and expired tax reviews fail closed for accountant export", () => {
  const variants=[
    null,
    {documentKind:"gvk18_expense_receipt",decision:"verified",
      reviewedAt:new Date("2026-10-26T12:00:00+03:00"),validUntil:null},
    {documentKind:"gvk18_expense_receipt",decision:"revoked",
      reviewedAt:new Date("2026-10-20T12:00:00+03:00"),validUntil:null},
    {documentKind:"gvk18_expense_receipt",decision:"verified",
      reviewedAt:new Date("2026-10-20T12:00:00+03:00"),
      validUntil:new Date("2026-10-21T00:00:00+03:00")},
  ];
  for (const review of variants) {
    const order=validOrder();
    order.taxReview=review;
    const result=make([order]);
    assert.equal(result.manifest.readySalesCount,0);
    assert.equal(result.manifest.preparationRows,0);
    assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"0");
    assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("YAZAR_MALI_BELGE_DOGRULANAMADI"));
  }
});

test("daily export retrieves document reviews as of paidAt, never asks later live status", () => {
  const repo=source("src/features/commerce/day-close-repository.ts");
  assert.ok(repo.includes("prisma.authorTaxReviewEvent.findMany({"));
  assert.ok(repo.includes('reviewedAt: { lt: period.end }'));
  assert.ok(repo.includes("event.reviewedAt <= order.paidAt"));
  assert.ok(repo.includes("reviewEvents.length > DAY_CLOSE_MAX_ROWS"));
});


test("writer-level summary separates faturalı %0 and verified GVK18 %5 service earnings", () => {
  const gvk=validOrder();
  const invoice=validOrder();
  invoice.orderNo="ILK-INVOICE-2";
  invoice.taxReview={...invoice.taxReview,documentKind:"commercial_invoice"};
  const ledger=(orderNo,id)=>({
    id,orderNo,entryType:"sale_gross",amount:12000n,currency:"TRY",
    createdAt:new Date("2026-10-25T18:00:00+03:00"),
    authorPublicId:"writer001",
  });
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[gvk,invoice],
    ledger:[ledger(gvk.orderNo,"g1"),ledger(invoice.orderNo,"i2")],refunds:[],
  });
  assert.equal(result.manifest.readySalesCount,2);
  assert.equal(result.manifest.reviewedAuthorSummaryGroups,2);
  assert.equal(result.manifest.reviewedGvk18DocumentSales,1);
  assert.equal(result.manifest.reviewedInvoiceDocumentSales,1);
  assert.equal(result.manifest.reviewedCommissionIllustrationMinor,"4000");
  assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"500");
  const authorRows=result.files.find(f=>f.name==="yazar_hesap_ozeti.csv").data;
  assert.ok(authorRows.includes('"gvk18_expense_receipt"'));
  assert.ok(authorRows.includes('"commercial_invoice"'));
  assert.ok(authorRows.includes(",2000,500,"));
  assert.ok(authorRows.includes(",2000,0,"));
  assert.equal(authorRows.split("\r\n").filter(Boolean).length,3);
});


test("Turkish-lira worksheet preserves exact minor units without floating-point rounding", () => {
  assert.equal(exportModule.minorToTurkishLira(0n),"0,00");
  assert.equal(exportModule.minorToTurkishLira(1n),"0,01");
  assert.equal(exportModule.minorToTurkishLira(12345n),"123,45");
  assert.equal(exportModule.minorToTurkishLira(-12345n),"-123,45");
  assert.equal(exportModule.minorToTurkishLira(900719925474099314n),"9007199254740993,14");
  const result=make([validOrder()]);
  const sheet=result.files.find(f=>f.name==="muhasebe_tl_inceleme.csv");
  assert.ok(sheet);
  assert.ok(sheet.data.startsWith("\uFEFF"));
  assert.ok(sheet.data.includes('"100,00";"20,00";"120,00";"20,00";"5,00"'));
  assert.equal(sheet.data.split("\r\n").filter(Boolean).length,2);
  assert.equal(result.manifest.liraWorksheetRows,1);
  const map=JSON.parse(result.files.find(f=>f.name==="alan_esleme.json").data);
  assert.equal(map.localeWorksheet.delimiter,";");
  assert.equal(map.localeWorksheet.decimalSeparator,",");
  assert.equal(map.localeWorksheet.status,"ACCOUNTANT_REVIEW_ONLY_NOT_VENDOR_CERTIFIED");
});

test("only reconciled sales enter Turkish-lira accountant worksheet", () => {
  const bad=validOrder();bad.orderNo="ILK-NO-LEDGER";
  const result=make([bad]);
  assert.equal(result.manifest.liraWorksheetRows,0);
  assert.equal(result.files.find(f=>f.name==="muhasebe_tl_inceleme.csv").data.split("\r\n").filter(Boolean).length,1);
});

test("semicolon-delimited accountant CSV escapes untrusted formulas and delimiters", () => {
  const rows=[["alan","deger"],["=SUM(1;2)","safety;check"],["\u0009+HYPERLINK",null]];
  const csv=exportModule.safeCsvDelimited(rows,";");
  assert.ok(csv.includes("'=SUM"));
  assert.ok(csv.includes('"safety;check"'));
  assert.ok(csv.includes("'\u0009+HYPERLINK"));
});


test("refund status never erases verified original capture in earlier sales close", () => {
  const refundedPayment=validOrder();
  refundedPayment.payments=[{
    status:"refunded",amount:12000n,currency:"TRY",
    completedAt:new Date("2026-10-25T18:00:00+03:00"),
  }];
  const result=make([refundedPayment]);
  assert.equal(result.manifest.readySalesCount,1);
  assert.equal(result.manifest.preparationRows,1);
  const reconcile=result.files.find(f=>f.name==="mutabakat.csv").data;
  assert.ok(reconcile.includes("TEMEL_MUTABAKAT_GECTI"));
  assert.ok(!result.files.find(f=>f.name==="uyarilar.csv").data.includes("TAHSILAT_KAYDI_MUTABAKATSIZ"));
});

test("refunded payment without historical completion proof is never treated as captured", () => {
  const invalid=validOrder();
  invalid.payments=[{status:"refunded",amount:12000n,currency:"TRY",completedAt:null}];
  const result=make([invalid]);
  assert.equal(result.manifest.readySalesCount,0);
  assert.equal(result.manifest.preparationRows,0);
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("TAHSILAT_KAYDI_MUTABAKATSIZ"));
});

test("refunded payment completed AFTER the order paid date cannot certify old sale", () => {
  const invalid=validOrder();
  invalid.payments=[{
    status:"refunded",amount:12000n,currency:"TRY",
    completedAt:new Date("2026-10-26T11:00:00+03:00"),
  }];
  const result=make([invalid]);
  assert.equal(result.manifest.readySalesCount,0);
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("TAHSILAT_KAYDI_MUTABAKATSIZ"));
});

test("already-succeeded payment completed in future cannot pass past-day close", () => {
  const invalid=validOrder();
  invalid.payments=[{
    status:"succeeded",amount:12000n,currency:"TRY",
    completedAt:new Date("2026-10-26T11:00:00+03:00"),
  }];
  const result=make([invalid]);
  assert.equal(result.manifest.readySalesCount,0);
  assert.equal(result.manifest.preparationRows,0);
});

test("repository includes payment completedAt for historical refund reconciliation", () => {
  const repo=source("src/features/commerce/day-close-repository.ts");
  assert.ok(repo.includes("status: true, amount: true, currency: true, completedAt: true"));
});


test("a succeeded payment without a verifiable original completion date is blocked", () => {
  const noProof=validOrder();
  noProof.payments=[{status:"succeeded",amount:12000n,currency:"TRY",completedAt:null}];
  const result=make([noProof]);
  assert.equal(result.manifest.readySalesCount,0);
  assert.equal(result.manifest.preparationRows,0);
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("TAHSILAT_TARIH_KANITI_EKSIK_GECERSIZ"));
});

test("a second unproven captured payment cannot silently pass as one verified payment", () => {
  const duplicate=validOrder();
  duplicate.payments.push({
    status:"refunded",amount:12000n,currency:"TRY",
    completedAt:new Date("2026-10-26T12:00:00+03:00"),
  });
  const result=make([duplicate]);
  assert.equal(result.manifest.readySalesCount,0);
  const issues=result.files.find(f=>f.name==="uyarilar.csv").data;
  assert.ok(issues.includes("TAHSILAT_TARIH_KANITI_EKSIK_GECERSIZ"));
});


test("sale paid outside Istanbul closing day cannot reach accounting preparation", () => {
  const order=validOrder();
  order.paidAt=new Date("2026-10-26T00:01:00+03:00");
  const result=make([order]);
  assert.equal(result.manifest.readySalesCount,0);
  assert.equal(result.manifest.liraWorksheetRows,0);
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("ODEME_TARIHI_IS_GUNU_DISINDA"));
});

test("refund dated outside period or preceding original payment is flagged", () => {
  const base={
    id:"refund-cross-date",orderNo:"ILK-ABCDE1234",amount:1000n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-26T00:01:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-25T18:00:00+03:00"),
    cumulativeProcessedAmount:1000n,historicalCurrencyMismatch:false,
  };
  const late=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[],refunds:[base],
  });
  assert.equal(late.manifest.flaggedRefundCount,1);
  assert.ok(late.files.find(f=>f.name==="uyarilar.csv").data.includes("IADE_TARIHI_IS_GUNU_DISINDA"));
  const beforePayment=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[],
    refunds:[{...base,processedAt:new Date("2026-10-25T17:00:00+03:00")}],
  });
  assert.equal(beforePayment.manifest.flaggedRefundCount,1);
  assert.ok(beforePayment.files.find(f=>f.name==="uyarilar.csv").data.includes("IADE_ODEMEDEN_ONCE"));
});

test("wrong-day ledger entry is reported and bad day identifiers are refused", () => {
  const ledger={
    id:"late-day",entryType:"sale_gross",amount:12000n,currency:"TRY",
    createdAt:new Date("2026-10-26T00:01:00+03:00"),
    orderNo:"ILK-ABCDE1234",authorPublicId:"writer001",
  };
  const result=exportModule.buildDayCloseFiles({day:"2026-10-25",orders:[],ledger:[ledger],refunds:[]});
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv").data.includes("HAREKET_TARIHI_IS_GUNU_DISINDA"));
  assert.throws(() => exportModule.buildDayCloseFiles({
    day:"2026-02-30",orders:[],ledger:[],refunds:[],
  }),/Invalid Istanbul business date/);
});


test("same-day refund ledger reconciliation accepts signed or unsigned amounts but not missing entries", () => {
  const base={
    id:"r-1",orderNo:"ILK-REFUND-1",amount:4200n,currency:"TRY",status:"processed",
    processedAt:new Date("2026-10-25T16:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-20T12:00:00+03:00"),
    cumulativeProcessedAmount:4200n,historicalCurrencyMismatch:false,
  };
  const refundLedger=(amount,id="f-1")=>({
    id,entryType:"refund",amount,currency:"TRY",orderNo:base.orderNo,
    authorPublicId:"writer001",
    createdAt:new Date("2026-10-25T16:01:00+03:00"),
  });
  for(const amount of [-4200n,4200n]){
    const result=exportModule.buildDayCloseFiles({
      day:"2026-10-25",orders:[],ledger:[refundLedger(amount)],refunds:[base],
    });
    assert.equal(result.manifest.refundLedgerMatchedGroups,1);
    assert.equal(result.manifest.refundLedgerReviewGroups,0);
    assert.ok(result.files.find(f=>f.name==="iade_ledger_mutabakat.csv")
      .data.includes("GUNLUK_TUTAR_ESLESTI"));
  }
  const missing=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[],refunds:[base],
  });
  assert.equal(missing.manifest.refundLedgerMatchedGroups,0);
  assert.equal(missing.manifest.refundLedgerReviewGroups,1);
  assert.ok(missing.files.find(f=>f.name==="uyarilar.csv")
    .data.includes("DONEMDE_IADE_LEDGER_KARSILIGI_YOK"));
  assert.equal(missing.manifest.reviewedRefundMinor,"4200",
    "Refund validation is independent of whether its ledger was posted this day");
});

test("partial refunds on the same day match the aggregated ledger, never only first refund", () => {
  const r1={id:"r1",orderNo:"ILK-R",amount:1200n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-25T11:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-24T11:00:00+03:00"),
    cumulativeProcessedAmount:3000n,historicalCurrencyMismatch:false};
  const r2={...r1,id:"r2",amount:1800n,
    processedAt:new Date("2026-10-25T13:00:00+03:00")};
  const ledger={id:"entry",entryType:"refund",orderNo:"ILK-R",
    authorPublicId:"writer001",currency:"TRY",amount:-3000n,
    createdAt:new Date("2026-10-25T13:02:00+03:00")};
  const equal=exportModule.buildDayCloseFiles({day:"2026-10-25",orders:[],
    ledger:[ledger],refunds:[r1,r2]});
  assert.equal(equal.manifest.refundLedgerMatchedGroups,1);
  assert.ok(equal.files.find(f=>f.name==="iade_ledger_mutabakat.csv")
    .data.includes(",2,3000,1,-3000,3000,"));
  const wrong=exportModule.buildDayCloseFiles({day:"2026-10-25",orders:[],
    ledger:[{...ledger,amount:-2500n}],refunds:[r1,r2]});
  assert.equal(wrong.manifest.refundLedgerReviewGroups,1);
  assert.ok(wrong.files.find(f=>f.name==="uyarilar.csv")
    .data.includes("IADE_LEDGER_TOPLAM_TUTARSIZ"));
});

test("ledger without same-day processed refund, missing order binding, and sign cancellation are review only", () => {
  const common={entryType:"refund",currency:"TRY",amount:-1000n,
    createdAt:new Date("2026-10-25T11:00:00+03:00"),
    authorPublicId:"writer001"};
  const result=exportModule.buildDayCloseFiles({day:"2026-10-25",orders:[],refunds:[],
    ledger:[
      {...common,id:"other-day",orderNo:"ILK-PREV"},
      {...common,id:"unbound",orderNo:null},
    ]});
  assert.equal(result.manifest.refundLedgerReviewGroups,2);
  const issues=result.files.find(f=>f.name==="uyarilar.csv").data;
  assert.ok(issues.includes("DONEMDE_ISLENMIS_IADE_KAYDI_YOK"));
  assert.ok(issues.includes("IADE_LEDGER_SIPARIS_BAGI_YOK"));

  const base={id:"r3",orderNo:"ILK-MIXED",amount:1000n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-25T15:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-20T11:00:00+03:00"),
    cumulativeProcessedAmount:1000n,historicalCurrencyMismatch:false};
  const mixed=exportModule.buildDayCloseFiles({day:"2026-10-25",orders:[],
    refunds:[base],ledger:[
      {...common,id:"pos",orderNo:base.orderNo,amount:500n},
      {...common,id:"neg",orderNo:base.orderNo,amount:-500n},
    ]});
  assert.equal(mixed.manifest.refundLedgerMatchedGroups,0);
  assert.ok(mixed.files.find(f=>f.name==="uyarilar.csv")
    .data.includes("IADE_LEDGER_TOPLAM_TUTARSIZ"));
});

test("cross-period refund ledger entries cannot pass same-day refund reconciliation", () => {
  const refund={id:"r4",orderNo:"ILK-LATE",amount:1000n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-25T12:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-24T12:00:00+03:00"),
    cumulativeProcessedAmount:1000n,historicalCurrencyMismatch:false};
  const late={id:"post-next-day",entryType:"refund",
    orderNo:refund.orderNo,authorPublicId:"writer001",currency:"TRY",
    amount:-1000n,createdAt:new Date("2026-10-26T00:01:00+03:00")};
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[late],refunds:[refund],
  });
  assert.equal(result.manifest.refundLedgerMatchedGroups,0);
  assert.equal(result.manifest.refundLedgerReviewGroups,1);
  assert.ok(result.files.find(f=>f.name==="uyarilar.csv")
    .data.includes("HAREKET_TARIHI_IS_GUNU_DISINDA"));
});


test("daily sales-refund period bridge does not conflate different order cohorts with profit", () => {
  const sale=validOrder();
  const refund={
    id:"r1",orderNo:"ILK-EARLIER-ORDER",amount:4200n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-25T12:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-20T12:00:00+03:00"),
    cumulativeProcessedAmount:4200n,historicalCurrencyMismatch:false,
  };
  const ledger={id:"sale",entryType:"sale_gross",orderNo:sale.orderNo,
    amount:12000n,currency:"TRY",authorPublicId:"writer001",
    createdAt:new Date("2026-10-25T18:00:00+03:00")};
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[sale],ledger:[ledger],refunds:[refund],
  });
  const csv=result.files.find(f=>f.name==="gunluk_satis_iade_koprusu.csv").data;
  assert.ok(csv.includes('"TRY",1,1,0,12000,12000,1,1,0,4200,4200,7800'));
  assert.ok(csv.includes("net gelir, nakit, kar veya vergi degildir"));
  assert.equal(result.manifest.periodBridgeCurrencyGroups,1);
});

test("refund on an older purchase alone creates negative arithmetic period bridge, not booked loss", () => {
  const refund={
    id:"r2",orderNo:"ILK-PAST",amount:1200n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-25T11:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:3000n,
    orderPaidAt:new Date("2026-10-20T11:00:00+03:00"),
    cumulativeProcessedAmount:1200n,historicalCurrencyMismatch:false,
  };
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[],refunds:[refund],
  });
  assert.ok(result.files.find(f=>f.name==="gunluk_satis_iade_koprusu.csv").data
    .includes('"TRY",0,0,0,0,0,1,1,0,1200,1200,-1200'));
  assert.equal(result.manifest.preparationRows,0);
});

test("daily bridge separates invalid sales and refunds from technical-review totals", () => {
  const bad=validOrder();bad.sellerMode=null;
  const result=make([bad]);
  assert.equal(result.manifest.readySalesCount,0);
  assert.ok(result.files.find(f=>f.name==="gunluk_satis_iade_koprusu.csv").data
    .includes('"TRY",1,0,1,12000,0,0,0,0,0,0,12000'));
});

test("daily bridge never mixes currencies or includes a sale outside selected business day", () => {
  const bad=validOrder();bad.paidAt=new Date("2026-10-26T00:01:00+03:00");
  const refund={
    id:"eur",orderNo:"ILK-OTHER",amount:1000n,currency:"EUR",
    status:"processed",processedAt:new Date("2026-10-25T11:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:5000n,
    orderPaidAt:new Date("2026-10-20T11:00:00+03:00"),
    cumulativeProcessedAmount:1000n,historicalCurrencyMismatch:true,
  };
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[bad],ledger:[],refunds:[refund],
  });
  const csv=result.files.find(f=>f.name==="gunluk_satis_iade_koprusu.csv").data;
  assert.equal(result.manifest.periodBridgeCurrencyGroups,1);
  assert.ok(csv.includes('"EUR",0,0,0,0,0,1,0,1,1000,0,-1000'));
  assert.ok(!csv.includes('"TRY"'));
});


test("duplicate order numbers refuse archive rather than double booking revenue", () => {
  const first=validOrder();
  const second={...validOrder(),workTitle:"A second duplicated row"};
  assert.throws(()=>exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[first,second],ledger:[],refunds:[],
  }),/DAY_CLOSE_DUPLICATE_ORDER_REFERENCE/);
});

test("duplicate refund IDs refuse archive rather than doubling refund totals", () => {
  const refund={
    id:"R-REPEATED",orderNo:"ILK-PREV",amount:1500n,currency:"TRY",
    status:"processed",processedAt:new Date("2026-10-25T12:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-20T12:00:00+03:00"),
    cumulativeProcessedAmount:1500n,historicalCurrencyMismatch:false,
  };
  assert.throws(()=>exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[],refunds:[refund,{...refund}],
  }),/DAY_CLOSE_DUPLICATE_REFUND_REFERENCE/);
});

test("duplicate same-day or per-order ledger IDs cannot enter archive twice", () => {
  const ledger={
    id:"LEDGER-DUP",entryType:"sale_gross",orderNo:"ILK-ABCDE1234",
    amount:12000n,currency:"TRY",authorPublicId:"writer001",
    createdAt:new Date("2026-10-25T18:00:00+03:00"),
  };
  assert.throws(()=>exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[],ledger:[ledger,{...ledger}],refunds:[],
  }),/DAY_CLOSE_DUPLICATE_LEDGER_REFERENCE/);
  assert.throws(()=>exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[validOrder()],ledger:[],refunds:[],
    reconciliationLedger:[ledger,{...ledger}],
  }),/DAY_CLOSE_DUPLICATE_RECONCILIATION_LEDGER_REFERENCE/);
});

test("same ledger ID legitimately appears once in both daily and per-order evidence", () => {
  const ledger={
    id:"SAME-LEGITIMATE-ID",entryType:"sale_gross",orderNo:"ILK-ABCDE1234",
    amount:12000n,currency:"TRY",authorPublicId:"writer001",
    createdAt:new Date("2026-10-25T18:00:00+03:00"),
  };
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[validOrder()],
    ledger:[ledger],reconciliationLedger:[ledger],refunds:[],
  });
  assert.equal(result.manifest.readySalesCount,1);
  assert.equal(result.manifest.preparationRows,1);
  assert.equal(result.manifest.ledgerCount,1);
  assert.equal(result.manifest.checkedGrossMinor,"12000");
});

test("missing identifiers fail closed with typed errors and safe admin reasons", () => {
  const badOrder=validOrder();badOrder.orderNo="";
  assert.throws(()=>exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[badOrder],ledger:[],refunds:[],
  }),/DAY_CLOSE_EMPTY_ORDER_REFERENCE/);
  const repo=source("src/features/commerce/day-close-repository.ts");
  assert.ok(repo.includes("error instanceof DayCloseDataIntegrityError"));
  assert.ok(repo.includes("paket oluşturulmadı"));
});

test("distinct orders and partial refunds remain independent in same-day totals", () => {
  const first=validOrder();
  const second=validOrder();
  second.orderNo="ILK-OTHER-ORDER";second.authorPublicId="writer002";
  const gross=(orderNo,id,authorPublicId)=>({
    id,entryType:"sale_gross",orderNo,amount:12000n,currency:"TRY",
    authorPublicId,createdAt:new Date("2026-10-25T18:00:00+03:00"),
  });
  const refund=(id,orderNo,amount)=>({
    id,orderNo,amount,currency:"TRY",status:"processed",
    processedAt:new Date("2026-10-25T15:00:00+03:00"),
    orderCurrency:"TRY",orderFinalAmount:12000n,
    orderPaidAt:new Date("2026-10-20T14:00:00+03:00"),
    cumulativeProcessedAmount:3000n,historicalCurrencyMismatch:false,
  });
  const refunds=[
    refund("r-a","ILK-EARLIER-ORDER",1200n),
    refund("r-b","ILK-EARLIER-ORDER",1800n),
  ];
  const result=exportModule.buildDayCloseFiles({
    day:"2026-10-25",orders:[first,second],
    ledger:[gross(first.orderNo,"g1",first.authorPublicId),
      gross(second.orderNo,"g2",second.authorPublicId)],
    refunds,
  });
  assert.equal(result.manifest.salesCount,2);
  assert.equal(result.manifest.readySalesCount,2);
  assert.equal(result.manifest.refundsCount,2);
  assert.equal(result.manifest.reviewedRefundMinor,"3000");
  assert.equal(result.manifest.checkedGrossMinor,"24000");
  assert.equal(result.manifest.reviewedAuthorSummaryGroups,2);
  const bridge=result.files.find(f=>f.name==="gunluk_satis_iade_koprusu.csv").data;
  assert.ok(bridge.includes('"TRY",2,2,0,24000,24000,2,2,0,3000,3000,21000'));
});


test("offline archive comparison: unchanged business day is byte-for-byte identical", () => {
  const first=make([validOrder()]);
  const same=make([validOrder()]);
  const parsed=inspectDayCloseArchive(first.zip);
  assert.equal(parsed.verifiedFileCount,13);
  assert.equal(parsed.manifest.day,"2026-10-25");
  assert.equal(parsed.manifest.fileHashes["siparisler.csv"],
    createHash("sha256").update(first.files.find(f=>f.name==="siparisler.csv").data).digest("hex"));
  const compare=compareDayCloseArchives(first.zip,same.zip);
  assert.equal(compare.day,"2026-10-25");
  assert.equal(compare.result,"IDENTICAL");
  assert.equal(compare.archiveChanged,false);
  assert.equal(compare.noWritesPerformed,true);
  assert.deepEqual(compare.changedFiles,[]);
  assert.deepEqual(compare.changedMetrics,[]);
});

test("offline archive comparison: a later modification to the same day's work is flagged", () => {
  const old=make([validOrder()]);
  const changedOrder=validOrder();
  changedOrder.workTitle="Updated after first close";
  const newer=make([changedOrder]);
  const report=compareDayCloseArchives(old.zip,newer.zip);
  assert.equal(report.day,"2026-10-25");
  assert.equal(report.result,"CHANGED_REVIEW_REQUIRED");
  assert.equal(report.archiveChanged,true);
  assert.equal(report.manifestChanged,true);
  assert.ok(report.changedFiles.includes("siparisler.csv"));
  assert.ok(report.changedFiles.includes("muhasebe_on_hazirlik.csv"));
  assert.ok(report.changedFiles.includes("muhasebe_tl_inceleme.csv"));
  assert.notEqual(report.previousSha256,report.currentSha256);
  assert.equal(report.noWritesPerformed,true);
});

test("offline archive comparison rejects corrupt or modified CSV even if manifest still exists", () => {
  const original=make([validOrder()]);
  const tampered=Buffer.from(original.zip);
  const i=tampered.indexOf("Kitap 1");
  assert.ok(i>0,"source archive contains the work name");
  tampered[i]="x".charCodeAt(0);
  assert.throws(()=>inspectDayCloseArchive(tampered),
    /DAY_CLOSE_COMPARE_INVALID_ENTRY_CRC/);
});

test("offline archive comparison rejects a missing or changed manifest checksum", () => {
  const original=make([validOrder()]);
  const tampered=Buffer.from(original.zip);
  const i=tampered.indexOf("ILK-DAY-2026-10-25");
  assert.ok(i>0);
  tampered[i]="X".charCodeAt(0);
  assert.throws(()=>inspectDayCloseArchive(tampered),
    /DAY_CLOSE_COMPARE_INVALID_ENTRY_CRC/);
});

test("offline archive comparison refuses to compare two different closing days", () => {
  const first=make([validOrder()]);
  const previousDay=exportModule.buildDayCloseFiles({
    day:"2026-10-24",orders:[],ledger:[],refunds:[],
  });
  assert.throws(()=>compareDayCloseArchives(first.zip,previousDay.zip),
    /DAY_CLOSE_COMPARE_INVALID_DIFFERENT_DAYS/);
});

test("offline archive comparison refuses duplicate ZIP entries and unsupported compression", () => {
  const data=make([validOrder()]);
  const duplicate=exportModule.zipFiles([
    {name:"manifest.json",data:JSON.stringify(data.manifest)},
    {name:"manifest.json",data:JSON.stringify(data.manifest)},
  ]);
  assert.throws(()=>inspectDayCloseArchive(duplicate),
    /DAY_CLOSE_COMPARE_INVALID_ENTRY_NAME/);
  const unsupported=Buffer.from(data.zip);
  unsupported.writeUInt16LE(8,8); // deflate method, not day-close STORE
  assert.throws(()=>inspectDayCloseArchive(unsupported),
    /DAY_CLOSE_COMPARE_INVALID_UNSUPPORTED_ZIP_METHOD/);
});


test("offline day-close CLI returns status 0 same, 2 changed, 1 invalid without writing outputs", () => {
  const temp=mkdtempSync(join(tmpdir(),"ilkoku-close-compare-"));
  try {
    const older=join(temp,"earlier.zip");
    const newer=join(temp,"later.zip");
    writeFileSync(older,make([validOrder()]).zip);
    const changedOrder=validOrder();
    changedOrder.workTitle="Updated work";
    writeFileSync(newer,make([changedOrder]).zip);
    const cli=join(root,"scripts/commerce-day-close-compare.mjs");
    const run=(a,b)=>spawnSync(process.execPath,[cli,a,b],{
      encoding:"utf8",timeout:10000,
    });
    const equal=run(older,older);
    assert.equal(equal.status,0,equal.stderr);
    assert.equal(JSON.parse(equal.stdout).result,"IDENTICAL");
    const changed=run(older,newer);
    assert.equal(changed.status,2,changed.stderr);
    assert.ok(JSON.parse(changed.stdout).changedFiles.includes("siparisler.csv"));
    const previousDay=join(temp,"other-day.zip");
    writeFileSync(previousDay,exportModule.buildDayCloseFiles({
      day:"2026-10-24",orders:[],ledger:[],refunds:[],
    }).zip);
    const invalid=run(older,previousDay);
    assert.equal(invalid.status,1,invalid.stderr);
    assert.match(invalid.stderr,/DAY_CLOSE_COMPARE_INVALID_DIFFERENT_DAYS/);
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});


test("offline comparison reports frozen commission amount changes in financial metrics", () => {
  const previous=make([validOrder()]);
  const changed=validOrder();
  changed.commission={...changed.commission,commissionRateBps:1500};
  const updated=make([changed]);
  const result=compareDayCloseArchives(previous.zip,updated.zip);
  assert.equal(result.changeAssessment,"FINANCIAL_TOTALS_CHANGED");
  assert.ok(result.changedFinancialMetrics.some(item =>
    item.field==="reviewedCommissionIllustrationMinor" &&
    item.previous==="2000" && item.current==="1500"));
  assert.equal(result.changedFinancialMetrics.find(item=>
    item.field==="reviewedCommissionIllustrationMinor").category,"financial");
  assert.ok(result.changedMetrics.some(item =>
    item.field==="reviewedCommissionIllustrationMinor"));
  assert.equal(result.noWritesPerformed,true);
});

test("offline comparison detects review and order count changes without treating them as money changes", () => {
  const previous=make([validOrder()]);
  const additional=validOrder();
  additional.orderNo="ILK-ZERO-SECOND";
  additional.originalAmount=0n;
  additional.discountAmount=0n;
  additional.finalAmount=0n;
  additional.quote={
    ...additional.quote,listNetAmount:0n,listVatAmount:0n,
    listGrossAmount:0n,payableGrossAmount:0n,
  };
  additional.payments=[];
  const updated=make([validOrder(),additional]);
  const result=compareDayCloseArchives(previous.zip,updated.zip);
  assert.equal(result.changeAssessment,"RECORD_COUNTS_CHANGED");
  assert.ok(result.changedCountMetrics.some(item =>
    item.field==="salesCount" && item.previous===1 && item.current===2));
  assert.ok(result.changedCountMetrics.some(item =>
    item.field==="zeroAmountCount" && item.previous===0 && item.current===1));
  assert.equal(result.changedFinancialMetrics.length,0);
});

test("offline comparison does not label equal financial totals as description-only", () => {
  const previous=make([validOrder()]);
  const changed=validOrder();
  changed.authorPublicId="writer002";
  changed.workTitle="Writer allocation changed but sales totals match";
  const updated=make([changed]);
  const result=compareDayCloseArchives(previous.zip,updated.zip);
  assert.equal(result.changeAssessment,"FILES_CHANGED_AGGREGATES_UNCHANGED");
  assert.equal(result.changedFinancialMetrics.length,0);
  assert.equal(result.changedCountMetrics.length,0);
  assert.ok(result.changedFiles.includes("yazar_hesap_ozeti.csv"));
  assert.match(result.warning,/Allocation, writer, order/);
});

test("offline comparison distinguishes changed manifest-only metadata from unchanged data files", () => {
  const old=make([validOrder()]);
  const entries=old.files.map(item => ({
    name:item.name,
    data:item.name==="manifest.json"
      ? JSON.stringify({...old.manifest,note:"Additional review note"})+"\n"
      :item.data,
  }));
  const newer=exportModule.zipFiles(entries);
  const result=compareDayCloseArchives(old.zip,newer);
  assert.equal(result.changeAssessment,"MANIFEST_METADATA_CHANGED");
  assert.equal(result.changedFiles.length,0);
  assert.equal(result.changedMetrics.length,0);
  assert.equal(result.manifestChanged,true);
  assert.equal(result.archiveChanged,true);
});

test("offline comparison identifies ZIP-container bytes changed while checked contents match", () => {
  const old=make([validOrder()]);
  const changed=Buffer.from(old.zip);
  changed.writeUInt16LE(1,10); // local ZIP timestamp only
  const result=compareDayCloseArchives(old.zip,changed);
  assert.equal(result.changeAssessment,"ZIP_CONTAINER_BYTES_CHANGED");
  assert.equal(result.changedFiles.length,0);
  assert.equal(result.manifestChanged,false);
  assert.equal(result.archiveChanged,true);
});


test("offline archive checker refuses incomplete self-consistent v1 ZIP", () => {
  const original=make([validOrder()]);
  const content="siparis_no\r\n";
  const minimal=exportModule.zipFiles([
    {name:"siparisler.csv",data:content},
    {name:"manifest.json",data:JSON.stringify({
      version:"day-close-v1",day:"2026-10-25",
      batchKey:"ILK-DAY-2026-10-25",
      fileHashes:{ "siparisler.csv":createHash("sha256")
        .update(content).digest("hex") },
    })},
  ]);
  assert.ok(original.zip.length > minimal.length);
  assert.throws(()=>inspectDayCloseArchive(minimal),
    /DAY_CLOSE_COMPARE_INVALID_REQUIRED_FILES/);
});

test("offline archive checker rejects contradictory central compression method", () => {
  const file=Buffer.from(make([validOrder()]).zip);
  const directory=file.readUInt32LE(file.length-22+16);
  file.writeUInt16LE(8,directory+10); // central says DEFLATE; local says STORE
  assert.throws(()=>inspectDayCloseArchive(file),
    /DAY_CLOSE_COMPARE_INVALID_CENTRAL_FORMAT/);
});

test("offline archive checker rejects inconsistent central uncompressed length", () => {
  const file=Buffer.from(make([validOrder()]).zip);
  const directory=file.readUInt32LE(file.length-22+16);
  file.writeUInt32LE(file.readUInt32LE(directory+24)+1,directory+24);
  assert.throws(()=>inspectDayCloseArchive(file),
    /DAY_CLOSE_COMPARE_INVALID_CENTRAL_FORMAT/);
});

test("offline archive checker rejects multi-volume ZIP flags", () => {
  const file=Buffer.from(make([validOrder()]).zip);
  file.writeUInt16LE(1,file.length-22+4);
  assert.throws(()=>inspectDayCloseArchive(file),
    /DAY_CLOSE_COMPARE_INVALID_MULTI_DISK_ARCHIVE/);
});

test("offline CLI rejects oversized ZIP before loading archive into memory", () => {
  const temp=mkdtempSync(join(tmpdir(),"ilkoku-archive-size-"));
  try {
    const giant=join(temp,"too-large.zip");
    writeFileSync(giant,Buffer.alloc(1));
    // Allocate a sparse file; only metadata grows, not the payload in memory.
    truncateSync(giant,96*1024*1024+1);
    const cli=join(root,"scripts/commerce-day-close-compare.mjs");
    const r=spawnSync(process.execPath,[cli,giant,giant],{
      encoding:"utf8",timeout:10000,
    });
    assert.equal(r.status,1);
    assert.match(r.stderr,/DAY_CLOSE_COMPARE_INVALID_ARCHIVE_SIZE/);
  } finally {
    rmSync(temp,{recursive:true,force:true});
  }
});


test("15 percent invoicing-author commission and VAT are separate; 5 percent intermediary is zero", () => {
  const invoiced=validOrder();
  invoiced.commission={
    commissionRateBps:1500,serviceFeeRateBps:500,
    source:"global",sourceEventId:null,calculationVersion:"rate-v1",
  };
  invoiced.taxReview={...invoiced.taxReview,documentKind:"commercial_invoice"};
  const result=make([invoiced]);
  assert.equal(result.manifest.readySalesCount,1);
  assert.equal(result.manifest.reviewedCommissionIllustrationMinor,"1500");
  assert.equal(result.manifest.reviewedCommissionVatIllustrationMinor,"300");
  assert.equal(result.manifest.reviewedCommissionGrossIllustrationMinor,"1800");
  assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedServiceFeeVatIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedServiceFeeGrossIllustrationMinor,"0");
  const map=JSON.parse(result.files.find(x=>x.name==="alan_esleme.json").data);
  assert.equal(map.sourceColumnAudit.declaredColumnCount,19);
  for(const field of ["komisyon_kdv_ornek_kurus","komisyon_brut_ornek_kurus",
      "aracilik_kdv_ornek_kurus","aracilik_brut_ornek_kurus"])
    assert.ok(Object.hasOwn(map.fields,field),field);
  for(const name of ["muhasebe_on_hazirlik.csv","yazar_hesap_ozeti.csv"]) {
    const csv=result.files.find(x=>x.name===name).data;
    assert.ok(csv.includes("komisyon_kdv_ornek_kurus"));
    assert.ok(csv.includes("aracilik_kdv_ornek_kurus"));
    assert.ok(csv.includes(",300,1800,0,0"),name);
  }
  const lira=result.files.find(x=>x.name==="muhasebe_tl_inceleme.csv").data;
  assert.ok(lira.includes('"3,00";"18,00";"0,00";"0,00"'));
});

test("15 percent commission and separate eligible 5 percent intermediary include independently calculated VAT", () => {
  const eligible=validOrder();
  eligible.commission={
    commissionRateBps:1500,serviceFeeRateBps:500,
    source:"global",sourceEventId:null,calculationVersion:"rate-v1",
  };
  const result=make([eligible]);
  assert.equal(result.manifest.readySalesCount,1);
  assert.equal(result.manifest.reviewedCommissionIllustrationMinor,"1500");
  assert.equal(result.manifest.reviewedCommissionVatIllustrationMinor,"300");
  assert.equal(result.manifest.reviewedCommissionGrossIllustrationMinor,"1800");
  assert.equal(result.manifest.reviewedServiceFeeIllustrationMinor,"500");
  assert.equal(result.manifest.reviewedServiceFeeVatIllustrationMinor,"100");
  assert.equal(result.manifest.reviewedServiceFeeGrossIllustrationMinor,"600");
  const prep=result.files.find(x=>x.name==="muhasebe_on_hazirlik.csv").data;
  assert.ok(prep.includes(",300,1800,100,600"));
  assert.ok(result.files.find(x=>x.name==="yazar_hesap_ozeti.csv").data
    .includes(",300,1800,100,600"));
  assert.ok(result.files.find(x=>x.name==="muhasebe_tl_inceleme.csv").data
    .includes('"3,00";"18,00";"1,00";"6,00"'));
});

test("frozen custom work commission still controls VAT base independently of global rate", () => {
  const custom=make([validOrder()]);
  assert.equal(custom.manifest.reviewedCommissionIllustrationMinor,"2000");
  assert.equal(custom.manifest.reviewedCommissionVatIllustrationMinor,"400");
  assert.equal(custom.manifest.reviewedCommissionGrossIllustrationMinor,"2400");
  assert.equal(custom.manifest.reviewedServiceFeeVatIllustrationMinor,"100");
  assert.equal(custom.manifest.reviewedServiceFeeGrossIllustrationMinor,"600");
});

test("unverified tax-document review produces no commission or intermediary VAT preparation", () => {
  const uncertain=validOrder();
  uncertain.taxReview=null;
  const result=make([uncertain]);
  assert.equal(result.manifest.preparationRows,0);
  assert.equal(result.manifest.reviewedCommissionVatIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedServiceFeeVatIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedCommissionGrossIllustrationMinor,"0");
  assert.equal(result.manifest.reviewedServiceFeeGrossIllustrationMinor,"0");
});
