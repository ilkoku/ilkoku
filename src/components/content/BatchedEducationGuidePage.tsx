import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";
import type { EducationGuideDefinition, GuideItem } from "@/lib/education-guide-batch";

const visualKeys = ["hero", "ideaFlow", "structure", "anatomy", "pageSetup", "project", "finalCta"] as const;
type VisualKey = (typeof visualKeys)[number];
type VisualMap = Record<VisualKey, string>;
type AltMap = Record<VisualKey, string>;

type ExtraEducationSection = {
  id: string;
  type: "text" | "cards" | "steps";
  heading: string;
  intro?: string;
  body?: string;
  items?: GuideItem[];
};

type ExtendedEducationGuideDefinition = EducationGuideDefinition & {
  extraSections?: ExtraEducationSection[];
};

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

function cards(items: { title: string; text: string }[]) {
  return items.map((item) => ({ ...item, label: "", href: "" }));
}

function extraEducationBlocks(definition: ExtendedEducationGuideDefinition): CmsPageBlock[] {
  return (definition.extraSections ?? []).map((section) => {
    const id = `${definition.slug}-${section.id}`;
    if (section.type === "text") {
      return { id, type: "text", heading: section.heading, body: section.body ?? "" };
    }
    if (section.type === "steps") {
      return {
        id,
        type: "steps",
        heading: section.heading,
        intro: section.intro ?? "",
        items: section.items ?? [],
      };
    }
    return {
      id,
      type: "cards",
      heading: section.heading,
      intro: section.intro ?? "",
      items: cards(section.items ?? []),
    };
  });
}

export async function BatchedEducationGuidePage({ definition }: { definition: EducationGuideDefinition }) {
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
  const extendedDefinition = definition as ExtendedEducationGuideDefinition;

  const blocks: CmsPageBlock[] = [
    {
      id: `${definition.slug}-hero`,
      type: "hero",
      eyebrow: `Yazarlar İçin · ${definition.category}`,
      title,
      text: summary,
      imageUrl: visuals.hero,
      imageAlt: alts.hero,
      primaryLabel: "",
      primaryHref: "",
      secondaryLabel: "",
      secondaryHref: "",
    },
    { id: `${definition.slug}-orientation`, type: "text", heading: definition.orientationHeading, body: definition.orientationBody },
    {
      id: `${definition.slug}-fikir-kaynaklari`,
      type: "cards",
      heading: definition.ideaHeading,
      intro: definition.ideaIntro,
      items: cards(definition.ideaItems),
    },
    splitOrText(
      `${definition.slug}-idea-flow`,
      definition.ideaFlowHeading,
      definition.ideaFlowBody,
      visuals.ideaFlow,
      alts.ideaFlow,
      "right",
    ),
    {
      id: `${definition.slug}-tur-farki`,
      type: "cards",
      heading: definition.contrastHeading,
      intro: definition.contrastIntro,
      items: cards(definition.contrastItems),
    },
    {
      id: `${definition.slug}-tam-yazim-rotasi`,
      type: "steps",
      heading: definition.routeHeading,
      intro: definition.routeIntro,
      items: definition.routeItems,
    },
    {
      id: `${definition.slug}-structure`,
      type: "steps",
      heading: definition.structureHeading,
      intro: definition.structureIntro,
      items: definition.structureItems,
    },
    ...visualBlock(`${definition.slug}-structure-visual`, visuals.structure, alts.structure, definition.structureCaption),
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
      items: cards(definition.practiceItems),
    },
    ...visualBlock(`${definition.slug}-page-setup`, visuals.pageSetup, alts.pageSetup, definition.pageSetupCaption),
    {
      id: `${definition.slug}-yazim-duzeni`,
      type: "cards",
      heading: definition.workspaceHeading,
      intro: definition.workspaceIntro,
      items: cards(definition.workspaceItems),
    },
    { id: `${definition.slug}-craft`, type: "text", heading: definition.craftHeading, body: definition.craftBody },
    ...extraEducationBlocks(extendedDefinition),
    {
      id: `${definition.slug}-ilk-taslak`,
      type: "steps",
      heading: definition.draftHeading,
      intro: definition.draftIntro,
      items: definition.draftItems,
    },
    {
      id: `${definition.slug}-revision`,
      type: "cards",
      heading: definition.revisionHeading,
      intro: definition.revisionIntro,
      items: cards(definition.revisionItems),
    },
    { id: `${definition.slug}-ornek-proje`, type: "text", heading: `Örnek proje — ${definition.projectName}`, body: definition.projectBody },
    ...visualBlock(`${definition.slug}-project-visual`, visuals.project, alts.project, definition.projectCaption),
    { id: `${definition.slug}-sample`, type: "text", heading: definition.sampleHeading, body: definition.sampleBody },
    {
      id: `${definition.slug}-yayina-hazirlik`,
      type: "steps",
      heading: definition.finalHeading,
      intro: definition.finalIntro,
      items: definition.finalItems,
    },
    {
      id: `${definition.slug}-uygulama-ciktisi`,
      type: "cards",
      heading: definition.outputsHeading,
      intro: definition.outputsIntro,
      items: cards(definition.outputItems),
    },
    {
      id: `${definition.slug}-masters`,
      type: "cards",
      heading: "Ustalardan öğren — tekniği kopyalamadan çalışma biçimini incele",
      intro: definition.mastersIntro,
      items: cards(definition.masters),
    },
    { id: `${definition.slug}-faq`, type: "faq", heading: `${definition.label} yazarken sık sorulanlar`, items: definition.faq },
    ...visualBlock(`${definition.slug}-final-visual`, visuals.finalCta, alts.finalCta, definition.finalCaption),
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
    <WritingGuideShell activeCategory={definition.category} activeGenreSlug={definition.slug}>
      <div className="batched-education-writing-guide">
        <PublicCmsPageBlocks
          blocks={blocks}
          eyebrow={`Yazarlar İçin · ${definition.category}`}
          pageTitle={title}
          summary={summary}
          unoptimizedImages
        />
      </div>
    </WritingGuideShell>
  );
}
