import "server-only";

import { cache } from "react";
import { getSystemMapSnapshot } from "./collector";
import { getIntegrityControlReport } from "./integrity-control";
import { getSystemOperationsReport } from "./operations";
import { getRuntimeInfrastructureReport } from "./runtime-infrastructure";

export const getSystemMapWorkspaceData = cache(async () => {
  const snapshot = await getSystemMapSnapshot();
  const [operations, infrastructure] = await Promise.all([
    getSystemOperationsReport(snapshot),
    getRuntimeInfrastructureReport(snapshot),
  ]);
  const integrity = getIntegrityControlReport(snapshot, operations, infrastructure);

  return {
    infrastructure,
    integrity,
    operations,
    snapshot,
  };
});
