import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";
import type { FictionGuideDefinition } from "@/lib/fiction-guide-batch";
import { getFictionGuideExtraSections } from "@/lib/fiction-guide-depth";
import { getFictionPedagogyParity } from "@/lib/fiction-guide-pedagogy-parity";

const visualKeys = ["hero", "ideaFlow", "structure", "anatomy", "pageSetup", "project", "finalCta"] as const;
type VisualKey = (typeof visualKeys)[number];

type VisualMap = Record<VisualKey, string>;
type AltMap = Record<VisualKey, string>;

function visualBlock(id: string, imageUrl: string, alt: string, caption: string): CmsPageBlock[] {
  if (!imageUrl) return [];
  return [{ id, type: "image", imageUrl, alt, caption, layout: "wide" }];
}

function splitOrText(
  id: string,
  heading: string,
  body: string,
  imageUrl: string,
  imageAlt: string,
  imageSide: "left" | "right",
): CmsPageBlock {
  if (!imageUrl) return { id, type: "text", heading, body };
  return { id, type: "split", heading, body, imageUrl, imageAlt, imageSide };
}

function cardItems(items: { title: string; text: string }[]) {
  return items.map((item) => ({ ...item, label: "", href: "" }));
}

export async function BatchedFictionGuidePage({ definition }: { definition: FictionGuideDefinition }) {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord(definition.slug);
  } catch {
    guide = null;
  }

  const source = guide?.visuals ?? {};
  const visuals: VisualMap = {
    hero: source.hero?.url ?? "",
    ideaFlow: source.ideaFlow?.url ?? "",
    structure: source.structure?.url ?? "",
    anatomy: source.anatomy?.url ?? "",
    pageSetup: source.pageSetup?.url ?? "",
    project: source.project?.url ?? "",
    finalCta: source.finalCta?.url ?? "",
  };
  const alts: AltMap = {
    hero: source.hero?.altText || definition.alts.hero,
    ideaFlow: source.ideaFlow?.altText || definition.alts.ideaFlow,
    structure: source.structure?.altText || definition.alts.structure,
    anatomy: source.anatomy?.altText || definition.alts.anatomy,
    pageSetup: source.pageSetup?.altText || definition.alts.pageSetup,
    project: source.project?.altText || definition.alts.project,
    finalCta: source.finalCta?.altText || definition.alts.finalCta,
  };

  const genericSummary = `${definition.label} için adım adım yazarlık ve üretim rehberi.`;
  const title = guide?.title || definition.title;
  const summary = guide?.summary && guide.summary !== genericSummary ? guide.summary : definition.summary;
  const parity = getFictionPedagogyParity(definition.slug, definition.label, definition.projectName);
  const extraSections = getFictionGuideExtraSections(definition.slug);

  const blocks: CmsPageBlock[] = [
    {
      id: `${definition.slug}-hero`,
      type: "hero",
      eyebrow: "Yazarlar İçin · Kurgu",
      title,
      text: summary,
      imageUrl: visuals.hero,
      imageAlt: alts.hero,
      primaryLabel: "",
      primaryHref: "",
      secondaryLabel: "",
      secondaryHref: "",
    },
    {
      id: `${definition.slug}-orientation`,
      type: "text",
      heading: definition.orientationHeading,
      body: definition.orientationBody,
    },
    {
      id: `${definition.slug}-fikir-kaynaklari`,
      type: "cards",
      heading: parity.ideaHeading,
      intro: parity.ideaIntro,
      items: cardItems(parity.ideaItems),
    },
    splitOrText(
      `${definition.slug}-idea-flow`,
      definition.ideaHeading,
      definition.ideaBody,
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: `${definition.slug}-tur-farki`,
      type: "cards",
      heading: parity.contrastHeading,
      intro: "Türü doğru konumlandırmak, fikrin hangi anlatı sözünü vermesi gerektiğini netleştirir.",
      items: cardItems(parity.contrastItems),
    },
    {
      id: `${definition.slug}-tam-yazim-rotasi`,
      type: "steps",
      heading: parity.routeHeading,
      intro: parity.routeIntro,
      items: parity.routeItems,
    },
    {
      id: `${definition.slug}-structure`,
      type: "steps",
      heading: definition.structureHeading,
      intro: definition.structureIntro,
      items: definition.structureItems,
    },
    ...visualBlock(
      `${definition.slug}-structure-visual`,
      visuals.structure,
      alts.structure,
      definition.structureCaption,
    ),
    splitOrText(
      `${definition.slug}-anatomy`,
      definition.anatomyHeading,
      definition.anatomyBody,
      visuals.anatomy,
      alts.anatomy,
      "left",
    ),
    {
      id: `${definition.slug}-practice`,
      type: "cards",
      heading: definition.practiceHeading,
      intro: definition.practiceIntro,
      items: definition.practiceItems.map((item) => ({ ...item, label: "", href: "" })),
    },
    ...visualBlock(
      `${definition.slug}-page-setup`,
      visuals.pageSetup,
      alts.pageSetup,
      definition.pageSetupCaption,
    ),
    {
      id: `${definition.slug}-yazim-duzeni`,
      type: "cards",
      heading: parity.workspaceHeading,
      intro: parity.workspaceIntro,
      items: cardItems(parity.workspaceItems),
    },
    {
      id: `${definition.slug}-character`,
      type: "text",
      heading: definition.characterHeading,
      body: definition.characterBody,
    },
    ...extraSections.map((section) => ({
      id: `${definition.slug}-${section.id}`,
      type: "text" as const,
      heading: section.heading,
      body: section.body,
    })),
    {
      id: `${definition.slug}-ilk-taslak`,
      type: "steps",
      heading: parity.draftHeading,
      intro: parity.draftIntro,
      items: parity.draftItems,
    },
    {
      id: `${definition.slug}-revision`,
      type: "cards",
      heading: definition.revisionHeading,
      intro: definition.revisionIntro,
      items: definition.revisionItems.map((item) => ({ ...item, label: "", href: "" })),
    },
    {
      id: `${definition.slug}-ornek-proje`,
      type: "text",
      heading: `Örnek proje — ${definition.projectName}`,
      body: definition.projectBody,
    },
    ...visualBlock(
      `${definition.slug}-project-visual`,
      visuals.project,
      alts.project,
      definition.projectCaption,
    ),
    {
      id: `${definition.slug}-scene`,
      type: "text",
      heading: definition.sceneHeading,
      body: definition.sceneBody,
    },
    {
      id: `${definition.slug}-yayina-hazirlik`,
      type: "steps",
      heading: parity.finalHeading,
      intro: parity.finalIntro,
      items: parity.finalItems,
    },
    {
      id: `${definition.slug}-uygulama-ciktisi`,
      type: "cards",
      heading: parity.outputsHeading,
      intro: parity.outputsIntro,
      items: cardItems(parity.outputItems),
    },
    {
      id: `${definition.slug}-masters`,
      type: "cards",
      heading: "Ustalardan öğren — tekniği kopyalamadan çalışma biçimini incele",
      intro: definition.mastersIntro,
      items: definition.masters.map((item) => ({ ...item, label: "", href: "" })),
    },
    {
      id: `${definition.slug}-faq`,
      type: "faq",
      heading: `${definition.label} yazarken sık sorulanlar`,
      items: definition.faq,
    },
    ...visualBlock(
      `${definition.slug}-final-visual`,
      visuals.finalCta,
      alts.finalCta,
      definition.finalCaption,
    ),
    {
      id: `${definition.slug}-cta`,
      type: "cta",
      heading: definition.ctaHeading,
      text: definition.ctaText,
      primaryLabel: "İlkOku Yazar Alanına Git",
      primaryHref: "/yazar",
      secondaryLabel: "",
      secondaryHref: "",
    },
  ];

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug={definition.slug}>
      <div className="batched-fiction-writing-guide">
        <PublicCmsPageBlocks
          blocks={blocks}
          eyebrow="Yazarlar İçin · Kurgu"
          pageTitle={title}
          summary={summary}
          unoptimizedImages
        />
      </div>
    </WritingGuideShell>
  );
}
