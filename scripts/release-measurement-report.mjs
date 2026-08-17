import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const strict = process.argv.includes("--strict");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for the release measurement report.");
}

const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.replace(/^\//u, "");
const connectionOptions = {
  database: databaseName,
  host: parsed.hostname,
  password: decodeURIComponent(parsed.password),
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
};

function numberValue(value) {
  if (value === null || value === undefined) return 0;
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Non-numeric aggregate returned by release measurement: ${String(value)}`);
  }
  return parsedValue;
}

function groupedCounts(rows, keyField, valueField = "total") {
  return Object.fromEntries(
    rows.map((row) => [String(row[keyField]), numberValue(row[valueField])]),
  );
}

const client = await mysql.createConnection(connectionOptions);

try {
  await client.query("SET SESSION TRANSACTION READ ONLY");

  const [[clock]] = await client.query(
    "SELECT CURRENT_TIMESTAMP(3) AS generatedAt",
  );

  const [[reader]] = await client.query(`
    SELECT
      (SELECT COUNT(*)
       FROM Work
       WHERE status = 'published'
         AND visibility = 'public'
         AND publishedAt IS NOT NULL
         AND archivedAt IS NULL) AS publicWorks,
      (SELECT COUNT(*) FROM ReadingProgress) AS readingStarts,
      (SELECT COUNT(*) FROM ReadingProgress WHERE completed = 1) AS completedReads,
      (SELECT COUNT(DISTINCT userId) FROM ReadingProgress) AS readersWithProgress,
      (SELECT COALESCE(SUM(viewCount), 0) FROM ReadingAccess) AS securedChapterViews,
      (SELECT COUNT(*) FROM Favorite) AS readerFavorites,
      (SELECT COUNT(*) FROM Comment WHERE status = 'visible' AND deletedAt IS NULL) AS visibleComments
  `);

  const [[publisher]] = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM PublisherWorkLike) AS workLikes,
      (SELECT COUNT(*) FROM PublisherWorkFavorite) AS workFavorites,
      (SELECT COUNT(*) FROM PublisherAuthorLike) AS authorLikes,
      (SELECT COUNT(*) FROM PublisherAuthorFavorite) AS authorFavorites,
      (SELECT COUNT(*) FROM PublisherAuthorFollow) AS authorFollows,
      (SELECT COUNT(*) FROM PublisherDiscoveryShare WHERE channel = 'team') AS teamShares,
      (SELECT COUNT(*) FROM PublisherDiscoveryShare WHERE channel = 'email') AS emailShares,
      (SELECT COUNT(*) FROM PublisherEditorRequest) AS editorRequests,
      (SELECT COUNT(*) FROM PublisherSubmission WHERE archivedAt IS NULL) AS activeSubmissions
  `);

  const [editorRequestRows] = await client.query(`
    SELECT status, COUNT(*) AS total
    FROM PublisherEditorRequest
    GROUP BY status
    ORDER BY status
  `);

  const [submissionRows] = await client.query(`
    SELECT status, COUNT(*) AS total
    FROM PublisherSubmission
    WHERE archivedAt IS NULL
    GROUP BY status
    ORDER BY status
  `);

  const [deliveryRows] = await client.query(`
    SELECT status, COUNT(*) AS total
    FROM EmailDelivery
    GROUP BY status
    ORDER BY status
  `);

  const [auditRows] = await client.query(`
    SELECT action, COUNT(*) AS total
    FROM AuditLog
    WHERE action IN (
      'register',
      'login',
      'work_published',
      'publisher_work_liked',
      'publisher_author_liked',
      'publisher_work_favorited',
      'publisher_author_favorited',
      'publisher_author_followed',
      'publisher_discovery_shared'
    )
    GROUP BY action
    ORDER BY action
  `);

  const [[integrity]] = await client.query(`
    SELECT
      (SELECT COUNT(*)
       FROM Work
       WHERE status = 'published'
         AND visibility = 'public'
         AND (publishedAt IS NULL OR archivedAt IS NOT NULL)) AS invalidPublicWorks,
      (SELECT COUNT(*)
       FROM Work w
       WHERE w.status = 'published'
         AND w.visibility = 'public'
         AND w.publishedAt IS NOT NULL
         AND w.archivedAt IS NULL
         AND NOT EXISTS (
           SELECT 1
           FROM Chapter c
           WHERE c.workId = w.id
             AND c.status = 'published'
             AND c.publishedAt IS NOT NULL
             AND c.archivedAt IS NULL
         )) AS publicWorksWithoutPublishedChapter,
      (SELECT COUNT(*)
       FROM EmailDelivery
       WHERE status = 'pending'
         AND createdAt < DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 15 MINUTE)) AS stalePendingEmails
  `);

  const report = {
    generatedAt:
      clock?.generatedAt instanceof Date
        ? clock.generatedAt.toISOString()
        : String(clock?.generatedAt ?? ""),
    measurementSchema: 1,
    reader: {
      publicWorks: numberValue(reader.publicWorks),
      readingStarts: numberValue(reader.readingStarts),
      completedReads: numberValue(reader.completedReads),
      readersWithProgress: numberValue(reader.readersWithProgress),
      securedChapterViews: numberValue(reader.securedChapterViews),
      favorites: numberValue(reader.readerFavorites),
      visibleComments: numberValue(reader.visibleComments),
    },
    publisher: {
      workLikes: numberValue(publisher.workLikes),
      workFavorites: numberValue(publisher.workFavorites),
      authorLikes: numberValue(publisher.authorLikes),
      authorFavorites: numberValue(publisher.authorFavorites),
      authorFollows: numberValue(publisher.authorFollows),
      teamShares: numberValue(publisher.teamShares),
      emailShares: numberValue(publisher.emailShares),
      editorRequests: numberValue(publisher.editorRequests),
      editorRequestsByStatus: groupedCounts(editorRequestRows, "status"),
      activeSubmissions: numberValue(publisher.activeSubmissions),
      submissionsByStatus: groupedCounts(submissionRows, "status"),
    },
    delivery: groupedCounts(deliveryRows, "status"),
    audit: groupedCounts(auditRows, "action"),
    integrity: {
      invalidPublicWorks: numberValue(integrity.invalidPublicWorks),
      publicWorksWithoutPublishedChapter: numberValue(
        integrity.publicWorksWithoutPublishedChapter,
      ),
      stalePendingEmails: numberValue(integrity.stalePendingEmails),
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (
    strict &&
    (report.integrity.invalidPublicWorks > 0 ||
      report.integrity.publicWorksWithoutPublishedChapter > 0)
  ) {
    process.exitCode = 2;
  }
} finally {
  await client.end();
}
