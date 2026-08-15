"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCmsManager } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";

type CountRow = { total: bigint | number };

type PageSeed = {
  contentKey: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  kind: "page" | "guide";
};

type FaqSeed = {
  contentKey: string;
  question: string;
  answer: string;
  category: string;
  audience: "all" | "reader" | "writer" | "editor" | "publisher";
  position: number;
};

const pageSeeds: PageSeed[] = [
  {
    contentKey: "page:tr:hakkimizda",
    slug: "/hakkimizda",
    title: "Hakkımızda",
    summary: "İlkOku, bir eserin ilk taslağından okur geri bildirimine, editör incelemesinden yayınevi keşfine uzanan yolculuğu tek dijital ortamda buluşturur.",
    body: `İlkOku, yazarların eserlerini geliştirebildiği, okuyucularla buluşturabildiği, profesyonel editör incelemesine taşıyabildiği ve yayınevleri tarafından keşfedilebildiği dijital bir edebiyat platformudur.

Amacımız yalnızca bir eserin son halini göstermek değil; eserin oluşum ve gelişim yolculuğunu daha düzenli, görünür ve izlenebilir hale getirmektir.

## Yazarın çalışma alanı

Yazarlar eserlerini oluşturur, bölümlerini düzenler ve hazır olduklarında platformda yayımlar. Okur geri bildirimlerini takip edebilir, çalışmalarını geliştirebilir ve isterlerse eserleri için profesyonel editör incelemesi talep edebilirler.

Platformda yayımlanan bir eser, yayıneviyle yapılmış bir basım veya yayın sözleşmesi anlamına gelmez. İlkOku; eserin okuyucuyla buluştuğu, geliştiği ve profesyonel keşfe açıldığı dijital çalışma ortamını sağlar.

## Okurun katkısı

Okuyucular yayındaki eserleri keşfeder, okumaya devam eder ve kendilerine açık etkileşim araçlarıyla yazara geri bildirim verebilir. Böylece yazar, eserinin okuyucuda nasıl karşılık bulduğunu geliştirme sürecinin içinde görebilir.

## İki aşamalı editör incelemesi

Yazar editör incelemesi talep ettiğinde eser Genel Editör Havuzu'na girer. İlk editör görevi üzerine alır, eseri bağımsız biçimde değerlendirir ve incelemesini tamamlar. Ardından eser ikinci editör değerlendirmesine geçer; ikinci editör de bağımsız bir inceleme yapar.

İki incelemenin tamamlanmasıyla yazarın kullanabileceği düzenli bir değerlendirme sonucu oluşur. Bu yapı, editoryal görüşü tek bir bakış açısına bağlı bırakmadan daha sistemli bir inceleme süreci oluşturmayı amaçlar.

## Yayınevi keşfi

Yayınevi hesapları kendilerine açık keşif alanlarında görünür eserleri ve yazarları inceleyebilir. Bu görünürlük, yayınevinin kendi editoryal ve ticari değerlendirme sürecini destekler; otomatik sözleşme, basım veya yayın taahhüdü oluşturmaz.

## Eser Pasaportu

Eser Pasaportu, platform üzerinde oluşan yazım ve revizyon geçmişi ile inceleme durumunu tek yerde görünür kılmak için tasarlanmıştır. Amaç, eserin yalnızca sonucunu değil, İlkOku içindeki gelişim sürecini de anlaşılır bir kayıt yapısıyla sunmaktır.

İlkOku; yazar, okuyucu, editör ve yayınevini aynı eserin etrafında buluşturan, her rolün sınırlarını koruyan ve eser yolculuğunu daha şeffaf hale getiren bir dijital edebiyat ekosistemi kurmayı hedefler.`,
    seoTitle: "Hakkımızda | İlkOku Dijital Edebiyat Platformu",
    seoDescription: "İlkOku’nun yazarları, okuyucuları, editörleri ve yayınevlerini eser geliştirme, değerlendirme ve keşif sürecinde nasıl buluşturduğunu öğrenin.",
    kind: "page",
  },
  {
    contentKey: "guide:ilkoku-nasil-calisir",
    slug: "/rehber/ilkoku-nasil-calisir",
    title: "İlkOku Nasıl Çalışır?",
    summary: "İlkOku'da bir eserin yazardan okuyucuya, iki aşamalı editör incelemesinden yayınevi keşfine uzanan temel yolculuğunu adım adım öğrenin.",
    body: `İlkOku'da yazar, okuyucu, editör ve yayınevi aynı esere farklı bir noktadan katkı sağlar. Aşağıdaki akış, platformun temel çalışma mantığını özetler.

## 1. Yazar eserini oluşturur

Yazar hesabından yeni bir eser kaydı açar, bölümlerini oluşturur ve çalışmasını kendi alanında geliştirir. Yazım sürecindeki içerik ve revizyon hareketleri, platformun sunduğu kayıt yapısı içinde ilerler.

## 2. Eser platformda yayımlanır

Yazar hazır olduğunda eserini okuyuculara açar. Platformda yayımlama, eserin İlkOku içindeki görünürlüğünü başlatır; yayınevi tarafından basılacağı veya ticari olarak yayımlanacağı anlamına gelmez.

Editör incelemesi de otomatik başlamaz. Yazar profesyonel değerlendirme istiyorsa ayrıca editör incelemesi talebi oluşturur.

## 3. Okuyucular eseri keşfeder

Yayındaki eserler, görünürlük kurallarına göre keşif alanlarında okuyucularla buluşur. Okuyucular eserleri inceleyebilir, okumaya devam edebilir ve kendilerine açık geri bildirim araçlarını kullanabilir.

Bu etkileşim, yazarın eserini gerçek okur tepkileriyle geliştirmesine yardımcı olur.

## 4. Birinci editör incelemeyi üstlenir

Editör incelemesi talep edilen eser Genel Editör Havuzu'nda görünür. İlk uygun editör görevi üzerine aldığında görev kilitlenir ve aynı birinci inceleme başka bir editör tarafından eş zamanlı olarak alınamaz.

Birinci editör eseri okur, notlarını oluşturur ve kendi değerlendirmesini tamamlar.

## 5. Eser ikinci editöre geçer

Birinci inceleme tamamlandıktan sonra eser ikinci editör değerlendirmesine yönlendirilir. İkinci editör eseri bağımsız biçimde inceler ve kendi değerlendirmesini oluşturur.

Bu aşamanın amacı, eserin profesyonel değerlendirmesini tek bir editör görüşüne bağlı bırakmamaktır.

## 6. Değerlendirme sonucu yazara ulaşır

İki inceleme tamamlandığında sistem, tamamlanan editoryal değerlendirmelerden yazarın kullanabileceği sonuç akışını oluşturur. Yazar bu sonucu eserini geliştirmek için kullanabilir.

Editör değerlendirmesi bir yayınevi kabulü, basım garantisi veya ticari yayın taahhüdü değildir.

## 7. Eser Pasaportu süreci görünür kılar

Eser Pasaportu; platform üzerinde oluşan yazım ve revizyon geçmişi ile profesyonel inceleme durumunu tek kayıt yapısında göstermeyi amaçlar. Böylece eserin yalnızca son hali değil, İlkOku içindeki gelişim yolculuğu da daha anlaşılır hale gelir.

## 8. Yayınevi keşfi başlar

Yayınevleri kendilerine açık keşif alanlarında görünür eserleri ve yazarları inceleyebilir. İlgilendikleri çalışmalar yayınevinin kendi değerlendirme sürecine girebilir.

İlkOku'daki keşif görünürlüğü tek başına sözleşme, basım veya yayın kararı oluşturmaz. Nihai değerlendirme ve olası ticari süreç ilgili tarafların kendi kararlarıyla ilerler.`,
    seoTitle: "İlkOku Nasıl Çalışır? | Yazar, Editör ve Yayınevi Rehberi",
    seoDescription: "İlkOku’da eser yayımlama, okur geri bildirimi, iki editörlü inceleme, Eser Pasaportu ve yayınevi keşfi süreçlerini adım adım öğrenin.",
    kind: "guide",
  },
];

const faqSeeds: FaqSeed[] = [
  {
    contentKey: "item_starter_ilkoku_nedir",
    question: "İlkOku nedir?",
    answer: "İlkOku; yazarların eserlerini oluşturup platformda yayımlayabildiği, okuyucuların eserleri keşfedip geri bildirim verebildiği, profesyonel editör incelemelerinin yürütülebildiği ve yayınevlerinin kendilerine açık alanlarda eser ve yazarları keşfedebildiği dijital bir edebiyat platformudur. İlkOku'nun amacı, bir eserin gelişim yolculuğunu daha düzenli, görünür ve izlenebilir hale getirmektir.",
    category: "Genel",
    audience: "all",
    position: 10,
  },
  {
    contentKey: "item_starter_yazar_yayin",
    question: "Yazar eserini nasıl yayımlar?",
    answer: "Yazar hesabından eser kaydını oluşturur, bölümlerini hazırlar ve hazır olduğunda yayın akışı üzerinden eserini İlkOku'da okuyuculara açar. Platformda yayımlama, yayıneviyle yapılmış bir basım veya yayın sözleşmesi anlamına gelmez. Yazar profesyonel değerlendirme istiyorsa yayın işleminden ayrı olarak editör incelemesi talep eder.",
    category: "Yazar",
    audience: "writer",
    position: 20,
  },
  {
    contentKey: "item_starter_editor_inceleme",
    question: "Editör incelemesi nasıl çalışır?",
    answer: "Yazarın inceleme talebi Genel Editör Havuzu'nda görünür. İlk editör görevi üzerine aldığında birinci inceleme kilitlenir; editör eseri bağımsız biçimde değerlendirip incelemesini tamamlar. Ardından eser ikinci editör değerlendirmesine geçer ve ikinci editör bağımsız bir inceleme yapar. İki inceleme tamamlandığında yazarın kullanabileceği değerlendirme sonucu oluşur. Bu süreç yayınevi kabulü veya basım garantisi anlamına gelmez.",
    category: "Editör",
    audience: "editor",
    position: 30,
  },
  {
    contentKey: "item_starter_yayinevi_kesif",
    question: "Yayınevleri İlkOku'da ne yapabilir?",
    answer: "Yayınevi hesapları kendilerine açık keşif alanlarında görünür eserleri ve yazarları inceleyebilir. Bu alan, yayınevlerinin kendi editoryal değerlendirme sürecini destekleyen bir keşif ortamıdır. Bir eserin yayınevi tarafından görüntülenmesi veya ilgi görmesi otomatik sözleşme, basım kararı ya da yayın taahhüdü oluşturmaz; olası ticari süreç tarafların kendi değerlendirme ve kararlarıyla ilerler.",
    category: "Yayınevi",
    audience: "publisher",
    position: 40,
  },
];

function total(rows: CountRow[]) {
  return Number(rows[0]?.total ?? 0);
}

function initialRevisionSnapshot(seed: PageSeed) {
  return {
    kind: seed.kind,
    locale: "tr",
    title: seed.title,
    summary: seed.summary,
    body: seed.body,
    seoTitle: seed.seoTitle,
    seoDescription: seed.seoDescription,
    noIndex: false,
    status: "draft",
    _meta: { action: "starter-draft" },
  };
}

export async function createStarterContentDraftsAction() {
  const access = await requireCmsManager("/icerik/hazirlik");
  const userId = access.user!.id;

  let result: { pagesCreated: number; faqsCreated: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      let pagesCreated = 0;
      let faqsCreated = 0;

      for (const seed of pageSeeds) {
        const existing = await tx.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM ContentPage
          WHERE contentKey = ${seed.contentKey} OR slug = ${seed.slug}
        `;
        if (total(existing) > 0) continue;

        const id = randomUUID();
        const bodyJson = JSON.stringify({ summary: seed.summary, body: seed.body });
        await tx.$executeRaw`
          INSERT INTO ContentPage (
            id, contentKey, slug, title, status, bodyJson,
            seoTitle, seoDescription, canonicalUrl, noIndex, publishedAt,
            createdById, updatedById, createdAt, updatedAt
          ) VALUES (
            ${id}, ${seed.contentKey}, ${seed.slug}, ${seed.title}, 'draft', ${bodyJson},
            ${seed.seoTitle}, ${seed.seoDescription}, ${seed.slug}, false, NULL,
            ${userId}, ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
          )
        `;

        const snapshot = JSON.stringify(initialRevisionSnapshot(seed));
        await tx.$executeRaw`
          INSERT INTO ContentRevision (id, pageId, version, snapshotJson, createdById, createdAt)
          VALUES (${randomUUID()}, ${id}, 1, ${snapshot}, ${userId}, CURRENT_TIMESTAMP(3))
        `;
        pagesCreated += 1;
      }

      for (const seed of faqSeeds) {
        const existing = await tx.$queryRaw<CountRow[]>`
          SELECT COUNT(*) AS total FROM SiteContent
          WHERE namespace = 'faq' AND contentKey = ${seed.contentKey}
        `;
        if (total(existing) > 0) continue;

        const payload = JSON.stringify({
          id: seed.contentKey.replace(/^item_/, ""),
          question: seed.question,
          answer: seed.answer,
          category: seed.category,
          audience: seed.audience,
          position: seed.position,
        });

        await tx.$executeRaw`
          INSERT INTO SiteContent (
            id, namespace, contentKey, valueJson, valueType, status,
            updatedById, createdAt, updatedAt
          ) VALUES (
            ${randomUUID()}, 'faq', ${seed.contentKey}, ${payload}, 'json', 'draft',
            ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
          )
        `;
        faqsCreated += 1;
      }

      return { pagesCreated, faqsCreated };
    });
  } catch {
    redirect("/icerik/hazirlik?hata=baslangic");
  }

  revalidatePath("/icerik");
  revalidatePath("/icerik/hazirlik");
  revalidatePath("/icerik/sayfalar");
  revalidatePath("/icerik/rehber");
  revalidatePath("/icerik/sss");
  revalidatePath("/icerik/yayin-kuyrugu");
  revalidatePath("/icerik/gecmis");
  revalidatePath("/icerik/saglik");

  redirect(`/icerik/hazirlik?baslangic=1&sayfa=${result.pagesCreated}&sss=${result.faqsCreated}`);
}
