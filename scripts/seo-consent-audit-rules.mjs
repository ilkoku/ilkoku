// Pure privacy gate used by the live, read-only two-context browser audit.
// Do not short-circuit on initial failures: collect post-choice evidence as well.
export function evaluateConsentAudit({ choice, initial, after, initialRequests, afterRequests }) {
  if (choice !== "reject" && choice !== "accept") {
    throw new Error("Unknown consent choice");
  }

  const violations = [];
  const isGatewayRequest = (request) => request.url.includes("/1q6z/") || request.url.includes("/ilkgtm/");
  const gatewayScriptsBeforeChoice = initialRequests.filter(isGatewayRequest).length;
  const gatewayScriptsAfterChoice = afterRequests.filter(isGatewayRequest).length;

  if (initial.hasSavedConsent) {
    violations.push("FRESH_CONTEXT_ALREADY_HAS_CONSENT");
  }
  if (initial.appGtm || initial.appGa4) {
    violations.push("APP_TAG_LOADED_BEFORE_CONSENT");
  }
  if (gatewayScriptsBeforeChoice > 0) {
    violations.push("GATEWAY_REQUEST_BEFORE_CONSENT");
  }

  if (choice === "reject") {
    if (gatewayScriptsAfterChoice > 0) {
      violations.push("GATEWAY_REQUEST_AFTER_REJECT");
    }
    if (after.appGtm || after.appGa4 || after.consent === "granted") {
      violations.push("MEASUREMENT_ENABLED_AFTER_REJECT");
    }
  } else if (!after.appGtm || after.consent !== "granted") {
    violations.push("APP_GTM_NOT_LOADED_AFTER_ACCEPT");
  }

  return {
    passed: violations.length === 0,
    violations,
    gatewayScriptsBeforeChoice,
    gatewayScriptsAfterChoice,
  };
}
