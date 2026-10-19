import { config } from "./config";
import { violationWeight, type Violation } from "./violations";

export type RiskLevel = "Rendah" | "Sedang" | "Tinggi";

export type RiskTone = "neutral" | "warn" | "danger";

export const riskScore = (violations: Violation[]) =>
  violations.reduce((sum, violation) => sum + violationWeight[violation.type], 0);

export const riskLevel = (score: number): RiskLevel => {
  if (score < config.risk.medium) return "Rendah";
  if (score < config.risk.high) return "Sedang";
  return "Tinggi";
};

export const riskTone: Record<RiskLevel, RiskTone> = {
  Rendah: "neutral",
  Sedang: "warn",
  Tinggi: "danger",
};
