import { config } from "./config";
import { violationWeight, type Violation } from "./violations";

export type RiskLevel = "Rendah" | "Sedang" | "Tinggi";

export const riskScore = (violations: Violation[]) =>
  violations.reduce((sum, v) => sum + violationWeight[v.type], 0);

export const riskLevel = (score: number): RiskLevel => {
  if (score < config.risk.medium) return "Rendah";
  if (score < config.risk.high) return "Sedang";
  return "Tinggi";
};
