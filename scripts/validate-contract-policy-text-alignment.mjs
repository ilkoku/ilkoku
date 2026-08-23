import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Contract policy validation failed: DATABASE_URL is required.");
  process.exit(1);
}

const parsed = new URL(databaseUrl);
const connection = await mysql.createConnection({
  host: parsed.hostname,
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: decodeURIComponent(parsed.pathname.replace(/^\//u, "")),
});

const expectedTemplates = {
  LIB_GENERAL_NDA: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: [
      "beş (5) yıl devam eder",
      "sır veya kamuya açık olmayan niteliklerini korudukları sürece zaman sınırı olmaksızın",
    ],
  },
  LIB_WRITER_PLATFORM_LICENSE: {
    version: 1,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: ["hizmet amacıyla sınırlı"],
  },
  LIB_WRITER_EDITOR_REVIEW: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: [
      "İkinci editör kendi değerlendirmesini bağımsız biçimde tamamlayana kadar",
      "ikinci editör bağımsız incelemeye başlamadan önce",
    ],
  },
  LIB_EDITOR_REVIEW_ETHICS: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: ["İkinci değerlendirme tamamlandıktan sonra birinci editör ikinci raporu"],
  },
  LIB_EDITOR_CANDIDATE_NDA: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: ["diğer gizli bilgiler ise görev veya erişim sona erdikten sonra beş (5) yıl"],
  },
  LIB_PUBLISHER_DISCOVERY_NDA: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: ["diğer gizli bilgiler ilgili erişim veya iş ilişkisi sona erdikten sonra beş (5) yıl"],
  },
  LIB_PUBLISHER_TEAM_CONFIDENTIALITY: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: [
      "kişisel cihazında veya kişisel çalışma alanında bulunan indirilen kopyalar",
      "yetki kontrollü yönetici arşivinde bulunan kurumsal kopya",
    ],
  },
  LIB_PUBLICATION_INTENT_WRITER: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: [
      "ilk otuz (30) gün boyunca",
      "altmış (60) gün geçerlidir",
    ],
  },
  LIB_PUBLICATION_INTENT_PUBLISHER: {
    version: 2,
    active: false,
    lifecycleStatus: "draft",
    expectedMarkers: [
      "resmi yayın niyetini sistemde kayıt altına alır",
      "aynı süre politikasını kullanır",
      "altmış (60) gün geçerlidir",
    ],
  },
};

try {
  const codes = Object.keys(expectedTemplates);
  const placeholders = codes.map(() => "?").join(",");
  const [rows] = await connection.query(
    `SELECT code, version, active, lifecycleStatus, body
     FROM ContractTemplate
     WHERE code IN (${placeholders})`,
    codes,
  );

  const byCode = new Map(rows.map((row) => [row.code, row]));
  const failures = [];

  for (const [code, expected] of Object.entries(expectedTemplates)) {
    const row = byCode.get(code);
    if (!row) {
      failures.push(`${code}: missing from recovered database`);
      continue;
    }

    const active = row.active === 1 || row.active === true;
    if (Number(row.version) !== expected.version) {
      failures.push(`${code}: version ${row.version}, expected ${expected.version}`);
    }
    if (row.lifecycleStatus !== expected.lifecycleStatus) {
      failures.push(`${code}: lifecycle ${row.lifecycleStatus}, expected ${expected.lifecycleStatus}`);
    }
    if (active !== expected.active) {
      failures.push(`${code}: active=${active}, expected ${expected.active}`);
    }
    for (const marker of expected.expectedMarkers) {
      if (!String(row.body ?? "").includes(marker)) {
        failures.push(`${code}: body missing marker ${JSON.stringify(marker)}`);
      }
    }
  }

  const [softRows] = await connection.query(
    "SELECT COUNT(*) AS count FROM ContractTemplate WHERE code LIKE 'SOFT\\_%' ESCAPE '\\\\' AND lifecycleStatus <> 'soft'",
  );
  if (Number(softRows[0]?.count ?? 0) !== 0) {
    failures.push("one or more SOFT_* source templates no longer have lifecycleStatus=soft");
  }

  if (failures.length > 0) {
    console.error("Contract policy validation failed after fresh recovery:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  } else {
    console.log("Contract policy validation passed: 8 aligned LIB v2 templates + 1 unaffected LIB v1, all passive and exact text markers present.");
  }
} finally {
  await connection.end();
}
