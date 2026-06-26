export interface AdaptiveSessionConfig {
  sessionLengthMs: number;
  activityEvents?: string[];
  onExtendSession: () => Promise<boolean> | void;
  onLogout: () => void;
}