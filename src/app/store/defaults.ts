import type { RuntimeDefaults } from "../types/store";

export const runtimeDefaults: RuntimeDefaults = {
  defaultNodeTimeoutSec: 1800,
  defaultRetryEnabled: true,
  defaultMaxAttempts: 3,
  defaultRetryIntervalType: "fixed",
  defaultRetryBaseIntervalSec: 300,
  defaultRetryMaxIntervalSec: 1800,
  defaultAfterRetryExhaustedAction: "terminate",
  defaultAlertOnFailure: true,
  defaultOnFailureAction: "terminate",
  defaultJoinPolicy: "all_success",
  defaultPriority: "normal",
  defaultDryRunVisible: true,
  defaultCommentRequired: false,
  defaultRunTimeoutSec: 3600,
};

