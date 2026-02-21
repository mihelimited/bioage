import type { HealthMetric } from "@shared/schema";

export interface CategoryScore {
  category: string;
  impact: number;
  metrics: { key: string; value: number; unit: string; impact: number; fresh: boolean; isOverride: boolean }[];
}

export interface BioAgeResult {
  bioAge: number;
  chronologicalAge: number;
  paceOfAging: number;
  categories: CategoryScore[];
  totalImpact: number;
}

const METRIC_CONFIG: Record<string, { category: string; label: string; unit: string; optimalRange: [number, number]; maxImpact: number; lowerIsBetter?: boolean }> = {
  resting_hr: { category: "cardiovascular", label: "Resting HR", unit: "bpm", optimalRange: [45, 65], maxImpact: 1.5, lowerIsBetter: true },
  vo2_max: { category: "cardiovascular", label: "VO2 Max", unit: "ml/kg/min", optimalRange: [35, 55], maxImpact: 2.0 },
  hrv: { category: "recovery", label: "HRV", unit: "ms", optimalRange: [40, 100], maxImpact: 1.5 },
  deep_sleep: { category: "sleep", label: "Deep Sleep", unit: "hrs", optimalRange: [1.5, 3.0], maxImpact: 1.2 },
  sleep_duration: { category: "sleep", label: "Sleep Duration", unit: "hrs", optimalRange: [7.0, 9.0], maxImpact: 0.8 },
  active_calories: { category: "activity", label: "Active Calories", unit: "cal", optimalRange: [400, 800], maxImpact: 1.0 },
  exercise_minutes: { category: "activity", label: "Exercise", unit: "min", optimalRange: [30, 90], maxImpact: 1.0 },
  bmi: { category: "body_composition", label: "BMI", unit: "kg/m²", optimalRange: [18.5, 25.0], maxImpact: 1.5, lowerIsBetter: true },
  body_fat: { category: "body_composition", label: "Body Fat", unit: "%", optimalRange: [10, 25], maxImpact: 1.0, lowerIsBetter: true },
};

const STALE_HOURS = 48;

function computeMetricImpact(metricKey: string, value: number): number {
  const config = METRIC_CONFIG[metricKey];
  if (!config) return 0;

  const [low, high] = config.optimalRange;
  const mid = (low + high) / 2;

  if (value >= low && value <= high) {
    const distFromMid = Math.abs(value - mid) / (high - low) * 2;
    return -config.maxImpact * (1 - distFromMid * 0.3);
  }

  if (config.lowerIsBetter) {
    if (value < low) return -config.maxImpact;
    const overshoot = (value - high) / high;
    return config.maxImpact * Math.min(overshoot * 2, 1);
  } else {
    if (value > high) return -config.maxImpact * 0.5;
    const undershoot = (low - value) / low;
    return config.maxImpact * Math.min(undershoot * 2, 1);
  }
}

export function calculateBioAge(chronologicalAge: number, metrics: HealthMetric[]): BioAgeResult {
  const categoryMap: Record<string, CategoryScore> = {};

  for (const metric of metrics) {
    const config = METRIC_CONFIG[metric.metricKey];
    if (!config) continue;

    const impact = computeMetricImpact(metric.metricKey, metric.value);
    const hoursSinceRecord = (Date.now() - new Date(metric.recordedAt).getTime()) / (1000 * 60 * 60);
    const fresh = hoursSinceRecord < STALE_HOURS;

    if (!categoryMap[config.category]) {
      categoryMap[config.category] = { category: config.category, impact: 0, metrics: [] };
    }

    categoryMap[config.category].metrics.push({
      key: metric.metricKey,
      value: metric.value,
      unit: config.unit,
      impact: Math.round(impact * 10) / 10,
      fresh,
      isOverride: metric.isOverride ?? false,
    });
    categoryMap[config.category].impact += impact;
  }

  for (const cat of Object.values(categoryMap)) {
    cat.impact = Math.round(cat.impact * 10) / 10;
  }

  const totalImpact = Object.values(categoryMap).reduce((sum, c) => sum + c.impact, 0);
  const bioAge = Math.round((chronologicalAge + totalImpact) * 10) / 10;
  const paceOfAging = metrics.length > 0 ? Math.round((1 + totalImpact / chronologicalAge) * 100) / 100 : 1.0;

  return {
    bioAge,
    chronologicalAge,
    paceOfAging,
    categories: Object.values(categoryMap),
    totalImpact: Math.round(totalImpact * 10) / 10,
  };
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    cardiovascular: "Cardiovascular",
    sleep: "Sleep",
    recovery: "Recovery",
    activity: "Activity",
    body_composition: "Body Composition",
  };
  return labels[category] || category;
}

export function getMetricLabel(metricKey: string): string {
  return METRIC_CONFIG[metricKey]?.label || metricKey;
}

export const ALL_METRIC_KEYS = Object.keys(METRIC_CONFIG);
export const CATEGORIES = [...new Set(Object.values(METRIC_CONFIG).map(c => c.category))];
