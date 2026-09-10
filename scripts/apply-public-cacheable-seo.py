from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    target.write_text(text.replace(old, new, 1))


# Homepage must not read the authenticated session while rendering public HTML.
path = "src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx"
text = Path(path).read_text()
for line in [
    'import { authContent } from "@/content";\n',
    'import { logoutAction } from "@/features/auth/actions";\n',
    'import { getRoleNavigation } from "@/features/auth/destination";\n',
    'import { getCurrentProfile } from "@/features/auth/profile";\n',
]:
    if line not in text:
        raise SystemExit(f"{path}: missing import {line.strip()}")
    text = text.replace(line, "", 1)
Path(path).write_text(text)

replace_once(
    path,
    '''export default async function HomepageExperience() {
  const [profile, roleCardState, homepageState] = await Promise.all([
    getCurrentProfile(),
    getPublishedRoleCardsState("tr"),
    getPublishedHomepageState("tr"),
  ]);

  const navigation = profile ? await getRoleNavigation(profile) : null;
  const pendingRole = navigation?.pendingRequest?.requestedRole ?? (profile?.role === "editor_pending" ? "editor" : null);
''',
    '''export default async function HomepageExperience() {
  const [roleCardState, homepageState] = await Promise.all([
    getPublishedRoleCardsState("tr"),
    getPublishedHomepageState("tr"),
  ]);
''',
)

replace_once(
    path,
    '''            <div className="nx-account__menu">
              {profile && navigation ? <>
                <div className="nx-account__identity"><strong>{profile.fullName}</strong><span>Aktif rol: {authContent.roles[profile.role]}</span>{navigation.hasPendingRequest ? <small>{pendingRole ? `${authContent.roles[pendingRole]} başvurunuz inceleniyor` : "Başvurunuz inceleniyor"}</small> : null}</div>
                <Link href="/hesabim">Hesabım</Link><Link href={navigation.workspaceHref}>{navigation.hasPendingRequest ? "Mevcut çalışma alanına dön" : "Çalışma Alanım"}</Link><form action={logoutAction}><button type="submit">Çıkış Yap</button></form>
              </> : <><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a></>}
            </div>
''',
    '''            <div className="nx-account__menu">
              <Link href="/hesabim">Hesabım</Link><Link href="/giris">Giriş Yap</Link><a href="#roller">Üye Ol</a>
            </div>
''',
)

replace_once(
    path,
    '''      <LiveHomepageFooter
        signedIn={Boolean(profile && navigation)}
        workspaceHref={navigation?.workspaceHref}
        slogan={footer?.slogan || "İlk cümle, ilk okurun, ilk adımın."}
''',
    '''      <LiveHomepageFooter
        signedIn={false}
        slogan={footer?.slogan || "İlk cümle, ilk okurun, ilk adımın."}
''',
)

# Public indexable routes should be cacheable ISR surfaces, not force-dynamic app surfaces.
public_pages = [
    "src/app/page.tsx",
    "src/app/yardim/page.tsx",
    "src/app/editorler/page.tsx",
    "src/app/iletisim/page.tsx",
    "src/app/hakkimizda/page.tsx",
    "src/app/nasil-calisir/page.tsx",
    "src/app/editoryal-standartlar/page.tsx",
    "src/app/icerik-ve-yas-politikasi/page.tsx",
    "src/app/topluluk-kurallari/page.tsx",
    "src/app/telif-bildirimi/page.tsx",
    "src/app/yazarlar-icin/page.tsx",
    "src/app/editorler-icin/page.tsx",
    "src/app/yayinevleri-icin/page.tsx",
]
changed = []
for route in public_pages:
    target = Path(route)
    if not target.exists():
        raise SystemExit(f"missing route: {route}")
    source = target.read_text()
    marker = 'export const dynamic = "force-dynamic";'
    if marker in source:
        target.write_text(source.replace(marker, 'export const revalidate = 300;', 1))
        changed.append(route)

if "src/app/page.tsx" not in changed:
    raise SystemExit("root homepage force-dynamic marker was not found")

# Existing contracts now protect session-neutral public HTML.
path = "scripts/security-contract-public-site-header.test.mjs"
text = Path(path).read_text()
old = '''  assert.match(header, /navigation\\.workspaceHref/);
  assert.match(header, /logoutAction/);
'''
new = '''  assert.doesNotMatch(header, /getCurrentProfile|navigation\\.workspaceHref|logoutAction/);
'''
if old not in text:
    raise SystemExit(f"{path}: expected session assertions were not found")
Path(path).write_text(text.replace(old, new, 1))

path = "scripts/security-contract-cms-footer-workbench.test.mjs"
text = Path(path).read_text()
old = '''  has(footer, "getCurrentProfile", "session-aware footer account state");
  has(footer, "getRoleNavigation", "role-aware workspace footer link");
'''
new = '''  lacks(footer, "getCurrentProfile", "public footer must not read session server-side");
  lacks(footer, "getRoleNavigation", "public footer must not resolve workspace server-side");
'''
if old not in text:
    raise SystemExit(f"{path}: expected footer session assertions were not found")
Path(path).write_text(text.replace(old, new, 1))

Path("scripts/security-contract-public-cacheable-seo.test.mjs").write_text(
    '''import assert from "node:assert/strict";\nimport fs from "node:fs";\nimport test from "node:test";\n\nconst read = (path) => fs.readFileSync(path, "utf8");\n\ntest("public SEO shell stays cacheable and session-neutral", () => {\n  const homepage = read("src/app/page.tsx");\n  const experience = read("src/app/onizleme/ana-sayfa-yeni/HomepageExperience.tsx");\n  const header = read("src/components/layout/PublicSiteHeader.tsx");\n  const footer = read("src/components/content/PublicTrustFooter.tsx");\n\n  assert.match(homepage, /export const revalidate = 300;/u);\n  assert.doesNotMatch(homepage, /force-dynamic/u);\n  for (const source of [experience, header, footer]) {\n    assert.doesNotMatch(source, /getCurrentProfile/u);\n    assert.doesNotMatch(source, /getRoleNavigation/u);\n  }\n});\n'''
)

path = "package.json"
text = Path(path).read_text()
needle = "scripts/security-contract-public-site-header.test.mjs "
addition = "scripts/security-contract-public-cacheable-seo.test.mjs "
if addition not in text:
    if needle not in text:
        raise SystemExit("package.json security test insertion point missing")
    Path(path).write_text(text.replace(needle, needle + addition, 1))
