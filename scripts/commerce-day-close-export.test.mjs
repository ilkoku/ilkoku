import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

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
  payments: [{ status: "succeeded",amount: 12000n,currency: "TRY" }],
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
  assert.equal(result.manifest.unmatchedGrossLedgerOrderCount,0);
  assert.equal(result.manifest.ledgerSummaryGroups,1);
  assert.equal(result.files.length,10);
  assert.deepEqual([...result.files.map(f=>f.name)],[
    "siparisler.csv","finans_hareketleri.csv","iadeler.csv","uyarilar.csv",
    "mutabakat.csv","gun_sonu_ozet.csv","muhasebe_on_hazirlik.csv",
    "yazar_hesap_ozeti.csv","alan_esleme.json","manifest.json",
  ]);
  for (const f of result.files.filter(x=>x.name.endsWith(".csv"))) {
    assert.equal(result.manifest.fileHashes[f.name],createHash("sha256").update(f.data).digest("hex"));
  }
  assert.equal(result.zip.readUInt32LE(0),0x04034b50);
  assert.equal(result.zip.readUInt32LE(result.zip.length-22),0x06054b50);
  const second = make([validOrder()]);
  assert.deepEqual(result.zip,second.zip,"unchanged source rows yield same bytes/batch hash");
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
  duplicate.payments.push({ status:"succeeded",amount:12000n,currency:"TRY" });
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
  order.payments.push({status:"succeeded",amount:12000n,currency:"TRY"});
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
  order.payments=[{status:"succeeded",amount:1n,currency:"TRY"}];
  const result=make([order]);
  const issues=result.files.find(f=>f.name==="uyarilar.csv").data;
  assert.ok(issues.includes("SIFIR_TL_GEREKSIZ_TAHSILAT"));
  assert.equal(result.manifest.preparationRows,0);
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
