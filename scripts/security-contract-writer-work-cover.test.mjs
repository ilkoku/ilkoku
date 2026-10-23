import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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
