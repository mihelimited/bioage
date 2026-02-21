import type { HealthMetric } from "@shared/schema";

export type Domain = "fitness" | "autonomic" | "circadian" | "sleep" | "mobility";

export interface CircadianFeatures {
  mesor: number;
  amplitude: number;
  acrophaseHour: number;
  ra: number;
  is: number;
  iv: number;
  stepsCoverage: number;
}

export interface WearableFeatures {
  restingHR_bpm?: number;
  hrvSDNN_ms?: number;
  hrvCV?: number;
  vo2max_mlKgMin?: number;
  vo2maxSlope_mlKgMinPerWeek?: number;
  vo2SampleCount?: number;
  sleepAvgHours?: number;
  sleepEfficiency_pct?: number;
  sleepMidpointCircularStd_hours?: number;
  sleepNightsCount?: number;
  walkingSpeed_mps?: number;
  circadian?: CircadianFeatures;
}

export interface BioAgeConfig {
  weights: Record<Domain, number>;
  shrinkageLambda: number;
  rhrRef_bpm: number;
  rhrScale_bpm: number;
  rhrYearsPerZ: number;
  hrvRef_ms: number;
  hrvLogScale: number;
  hrvYearsPerZ: number;
  hrvCVRef: number;
  hrvCVScale: number;
  hrvCVYearsPerZ: number;
  vo2Ref_mlKgMin: number;
  vo2Scale_mlKgMin: number;
  vo2YearsPerZ: number;
  walkSpeedRef_mps: number;
  walkSpeedScale_mps: number;
  walkSpeedYearsPerZ: number;
  sleepRefHours: number;
  sleepRefEfficiencyPct: number;
  sleepRefMidpointStdHours: number;
  sleepYearsPerHour: number;
  sleepYearsPerEffPct: number;
  sleepYearsPerMidpointStdHour: number;
  circadianTargetScore: number;
  circadianYearsPerScorePoint: number;
  perDomainClampYears: [number, number];
}

export interface DomainResult {
  domain: Domain;
  gap: number;
  weight: number;
  quality: number;
  metrics: { key: string; value: number; unit: string; impact: number; fresh: boolean; isOverride: boolean }[];
}

export interface BioAgeResult {
  bioAge: number;
  chronologicalAge: number;
  paceOfAging: number;
  ageGap: number;
  domains: DomainResult[];
  totalImpact: number;
}

export const defaultBioAgeConfig: BioAgeConfig = {
  weights: {
    fitness: 0.30,
    circadian: 0.25,
    autonomic: 0.20,
    sleep: 0.15,
    mobility: 0.10,
  },
  shrinkageLambda: 0.70,
  rhrRef_bpm: 60,
  rhrScale_bpm: 8,
  rhrYearsPerZ: 2.5,
  hrvRef_ms: 55,
  hrvLogScale: 0.35,
  hrvYearsPerZ: 2.5,
  hrvCVRef: 0.45,
  hrvCVScale: 0.20,
  hrvCVYearsPerZ: 1.5,
  vo2Ref_mlKgMin: 40,
  vo2Scale_mlKgMin: 7.5,
  vo2YearsPerZ: 4.0,
  walkSpeedRef_mps: 1.30,
  walkSpeedScale_mps: 0.20,
  walkSpeedYearsPerZ: 2.5,
  sleepRefHours: 7.0,
  sleepRefEfficiencyPct: 85.0,
  sleepRefMidpointStdHours: 1.0,
  sleepYearsPerHour: 0.09,
  sleepYearsPerEffPct: 0.05,
  sleepYearsPerMidpointStdHour: 0.30,
  circadianTargetScore: 0.55,
  circadianYearsPerScorePoint: 12.0,
  perDomainClampYears: [-12, 12],
};

const DOMAINS: Domain[] = ["fitness", "circadian", "autonomic", "sleep", "mobility"];

const METRIC_TO_FEATURE: Record<string, { featureKey: keyof WearableFeatures; unit: string; domain: Domain }> = {
  resting_hr: { featureKey: "restingHR_bpm", unit: "bpm", domain: "autonomic" },
  hrv_sdnn: { featureKey: "hrvSDNN_ms", unit: "ms", domain: "autonomic" },
  hrv: { featureKey: "hrvSDNN_ms", unit: "ms", domain: "autonomic" },
  hrv_cv: { featureKey: "hrvCV", unit: "ratio", domain: "autonomic" },
  vo2_max: { featureKey: "vo2max_mlKgMin", unit: "ml/kg/min", domain: "fitness" },
  sleep_duration: { featureKey: "sleepAvgHours", unit: "hrs", domain: "sleep" },
  sleep_efficiency: { featureKey: "sleepEfficiency_pct", unit: "%", domain: "sleep" },
  sleep_midpoint_std: { featureKey: "sleepMidpointCircularStd_hours", unit: "hrs", domain: "sleep" },
  walking_speed: { featureKey: "walkingSpeed_mps", unit: "m/s", domain: "mobility" },
};

const STALE_HOURS = 48;

export function metricsToFeatures(metrics: HealthMetric[]): WearableFeatures {
  const features: WearableFeatures = {};
  for (const m of metrics) {
    const mapping = METRIC_TO_FEATURE[m.metricKey];
    if (mapping) {
      (features as any)[mapping.featureKey] = m.value;
    }
  }
  return features;
}

export function calculateBioAge(
  chronologicalAge: number,
  metrics: HealthMetric[],
  config: BioAgeConfig = defaultBioAgeConfig
): BioAgeResult {
  const features = metricsToFeatures(metrics);
  const now = Date.now();

  const gaps: Partial<Record<Domain, number>> = {
    fitness: gapFitness(features, config),
    autonomic: gapAutonomic(features, config),
    circadian: gapCircadian(features, config),
    sleep: gapSleep(features, config),
    mobility: gapMobility(features, config),
  };

  for (const d of DOMAINS) {
    if (!Number.isFinite(gaps[d] as number)) delete gaps[d];
  }

  const quality: Record<Domain, number> = {
    fitness: qualityFitness(features),
    autonomic: qualityAutonomic(features),
    circadian: qualityCircadian(features),
    sleep: qualitySleep(features),
    mobility: qualityMobility(features),
  };

  const gatedWeights: Partial<Record<Domain, number>> = {};
  for (const d of DOMAINS) {
    if (gaps[d] === undefined) continue;
    gatedWeights[d] = (config.weights[d] ?? 0) * clamp(quality[d], 0, 1);
  }

  const wSum = Object.values(gatedWeights).reduce((a, b) => a + (b ?? 0), 0);
  const weightsUsed: Partial<Record<Domain, number>> = {};
  if (wSum > 0) {
    for (const d of DOMAINS) {
      const w = gatedWeights[d];
      if (w !== undefined) weightsUsed[d] = w / wSum;
    }
  }

  let blendedGap = 0;
  for (const d of DOMAINS) {
    const w = weightsUsed[d];
    const g = gaps[d];
    if (w !== undefined && g !== undefined) blendedGap += w * g;
  }
  blendedGap *= config.shrinkageLambda;

  const bioAge = Math.round((chronologicalAge + blendedGap) * 10) / 10;
  const paceOfAging = metrics.length > 0 ? Math.round((bioAge / chronologicalAge) * 100) / 100 : 1.0;

  const domains: DomainResult[] = DOMAINS
    .filter(d => gaps[d] !== undefined)
    .map(d => {
      const domainMetrics = metrics.filter(m => {
        const mapping = METRIC_TO_FEATURE[m.metricKey];
        return mapping && mapping.domain === d;
      });

      return {
        domain: d,
        gap: Math.round((gaps[d]! * (weightsUsed[d] ?? 0) * config.shrinkageLambda) * 10) / 10,
        weight: Math.round((weightsUsed[d] ?? 0) * 100) / 100,
        quality: Math.round(quality[d] * 100) / 100,
        metrics: domainMetrics.map(m => {
          const hoursSince = (now - new Date(m.recordedAt).getTime()) / (1000 * 60 * 60);
          return {
            key: m.metricKey,
            value: m.value,
            unit: METRIC_TO_FEATURE[m.metricKey]?.unit ?? m.unit,
            impact: 0,
            fresh: hoursSince < STALE_HOURS,
            isOverride: m.isOverride ?? false,
          };
        }),
      };
    });

  return {
    bioAge,
    chronologicalAge,
    paceOfAging,
    ageGap: Math.round(blendedGap * 10) / 10,
    domains,
    totalImpact: Math.round(blendedGap * 10) / 10,
  };
}

function gapFitness(f: WearableFeatures, c: BioAgeConfig): number | undefined {
  if (f.vo2max_mlKgMin == null) return undefined;
  const z = zScore(f.vo2max_mlKgMin, c.vo2Ref_mlKgMin, c.vo2Scale_mlKgMin);
  return clamp(-c.vo2YearsPerZ * z, c.perDomainClampYears[0], c.perDomainClampYears[1]);
}

function gapAutonomic(f: WearableFeatures, c: BioAgeConfig): number | undefined {
  const parts: number[] = [];
  if (f.restingHR_bpm != null) {
    parts.push(+c.rhrYearsPerZ * zScore(f.restingHR_bpm, c.rhrRef_bpm, c.rhrScale_bpm));
  }
  if (f.hrvSDNN_ms != null && f.hrvSDNN_ms > 0) {
    const z = zScore(Math.log(f.hrvSDNN_ms), Math.log(c.hrvRef_ms), c.hrvLogScale);
    parts.push(-c.hrvYearsPerZ * z);
  }
  if (f.hrvCV != null) {
    parts.push(+c.hrvCVYearsPerZ * zScore(f.hrvCV, c.hrvCVRef, c.hrvCVScale));
  }
  if (parts.length === 0) return undefined;
  return clamp(parts.reduce((a, b) => a + b, 0), c.perDomainClampYears[0], c.perDomainClampYears[1]);
}

function gapSleep(f: WearableFeatures, c: BioAgeConfig): number | undefined {
  if (f.sleepAvgHours == null) return undefined;
  let delta = -c.sleepYearsPerHour * (f.sleepAvgHours - c.sleepRefHours);
  if (f.sleepEfficiency_pct != null) {
    delta += -c.sleepYearsPerEffPct * (f.sleepEfficiency_pct - c.sleepRefEfficiencyPct);
  }
  if (f.sleepMidpointCircularStd_hours != null) {
    delta += +c.sleepYearsPerMidpointStdHour * (f.sleepMidpointCircularStd_hours - c.sleepRefMidpointStdHours);
  }
  return clamp(delta, c.perDomainClampYears[0], c.perDomainClampYears[1]);
}

function gapMobility(f: WearableFeatures, c: BioAgeConfig): number | undefined {
  if (f.walkingSpeed_mps == null) return undefined;
  const z = zScore(f.walkingSpeed_mps, c.walkSpeedRef_mps, c.walkSpeedScale_mps);
  return clamp(-c.walkSpeedYearsPerZ * z, c.perDomainClampYears[0], c.perDomainClampYears[1]);
}

function gapCircadian(f: WearableFeatures, c: BioAgeConfig): number | undefined {
  const circ = f.circadian;
  if (!circ) return undefined;
  const ivScore = 1 / (1 + Math.max(0, circ.iv));
  const score = 0.45 * clamp(circ.ra, 0, 1) + 0.35 * clamp(circ.is, 0, 1) + 0.20 * clamp(ivScore, 0, 1);
  return clamp((c.circadianTargetScore - score) * c.circadianYearsPerScorePoint, c.perDomainClampYears[0], c.perDomainClampYears[1]);
}

function qualityFitness(f: WearableFeatures): number {
  if (f.vo2max_mlKgMin == null) return 0;
  return clamp((f.vo2SampleCount ?? 1) / 3, 0, 1);
}

function qualityAutonomic(f: WearableFeatures): number {
  const hasRHR = f.restingHR_bpm != null ? 1 : 0;
  const hasHRV = f.hrvSDNN_ms != null ? 1 : 0;
  const hasCV = f.hrvCV != null ? 0.5 : 0;
  return clamp((hasRHR + hasHRV + hasCV) / 2.5, 0, 1);
}

function qualitySleep(f: WearableFeatures): number {
  if (f.sleepAvgHours == null) return 0;
  return clamp((f.sleepNightsCount ?? 14) / 14, 0, 1);
}

function qualityMobility(f: WearableFeatures): number {
  return f.walkingSpeed_mps != null ? 1 : 0;
}

function qualityCircadian(f: WearableFeatures): number {
  return clamp(f.circadian?.stepsCoverage ?? 0, 0, 1);
}

function zScore(x: number, ref: number, scale: number): number {
  return scale > 0 ? (x - ref) / scale : 0;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  fitness: "Fitness",
  autonomic: "Autonomic",
  circadian: "Circadian",
  sleep: "Sleep",
  mobility: "Mobility",
};

export const ALL_DOMAINS = DOMAINS;
