import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFileSync(join(ROOT, path), "utf8");
const contains = (text, fragment, label) => assert.ok(
  text.includes(fragment),
  `${label} must contain ${JSON.stringify(fragment)}`,
);
const notContains = (text, fragment, label) => assert.ok(
  !text.includes(fragment),
  `${label} must not contain ${JSON.stringify(fragment)}`,
);

test("contract server actions expose only canonical guarded write paths", () => {
  const actions = source("src/features/contracts/actions.ts");
  const guarded = source("src/features/contracts/guarded-response-actions.ts");

  contains(actions, "sendManualAdminContract", "canonical manual dispatch");
  contains(actions, "createManagedContractTemplate", "managed template creation");
  contains(actions, "updateManagedContractTemplate", "managed template editing");
  contains(actions, "transitionContractTemplateLifecycle", "managed lifecycle transitions");
  notContains(actions, "respondToContractAction", "legacy unconfirmed response action retired");
  notContains(actions, "cancelContractFromAdminAction", "legacy unconfirmed cancel action retired");
  notContains(actions, "respondToUserContract", "direct terminal response repository import retired from generic actions");
  notContains(actions, "cancelAdminContract", "direct cancel repository import retired from generic actions");

  contains(guarded, 'formData.get("responseConfirmed") === "confirmed"', "response confirmation gate");
  contains(guarded, 'formData.get("cancelConfirmed") === "confirmed"', "cancel confirmation gate");
});

test("legacy repository write services cannot bypass managed lifecycle or manual dispatch", () => {
  const repository = source("src/features/contracts/repository.ts");

  notContains(repository, "export async function sendAdminContract(", "legacy manual send service retired");
  notContains(repository, "export async function createContractTemplate(", "legacy immediate-active create retired");
  notContains(repository, "export async function updateContractTemplate(", "legacy active-checkbox edit retired");
  contains(repository, "export async function cancelAdminContract(", "canonical terminal cancellation remains");
  contains(repository, "export async function markUserContractViewed(", "canonical ownership-scoped viewed write remains");
  contains(repository, "export async function respondToUserContract(", "canonical ownership-scoped terminal response remains");
});

test("viewed evidence is produced only after the real contract detail mounts", () => {
  const detail = source("src/app/sozlesmelerim/[contractId]/page.tsx");
  const marker = source("src/features/contracts/ContractViewedMarker.tsx");
  const action = source("src/features/contracts/view-actions.ts");

  contains(detail, "ContractViewedMarker", "mounted viewed marker");
  contains(detail, 'shouldMark={contract.status === "sent"}', "sent-only viewed marker");
  notContains(detail, "markUserContractViewed", "server render must not mutate viewed state");
  notContains(detail, "initialContract", "double server read/view mutation retired");

  contains(marker, '"use client"', "client-only mounted evidence");
  contains(marker, "useEffect", "mount-based viewed signal");
  contains(marker, "markContractViewedAction(contractId)", "canonical viewed action invocation");
  contains(action, "getCurrentUser", "authenticated viewed actor");
  contains(action, "recipientUserId: user.id", "recipient ownership boundary");
  contains(action, "markUserContractViewed", "canonical DB viewed transition");
});

test("system map exposes the completed contract chain and intentional remaining boundaries", () => {
  const navigation = source("src/features/system-map/navigation.ts");
  const page = source("src/app/harita/sozlesmeler/page.tsx");

  contains(navigation, 'href: "/harita/sozlesmeler"', "contract map navigation entry");
  contains(navigation, 'label: "Sözleşme Akışı"', "contract map navigation label");

  contains(page, '"/kayit", "/uyelik-sozlesmesi"', "registration agreement map");
  contains(page, '"/sozlesme/taslaklar"', "soft draft map");
  contains(page, '"/sozlesme/sablonlar", "/sozlesme/sablonlar/[templateId]"', "template lifecycle map");
  contains(page, 'routes: ["/sozlesme"]', "assignment workbench map");
  contains(page, '"/sozlesmelerim", "/sozlesmelerim/[contractId]"', "recipient contract map");
  contains(page, '"/sozlesme/takip", "/sozlesme/[contractId]"', "tracking/reminder map");
  contains(page, '"/sozlesme/bildirimler", "/harita/olaylar"', "notification and email map");
  contains(page, "hukuki inceleme", "legal activation boundary remains explicit");
  contains(page, "nihai yayın hakları sözleşmesi", "final commercial rights boundary remains explicit");
  contains(page, "Final Release UAT #263", "human UAT boundary remains explicit");
  contains(page, "getSystemMapWorkspaceData", "map route evidence comes from canonical inventory");
});
