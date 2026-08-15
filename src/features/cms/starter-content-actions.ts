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
    summary: "İlkOku; yazarları, okuyucuları, editörleri ve yayınevlerini aynı eser yolculuğunda buluşturan dijital yayın platformudur.",
    body: `İlkOku, yazarların eserlerini bölüm bölüm yayımlayabildiği; okuyucularla buluşabildiği; editör değerlendirmeleri ve yayınevi keşfiyle desteklenen bir dijital yayın platformudur.

## Yazarlar için

Yazarlar eserlerini oluşturur, bölümlerini düzenler ve yayına alır. İstediklerinde editör incelemesi talep ederek eserlerini yapılandırılmış bir değerlendirme sürecine taşıyabilirler.

## Okuyucular için

Okuyucular yayınlanmış eserleri keşfeder, okumalarını sürdürebilir ve platformun izin verdiği etkileşim araçlarıyla eser yolculuğuna katılabilir.

## Editörler için

Editörler inceleme havuzundaki uygun eserleri değerlendirir. İnceleme akışında birinci ve ikinci editörün bağımsız değerlendirmeleri eserin gelişimine katkı sağlar.

## Yayınevleri için

Yayınevleri kendilerine açık keşif alanlarında eser ve yazarları inceleyebilir. İlkOku'nun amacı, nitelikli içeriğin doğru profesyoneller tarafından daha görünür hale gelmesini sağlamaktır.

İlkOku, yayın kararının ve eser üzerindeki hakların taraflara ait olduğu şeffaf bir keşif ve değerlendirme altyapısı kurmayı hedefler.`,
    seoTitle: "Hakkımızda | İlkOku",
    seoDescription: "İlkOku'nun yazar, okuyucu, editör ve yayınevlerini aynı eser yolculuğunda nasıl buluşturduğunu keşfedin.",
    kind: "page",
  },
  {
    contentKey: "guide:ilkoku-nasil-calisir",
    slug: "/rehber/ilkoku-nasil-calisir",
    title: "İlkOku Nasıl Çalışır?",
    summary: "Yazar, okuyucu, editör ve yayınevi rollerinin İlkOku içindeki temel yolculuğunu adım adım öğrenin.",
    body: `İlkOku'da her rol aynı esere farklı bir noktadan katkı sağlar. Bu rehber temel akışı özetler.

## 1. Yazar eserini oluşturur ve yayımlar

Yazar eser kaydını oluşturur, bölümlerini hazırlar ve okuyuculara açmak istediğinde eserini yayımlar. Editör incelemesi istiyorsa ayrıca inceleme talebi oluşturabilir.

## 2. Okuyucular eseri keşfeder

Yayındaki eserler keşif alanlarında okuyucularla buluşur. Okuyucu eseri inceleyebilir, okumaya devam edebilir ve kendisine açık etkileşim araçlarını kullanabilir.

## 3. Editör inceleme akışı başlar

Editör incelemesi talep edilen eser Genel Editör Havuzu'na düşer. İlk editör görevi üzerine aldığında aynı görev başka bir ilk editör tarafından alınamaz. Birinci inceleme tamamlandıktan sonra eser ikinci editör değerlendirmesine geçer. İkinci editör bağımsız bir değerlendirme yapar.

## 4. Değerlendirme yazara ulaşır

İki inceleme tamamlandığında sistem yazarın kullanabileceği değerlendirme sonucunu oluşturur. Amaç eserin gelişimine yardımcı olacak düzenli ve izlenebilir bir editoryal süreç sağlamaktır.

## 5. Yayınevi keşfi

Yayınevleri kendilerine açık keşif alanlarında yayınlanmış eser ve yazarları inceleyebilir. Bu alan, yayınevi ile yazar arasında otomatik bir yayın taahhüdü oluşturmaz; keşif ve değerlendirme için görünürlük sağlar.`,
    seoTitle: "İlkOku Nasıl Çalışır? | Rehber",
    seoDescription: "İlkOku'da yazar, okuyucu, editör ve yayınevi rollerinin eser yolculuğundaki temel adımlarını öğrenin.",
    kind: "guide",
  },
];

const faqSeeds: FaqSeed[] = [
  {
    contentKey: "item_starter_ilkoku_nedir",
    question: "İlkOku nedir?",
    answer: "İlkOku; yazarların eserlerini yayımlayabildiği, okuyucuların eserleri keşfedebildiği, editör incelemelerinin yürütülebildiği ve yayınevlerinin kendilerine açık keşif alanlarından eser ve yazarları inceleyebildiği dijital bir yayın platformudur.",
    category: "Genel",
    audience: "all",
    position: 10,
  },
  {
    contentKey: "item_starter_yazar_yayin",
    question: "Yazar eserini nasıl yayımlar?",
    answer: "Yazar hesabından eser kaydını oluşturur, bölümlerini hazırlar ve yayın akışı üzerinden eserini okuyuculara açar. Editör incelemesi istiyorsa yayın sürecinden ayrı olarak editör incelemesi talep edebilir.",
    category: "Yazar",
    audience: "writer",
    position: 20,
  },
  {
    contentKey: "item_starter_editor_inceleme",
    question: "Editör incelemesi nasıl çalışır?",
    answer: "İnceleme talebi Genel Editör Havuzu'nda görünür. İlk editör görevi üzerine alır ve değerlendirmesini tamamlar. Ardından eser ikinci editöre gider; ikinci editör bağımsız inceleme yapar. İki inceleme tamamlandığında yazara iletilecek sonuç oluşturulur.",
    category: "Editör",
    audience: "editor",
    position: 30,
  },
  {
    contentKey: "item_starter_yayinevi_kesif",
    question: "Yayınevleri İlkOku'da ne yapabilir?",
    answer: "Yayınevleri kendilerine açık keşif alanlarında yayınlanmış eser ve yazarları inceleyebilir. Bu görünürlük tek başına sözleşme veya yayın taahhüdü anlamına gelmez; yayınevinin kendi değerlendirme sürecini destekleyen bir keşif alanıdır.",
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
