import { createHash, randomBytes, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
const outputPath = process.env.BROWSER_AUTH_FIXTURE_PATH;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for authenticated browser fixtures.");
}
if (!outputPath) {
  throw new Error("BROWSER_AUTH_FIXTURE_PATH is required for authenticated browser fixtures.");
}

const parsed = new URL(databaseUrl);
const databaseName = parsed.pathname.replace(/^\//u, "");
const client = await mysql.createConnection({
  database: databaseName,
  host: parsed.hostname,
  password: decodeURIComponent(parsed.password),
  port: Number(parsed.port || 3306),
  user: decodeURIComponent(parsed.username),
});

const roles = ["reader", "writer", "editor_pending", "editor", "publisher", "admin"];
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
const now = new Date();
const sessions = {};
const userIds = {};
let writerCommerceWorkId = null;
let commerceWorkId = null;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

try {
  await client.beginTransaction();

  await client.execute(
    "DELETE FROM `Session` WHERE userId IN (SELECT id FROM `User` WHERE email LIKE 'ci-browser-%@example.invalid')",
  );
  await client.execute(
    "DELETE FROM `User` WHERE email LIKE 'ci-browser-%@example.invalid'",
  );

  for (const [index, role] of roles.entries()) {
    const userId = randomUUID();
    const sessionId = randomUUID();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);
    const email = `ci-browser-${role}@example.invalid`;
    const publicId = `CI26BROWSER${String(index + 1).padStart(2, "0")}`;

    await client.execute(
      `INSERT INTO \`User\`
        (id, publicId, email, passwordHash, fullName, role, status,
         emailVerified, termsAcceptedAt, lastLoginAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [
        userId,
        publicId,
        email,
        "ci-browser-session-only",
        `CI ${role}`,
        role,
        now,
        now,
        now,
        now,
        now,
      ],
    );

    await client.execute(
      `INSERT INTO \`Session\`
        (id, tokenHash, userId, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionId, tokenHash, userId, expiresAt, now],
    );

    sessions[role] = token;
    userIds[role] = userId;
  }

  const cmsManagerId = randomUUID();
  const cmsManagerToken = randomBytes(32).toString("base64url");
  const cmsManagerTokenHash = hashToken(cmsManagerToken);

  await client.execute(
    `INSERT INTO \`User\`
      (id, publicId, email, passwordHash, fullName, role, status,
       emailVerified, termsAcceptedAt, lastLoginAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'reader', 'active', ?, ?, ?, ?, ?)`,
    [
      cmsManagerId,
      "CI26CMSMGR01",
      "ci-browser-cms-manager@example.invalid",
      "ci-browser-session-only",
      "CI CMS Manager",
      now,
      now,
      now,
      now,
      now,
    ],
  );

  await client.execute(
    `INSERT INTO \`Session\`
      (id, tokenHash, userId, expiresAt, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), cmsManagerTokenHash, cmsManagerId, expiresAt, now],
  );

  await client.execute(
    `INSERT INTO \`ContentManagerAccess\`
      (id, userId, active, canPublish, grantedAt, createdAt, updatedAt)
     VALUES (?, ?, true, false, ?, ?, ?)`,
    [randomUUID(), cmsManagerId, now, now, now],
  );

  sessions.cmsManager = cmsManagerToken;
  userIds.cmsManager = cmsManagerId;

  // Two independent real reader sessions test a single last coupon use racing
  // across DIFFERENT users (the existing same-reader mutex is insufficient).
  for (const suffix of ["A", "B"]) {
    const id = randomUUID();
    const token = randomBytes(32).toString("base64url");
    await client.execute(
      `INSERT INTO \`User\`
        (id, publicId, email, passwordHash, fullName, role, status,
         emailVerified, termsAcceptedAt, lastLoginAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, 'reader', 'active', ?, ?, ?, ?, ?)`,
      [
        id,
        "CI26RACE" + suffix,
        "ci-browser-reader-race-" + suffix.toLowerCase() + "@example.invalid",
        "ci-browser-session-only",
        "CI Reader Race " + suffix,
        now, now, now, now, now,
      ],
    );
    await client.execute(
      `INSERT INTO \`Session\`
        (id, tokenHash, userId, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), hashToken(token), id, expiresAt, now],
    );
    await client.execute(
      `INSERT INTO \`Profile\`
        (id, userId, birthYear, createdAt, updatedAt)
       VALUES (?, ?, 1990, ?, ?)`,
      [randomUUID(), id, now, now],
    );
    await client.execute(
      `INSERT INTO \`AuditLog\`
        (id, actorId, action, entityType, entityId, metadata, createdAt)
       VALUES (?, ?, 'profile_updated', 'AgeVerification', ?, ?, ?)`,
      [
        randomUUID(),
        id,
        id,
        JSON.stringify({
          adultEligibleAt: "2008-01-01T00:00:00.000Z",
          birthYear: 1990,
          source: "ci_browser_fixture",
        }),
        now,
      ],
    );
    sessions["readerRace" + suffix] = token;
    userIds["readerRace" + suffix] = id;
  }

  for (const role of ["reader", "writer", "editor_pending", "editor", "publisher"]) {
    await client.execute(
      `INSERT INTO \`Profile\`
        (id, userId, birthYear, createdAt, updatedAt)
       VALUES (?, ?, 1990, ?, ?)`,
      [randomUUID(), userIds[role], now, now],
    );
    await client.execute(
      `INSERT INTO \`AuditLog\`
        (id, actorId, action, entityType, entityId, metadata, createdAt)
       VALUES (?, ?, 'profile_updated', 'AgeVerification', ?, ?, ?)`,
      [
        randomUUID(),
        userIds[role],
        userIds[role],
        JSON.stringify({
          adultEligibleAt: "2008-01-01T00:00:00.000Z",
          birthYear: 1990,
          source: "ci_browser_fixture",
        }),
        now,
      ],
    );
  }

  const contractTemplateId = randomUUID();
  await client.execute(
    `INSERT INTO \`ContractTemplate\`
      (id, code, title, description, targetRole, body, version, active,
       lifecycleStatus, sourceTemplateId, approvedById, approvedAt, activatedAt,
       createdById, updatedById, createdAt, updatedAt)
     VALUES (?, 'CI_BROWSER_READER_CONTRACT', 'CI Browser Reader Contract',
       'Ephemeral active contract template for browser mutation QA.',
       'reader',
       'Taraf: {{ad_soyad}}\\nE-posta: {{eposta}}\\nRol: {{rol}}\\nTarih: {{tarih}}\\n\\nCI browser mutation acceptance fixture.',
       1, true, 'active', NULL, ?, ?, ?, ?, ?, ?, ?)`,
    [
      contractTemplateId,
      userIds.admin,
      now,
      now,
      userIds.admin,
      userIds.admin,
      now,
      now,
    ],
  );
  await client.execute(
    `INSERT INTO \`ContractTemplateReviewEvidence\`
      (id, templateId, templateVersion, evidenceType, reviewerLabel, note, recordedById, createdAt)
     VALUES (?, ?, 1, 'admin_approval', 'CI Browser Admin',
       'Ephemeral CI-only admin approval evidence for browser mutation QA.', ?, ?)`,
    [randomUUID(), contractTemplateId, userIds.admin, now],
  );

  for (const role of ["editor", "publisher"]) {
    await client.execute(
      `INSERT INTO \`RoleRequest\`
        (id, userId, requestedRole, status, reviewedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, 'approved', ?, ?, ?)`,
      [randomUUID(), userIds[role], role, now, now, now],
    );
  }

  const publisherId = randomUUID();
  await client.execute(
    `INSERT INTO \`Publisher\`
      (id, publicId, companyName, slug, verified, active, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, true, true, ?, ?)`,
    [
      publisherId,
      "CI26PUBLISHER01",
      "CI Browser Publisher",
      "ci-browser-publisher",
      now,
      now,
    ],
  );
  await client.execute(
    `INSERT INTO \`PublisherMembership\`
      (id, publisherId, userId, role, active, createdAt, updatedAt)
     VALUES (?, ?, ?, 'owner', true, ?, ?)`,
    [randomUUID(), publisherId, userIds.publisher, now, now],
  );

  const publisherMemberUserId = randomUUID();
  await client.execute(
    `INSERT INTO \`User\`
      (id, publicId, email, passwordHash, fullName, role, status,
       emailVerified, termsAcceptedAt, lastLoginAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 'publisher', 'active', ?, ?, ?, ?, ?)`,
    [
      publisherMemberUserId,
      "CI26PUBMEMBER01",
      "ci-browser-publisher-member@example.invalid",
      "ci-browser-session-only",
      "CI Publisher Member",
      now,
      now,
      now,
      now,
      now,
    ],
  );
  await client.execute(
    `INSERT INTO \`RoleRequest\`
      (id, userId, requestedRole, status, reviewedAt, createdAt, updatedAt)
     VALUES (?, ?, 'publisher', 'approved', ?, ?, ?)`,
    [randomUUID(), publisherMemberUserId, now, now, now],
  );
  await client.execute(
    `INSERT INTO \`PublisherMembership\`
      (id, publisherId, userId, role, active, createdAt, updatedAt)
     VALUES (?, ?, ?, 'viewer', true, ?, ?)`,
    [randomUUID(), publisherId, publisherMemberUserId, now, now],
  );

  commerceWorkId = randomUUID();
  const commerceChapterId = randomUUID();
  writerCommerceWorkId = randomUUID();
  const writerCommerceChapterId = randomUUID();
  const commerceAgreementVersion = "ci-browser-v1";

  await client.execute(
    `UPDATE \`ContractTemplate\`
       SET title = 'CI Browser Reader Purchase Terms',
           body = 'CI-only reader digital content purchase terms for authenticated browser mutation QA.',
           version = 1,
           active = true,
           lifecycleStatus = 'active',
           approvedById = ?,
           approvedAt = ?,
           activatedAt = ?,
           updatedById = ?,
           updatedAt = ?
     WHERE code = 'ILKOKU_READER_DIGITAL_CONTENT_PURCHASE'`,
    [userIds.admin, now, now, userIds.admin, now],
  );

  await client.execute(
    `UPDATE \`ContractTemplate\`
       SET title = 'CI Browser Writer Publication Agreement',
           body = 'CI-only writer publication and access agreement for authenticated browser mutation QA.',
           version = 1,
           active = true,
           lifecycleStatus = 'active',
           approvedById = ?,
           approvedAt = ?,
           activatedAt = ?,
           updatedById = ?,
           updatedAt = ?
     WHERE code = 'ILKOKU_AUTHOR_PUBLICATION_ACCESS'`,
    [userIds.admin, now, now, userIds.admin, now],
  );
  await client.execute(
    `INSERT INTO \`ContractTemplateReviewEvidence\`
      (id, templateId, templateVersion, evidenceType, reviewerLabel, note, recordedById, createdAt)
     SELECT ?, id, 1, 'admin_approval', 'CI Browser Admin',
       'Ephemeral CI-only admin approval evidence for writer commerce mutation QA.', ?, ?
     FROM \`ContractTemplate\`
     WHERE code = 'ILKOKU_AUTHOR_PUBLICATION_ACCESS'`,
    [randomUUID(), userIds.admin, now],
  );

  await client.execute(
    `INSERT INTO \`Work\`
      (id, publicId, authorId, title, slug, status, visibility, isActive,
       publishedAt, createdAt, updatedAt)
     VALUES (?, 'CI26COMMERCE02', ?, 'CI Browser Writer Commerce Draft',
       'ci-browser-writer-commerce-config', 'draft', 'private', true, NULL, ?, ?)`,
    [writerCommerceWorkId, userIds.writer, now, now],
  );
  await client.execute(
    `INSERT INTO \`Chapter\`
      (id, workId, authorId, title, content, position, status, publishedAt,
       createdAt, updatedAt)
     VALUES (?, ?, ?, 'CI Commerce Config Bölümü',
       'Writer commerce configuration browser fixture content.',
       1, 'draft', NULL, ?, ?)`,
    [writerCommerceChapterId, writerCommerceWorkId, userIds.writer, now, now],
  );

  await client.execute(
    `INSERT INTO \`Work\`
      (id, publicId, authorId, title, slug, status, visibility, isActive,
       publishedAt, createdAt, updatedAt)
     VALUES (?, 'CI26COMMERCE01', ?, 'CI Browser 0 TL Eser',
       'ci-browser-zero-total-work', 'published', 'public', true, ?, ?, ?)`,
    [commerceWorkId, userIds.writer, now, now, now],
  );

  await client.execute(
    `INSERT INTO \`Chapter\`
      (id, workId, authorId, title, content, position, status, publishedAt,
       createdAt, updatedAt)
     VALUES (?, ?, ?, 'CI Kilitli Bölüm',
       'Provider-free zero total checkout browser fixture content.',
       1, 'published', ?, ?, ?)`,
    [commerceChapterId, commerceWorkId, userIds.writer, now, now, now],
  );

  await client.execute(
    `INSERT INTO \`ChapterAccess\`
      (id, chapterId, workId, accessType, createdAt, updatedAt)
     VALUES (?, ?, ?, 'locked', ?, ?)`,
    [randomUUID(), commerceChapterId, commerceWorkId, now, now],
  );

  await client.execute(
    `INSERT INTO \`WorkSaleConfiguration\`
      (id, workId, authorId, saleModel, priceAmount, currency, status,
       agreementVersion, confirmedAt, activatedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, 'paid', 0, 'TRY', 'ready', ?, ?, NULL, ?, ?)`,
    [
      randomUUID(),
      commerceWorkId,
      userIds.writer,
      commerceAgreementVersion,
      now,
      now,
      now,
    ],
  );

  await client.execute(
    `INSERT INTO \`WorkPublicationConsent\`
      (id, workId, authorId, publicationModel, priceAmount, currency,
       accessPlanSnapshot, agreementVersion, confirmedAt, createdAt)
     VALUES (?, ?, ?, 'paid', 0, 'TRY', ?, ?, ?, ?)`,
    [
      randomUUID(),
      commerceWorkId,
      userIds.writer,
      JSON.stringify([
        {
          chapterId: commerceChapterId,
          accessType: "locked",
          position: 1,
        },
      ]),
      commerceAgreementVersion,
      now,
      now,
    ],
  );


  // Ephemeral CI-only verified party. This is never deployed or seeded in production.
  // Seller identity must not be inferred from the author record.
  const ciLegalPartyId = randomUUID(); // platform-direct coupon fixture
  const ciAuthorLegalPartyId = randomUUID(); // independent author-owned 0 TL fixture
  const ciAuthorizationId = randomUUID();
  await client.execute(
    `INSERT INTO \`LegalParty\`
      (id, kind, legalName, taxIdentifier, legalAddress, contactEmail,
       verificationStatus, verifiedById, verifiedAt, createdAt, updatedAt)
     VALUES (?, 'platform', 'CI ONLY MOCK SELLER - NOT A REAL ENTITY',
       'CI-TEST-NOT-REAL', 'CI ephemeral address', 'ci@example.invalid',
       'verified', ?, ?, ?, ?)`,
    [ciLegalPartyId, userIds.admin, now, now, now],
  );
  // Disposable CI-only author seller linked to the exact work's writer.
  // These mock fields are never seeded to production.
  await client.execute(
    `INSERT INTO \`LegalParty\`
      (id, kind, ownerUserId, legalName, taxIdentifier, legalAddress, contactEmail,
       verificationStatus, verifiedById, verifiedAt, createdAt, updatedAt)
     VALUES (?, 'individual', ?, 'CI ONLY MOCK AUTHOR SELLER - NOT A REAL ENTITY',
       'CI-AUTHOR-TEST', 'CI ephemeral address', 'ci-author@example.invalid',
       'verified', ?, ?, ?, ?)`,
    [ciAuthorLegalPartyId, userIds.writer, userIds.admin, now, now, now],
  );
  await client.execute(
    `INSERT INTO \`WorkSalesAuthorization\`
      (id, workId, legalPartyId, version, status, rightsScope,
       documentHash, validFrom, verifiedById, verifiedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, 'verified', ?, ?, ?, ?, ?, ?, ?)`,
    [
      ciAuthorizationId,
      commerceWorkId,
      ciAuthorLegalPartyId,
      JSON.stringify({ right: "digital_read_access", territory: "TR", testOnly: true }),
      "a".repeat(64),
      now,
      userIds.admin,
      now,
      now,
      now,
    ],
  );
  await client.execute(
    `INSERT INTO \`WorkSellerAssignment\`
      (id, workId, legalPartyId, authorizationId, mode, status,
       version, currentKey, approvedById, approvedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'third_party', 'approved', 1, ?, ?, ?, ?, ?)`,
    [
      randomUUID(),
      commerceWorkId,
      ciAuthorLegalPartyId,
      ciAuthorizationId,
      commerceWorkId,
      userIds.admin,
      now,
      now,
      now,
    ],
  );

  // A paid 100 TL work + a 100% platform coupon proves the provider-free
  // coupon-to-zero flow and immutable accounting. Disposable CI ONLY.
  const couponWorkId = randomUUID();
  const previewChapterId = randomUUID();
  const lockedChapterId = randomUUID();
  const couponRightsId = randomUUID();
  const couponId = randomUUID();
  await client.execute(
    `INSERT INTO \`Work\`
       (id, publicId, authorId, title, slug, status, visibility, isActive,
        publishedAt, createdAt, updatedAt)
     VALUES (?, 'CI26COUPON003', ?, 'CI Browser Kupon Eseri',
       'ci-browser-coupon-work', 'published', 'public', true, ?, ?, ?)`,
    [couponWorkId, userIds.writer, now, now, now],
  );
  for (const [id, title, content, pos, accessType] of [
    [previewChapterId, "CI Ön İzleme", "CI browser preview chapter is readable before purchase.", 1, "preview"],
    [lockedChapterId, "CI Kupon Kilitli", "CI browser coupon paid chapter unlocks after 100 percent discount.", 2, "locked"],
  ]) {
    await client.execute(
      `INSERT INTO \`Chapter\`
        (id, workId, authorId, title, content, position, status, publishedAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)`,
      [id, couponWorkId, userIds.writer, title, content, pos, now, now, now],
    );
    await client.execute(
      `INSERT INTO \`ChapterAccess\`
        (id, chapterId, workId, accessType, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), id, couponWorkId, accessType, now, now],
    );
  }
  await client.execute(
    `INSERT INTO \`WorkSaleConfiguration\`
      (id, workId, authorId, saleModel, priceAmount, currency, status,
       agreementVersion, confirmedAt, activatedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, 'paid', 10000, 'TRY', 'active', ?, ?, ?, ?, ?)`,
    [randomUUID(), couponWorkId, userIds.writer, commerceAgreementVersion, now, now, now, now],
  );
  await client.execute(
    `INSERT INTO \`WorkPublicationConsent\`
      (id, workId, authorId, publicationModel, priceAmount, currency,
       accessPlanSnapshot, agreementVersion, confirmedAt, createdAt)
     VALUES (?, ?, ?, 'paid', 10000, 'TRY', ?, ?, ?, ?)`,
    [
      randomUUID(), couponWorkId, userIds.writer,
      JSON.stringify([
        { chapterId: previewChapterId, accessType: "preview", position: 1 },
        { chapterId: lockedChapterId, accessType: "locked", position: 2 },
      ]),
      commerceAgreementVersion, now, now,
    ],
  );
  await client.execute(
    `INSERT INTO \`WorkSalesAuthorization\`
      (id, workId, legalPartyId, version, status, rightsScope, documentHash,
       validFrom, verifiedById, verifiedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, 1, 'verified', ?, ?, ?, ?, ?, ?, ?)`,
    [
      couponRightsId, couponWorkId, ciLegalPartyId,
      JSON.stringify({ right: "digital_read_access", territory: "TR", testOnly: true }),
      "b".repeat(64), now, userIds.admin, now, now, now,
    ],
  );
  await client.execute(
    `INSERT INTO \`WorkSellerAssignment\`
      (id, workId, legalPartyId, authorizationId, mode, status,
       version, currentKey, approvedById, approvedAt, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, 'platform_direct', 'approved', 1, ?, ?, ?, ?, ?)`,
    [randomUUID(), couponWorkId, ciLegalPartyId, couponRightsId,
     couponWorkId, userIds.admin, now, now, now],
  );
  await client.execute(
    `INSERT INTO \`Coupon\`
      (id, code, owner, creatorId, discountType, discountValue, scope,
       status, perUserUsageLimit, usageCount, createdAt, updatedAt)
     VALUES (?, 'CIBROWSER100', 'platform', ?, 'percent', 100,
       'selected_works', 'active', 1, 0, ?, ?)`,
    [couponId, userIds.admin, now, now],
  );
  await client.execute(
    `INSERT INTO \`CouponWorkScope\`
      (id, couponId, workId, createdAt) VALUES (?, ?, ?, ?)`,
    [randomUUID(), couponId, couponWorkId, now],
  );
  // Negative-path coupon: a 50% reduction still leaves a positive balance.
  // This must NEVER create an order or unlock the chapter without a provider.
  const partialCouponId = randomUUID();
  await client.execute(
    `INSERT INTO \`Coupon\`
      (id, code, owner, creatorId, discountType, discountValue, scope,
       status, perUserUsageLimit, usageCount, createdAt, updatedAt)
     VALUES (?, 'CIBROWSER50', 'platform', ?, 'percent', 50,
       'selected_works', 'active', 1, 0, ?, ?)`,
    [partialCouponId, userIds.admin, now, now],
  );
  await client.execute(
    `INSERT INTO \`CouponWorkScope\`
      (id, couponId, workId, createdAt) VALUES (?, ?, ?, ?)`,
    [randomUUID(), partialCouponId, couponWorkId, now],
  );

  // Distinct author-owned coupon for browser QA of the two checkout sources.
  const authorCouponId = randomUUID();
  await client.execute(
    `INSERT INTO \`Coupon\`
      (id, code, owner, creatorId, authorId, discountType, discountValue,
       scope, status, perUserUsageLimit, usageCount, createdAt, updatedAt)
     VALUES (?, 'CIBROWSERAUTHOR', 'author', ?, ?, 'percent', 100,
       'selected_works', 'active', 1, 0, ?, ?)`,
    [authorCouponId, userIds.writer, userIds.writer, now, now],
  );
  await client.execute(
    `INSERT INTO \`CouponWorkScope\`
      (id, couponId, workId, createdAt) VALUES (?, ?, ?, ?)`,
    [randomUUID(), authorCouponId, couponWorkId, now],
  );
  await client.commit();
} catch (error) {
  await client.rollback();
  throw error;
} finally {
  await client.end();
}

await writeFile(
  outputPath,
  JSON.stringify({
    cookieName: "ilkoku_session",
    sessions,
    workIds: {
      writerCommerceConfiguration: writerCommerceWorkId,
      zeroTotalCommerceWork: commerceWorkId,
    },
  }),
  { mode: 0o600 },
);

console.log(`Prepared ${roles.length + 1} ephemeral authenticated browser identities.`);
