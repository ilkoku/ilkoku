import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath) => readFileSync(join(ROOT, relativePath), "utf8");

test("writer work cover upload stays ownership-bound and fail-closed", () => {
  const route = source("src/app/api/work-cover-upload/route.ts");
  const inspector = source("src/lib/work-cover.ts");
  const workspace = source("src/features/works/components/WorksWorkspace.tsx");

  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /user\.role !== "writer"/);
  assert.match(route, /authorId: user\.id/);
  assert.match(route, /status: \{ not: "archived" \}/);
  assert.match(route, /MAX_WORK_COVER_BYTES/);
  assert.match(route, /inspectWorkCover\(bytes\)/);
  assert.match(route, /data: \{ coverUrl: url \}/);

  assert.match(inspector, /MAX_WORK_COVER_BYTES = 3 \* 1024 \* 1024/);
  assert.match(inspector, /WORK_COVER_MIN_WIDTH = 800/);
  assert.match(inspector, /WORK_COVER_MIN_HEIGHT = 1200/);
  assert.match(inspector, /WORK_COVER_RATIO = 2 \/ 3/);
  assert.match(inspector, /image\/jpeg/);
  assert.match(inspector, /image\/png/);
  assert.match(inspector, /image\/webp/);

  assert.match(workspace, /<WorkCoverUpload workId=\{work\.id\} \/>/);
  assert.ok(workspace.includes("work.coverUrl ?"), "workspace must render stored coverUrl when present");
  assert.match(workspace, /<WorkCoverImage/);
  assert.ok(!workspace.includes("unoptimized"), "workspace no longer bypasses Next optimization");
  assert.ok(workspace.includes('sizes="(max-width: 640px) 180px, 240px"'), "responsive author workspace covers");
});

test("all work-cover thumbnails use Next optimization only for safe first-party CMS media", () => {
  const component = source("src/components/media/WorkCoverImage.tsx");
  const reader = source("src/features/reader/components/ReaderWorksTable.tsx");
  const writer = source("src/features/writer/components/WriterPublishExperienceEnhancer.tsx");
  const workspace = source("src/features/works/components/WorksWorkspace.tsx");

  assert.match(component, /import Image from "next\/image"/);
  assert.match(component, /const firstPartyMediaPath = src\.match\(/);
  assert.match(component, /\/api\\\/media\\\//);
  assert.match(component, /quality=\{75\}/);
  assert.match(component, /sizes=\{sizes\}/);
  assert.match(component, /src=\{firstPartyMediaPath\}/);
  assert.match(component, /if \(!firstPartyMediaPath\)/);
  assert.match(component, /<img src=\{src\} alt=\{alt\}/);
  for (const [name, sourceCode] of [["reader", reader], ["workspace", workspace], ["full-book-preview", writer]]) {
    assert.match(sourceCode, /<WorkCoverImage/, name + " should use shared CMS optimization");
  }
  assert.ok(!reader.includes('<img alt="" src={work.coverUrl}'), "reader list must not serve raw CMS files");
  assert.ok(!workspace.includes("unoptimized"), "writer workspace must not request original CMS PNG");
  assert.ok(!writer.includes("<img"), "writer publication preview must not request original CMS PNG");
});

test("CMS-only work cover optimizer keeps external image provider and safe URL normalization", () => {
  const component = source("src/components/media/WorkCoverImage.tsx");
  const compiled = ts.transpileModule(component, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    "next/image": { __esModule: true, default: "NextImage" },
    "react/jsx-runtime": { jsx, jsxs: jsx },
  };
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    name => {
      assert.ok(Object.hasOwn(mocks, name), "unexpected image dependency: " + name);
      return mocks[name];
    },
    module,
    module.exports,
  );
  const WorkCoverImage = module.exports.WorkCoverImage;
  const id = "459c18b8-39ea-4565-9663-0be6cace30e6";
  const coverPath = "/api/media/" + id;
  const props = { alt: "Test kapak", width: 96, height: 144, sizes: "44px", className: "cover-img" };
  for (const url of [coverPath, "https://ilkoku.com" + coverPath, "https://www.ilkoku.com" + coverPath + "?v=1"]) {
    const optimized = WorkCoverImage({ ...props, src: url });
    assert.equal(optimized.type, "NextImage", "First-party cover must use Next/Image");
    assert.equal(optimized.props.src, coverPath, "First-party URL normalized to same-origin media");
    assert.equal(optimized.props.quality, 75, "Image quality is explicit and supported by next.config");
    assert.equal(optimized.props.sizes, "44px", "Responsive size preserved");
    assert.equal(optimized.props.className, "cover-img", "Existing layout class preserved");
    assert.equal(optimized.props.alt, "Test kapak", "Existing alt preserved");
  }
  for (const url of [
    "https://external.example.com/covers/123.png",
    "/assets/legacy-cover.png",
    "//evil.example.com/api/media/" + id,
  ]) {
    const fallback = WorkCoverImage({ ...props, src: url });
    assert.equal(fallback.type, "img", "Non-CMS sources retain native image support");
    assert.equal(fallback.props.src, url, "External URL must never be rewritten");
    assert.equal(fallback.props.alt, "Test kapak", "Fallback alt remains unchanged");
  }
});
