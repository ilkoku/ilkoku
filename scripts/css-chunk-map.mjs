import fs from "node:fs";
import path from "node:path";

const dir=".next/static/css";
if (!fs.existsSync(dir)) {
  console.log("CSS_CHUNK_MAP missing", dir);
  process.exit(0);
}
const files=fs.readdirSync(dir).filter(f=>f.endsWith(".css"));
for(const file of files){
  const full=path.join(dir,file);
  const css=fs.readFileSync(full,"utf8");
  const families={
    nx:(css.match(/\.nx-/g)||[]).length,
    landing:(css.match(/\.landing-/g)||[]).length,
    sidebar:(css.match(/\.sidebar/g)||[]).length,
    dashboard:(css.match(/\.dashboard/g)||[]).length,
    writer:(css.match(/\.writer/g)||[]).length,
    editor:(css.match(/\.editor/g)||[]).length,
    reading:(css.match(/\.reading/g)||[]).length,
    auth:(css.match(/\.auth/g)||[]).length,
    profile:(css.match(/\.profile/g)||[]).length,
    work:(css.match(/\.work/g)||[]).length,
  };
  console.log("CSS_CHUNK_MAP", JSON.stringify({
    file,
    bytes:fs.statSync(full).size,
    families,
    hasColorBackground:css.includes("--color-background"),
    hasNxHero:css.includes(".nx-hero"),
    hasSidebarNav:css.includes(".sidebar__nav"),
    hasWriterFlow:css.includes("writer-flow")||css.includes(".writer-"),
    hasReading:css.includes(".reading-"),
  }));
}
