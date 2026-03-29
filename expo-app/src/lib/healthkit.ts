import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SYNC_KEY = "aura_healthkit_last_sync";
const HK_PERMISSIONS_REQUESTED_KEY = "aura_healthkit_permissions_requested";

export interface HealthKitMetric {
  category: string;
  metricKey: string;
  value: number;
  unit: string;
}

export function isHealthKitAvailable(): boolean {
  return Platform.OS === "ios";
}

export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

async function setLastSyncTime(): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

function getHealthKit(): any | null {
  if (Platform.OS !== "ios") return null;
  try {
    const mod = require("react-native-health");
    if (!mod) {
      console.warn("[HealthKit] Module loaded but value is falsy");
      return null;
    }
    return mod;
  } catch (e) {
    console.warn("[HealthKit] Failed to load react-native-health:", e);
    return null;
  }
}

export async function initializeHealthKit(): Promise<boolean> {
  const AppleHealthKit = getHealthKit();
  if (!AppleHealthKit) return false;

  return new Promise((resolve) => {
    const P = AppleHealthKit.Constants.Permissions;
    const readPerms: string[] = [
      P.RestingHeartRate,
      P.HeartRateVariability,
      P.Vo2Max,
      P.SleepAnalysis,
      P.StepCount,
      P.ActiveEnergyBurned,
      P.DistanceWalkingRunning,
    ];

    AppleHealthKit.initHealthKit(
      { permissions: { read: readPerms, write: [] } } as any,
      (error: any) => {
        if (error) {
          console.warn("[HealthKit] Init failed:", error);
          resolve(false);
          return;
        }
        console.log("[HealthKit] Initialized successfully");
        resolve(true);
      }
    );
  });
}

// Request HealthKit permissions and track that we've asked
export async function requestHealthKitPermissions(): Promise<boolean> {
  const initialized = await initializeHealthKit();
  if (initialized) {
    await AsyncStorage.setItem(HK_PERMISSIONS_REQUESTED_KEY, "true");
  }
  return initialized;
}

// Check if we've ever shown the permission dialog
export async function hasRequestedPermissions(): Promise<boolean> {
  const val = await AsyncStorage.getItem(HK_PERMISSIONS_REQUESTED_KEY);
  return val === "true";
}

// Open iOS Settings so user can manage Health permissions
export function openHealthSettings(): void {
  if (Platform.OS === "ios") {
    Linking.openURL("app-settings:");
  }
}

function callHK(hk: any, method: string, options: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof hk[method] !== "function") {
      reject(new Error(`Method ${method} not available`));
      return;
    }
    hk[method](options, (err: any, results: any) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

// ─── Numeric helpers (matching reference implementation) ───

function median(xs: number[]): number | undefined {
  const ys = xs.filter((x) => isFinite(x)).slice().sort((a, b) => a - b);
  if (!ys.length) return undefined;
  const mid = Math.floor(ys.length / 2);
  return ys.length % 2 ? ys[mid] : (ys[mid - 1] + ys[mid]) / 2;
}

function mean(xs: number[]): number | undefined {
  if (!xs.length) return undefined;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation (Bessel's correction, N-1 denominator) */
function stdDev(xs: number[]): number | undefined {
  if (xs.length < 2) return undefined;
  const m = mean(xs);
  if (m === undefined) return undefined;
  const v = xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/** Linear regression slope in units per week */
function slopePerWeek(points: Array<{ date: Date; value: number }>): number | undefined {
  if (points.length < 4) return undefined;
  const t0 = points[0].date.getTime();
  const xs = points.map((p) => (p.date.getTime() - t0) / (86400 * 1000 * 7));
  const ys = points.map((p) => p.value);
  const xMean = mean(xs);
  const yMean = mean(ys);
  if (xMean === undefined || yMean === undefined) return undefined;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - xMean;
    num += dx * (ys[i] - yMean);
    den += dx * dx;
  }
  if (!(den > 0)) return undefined;
  return num / den;
}

function localYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function syncHealthData(): Promise<HealthKitMetric[]> {
  console.log("[HealthKit] syncHealthData called, platform:", Platform.OS);
  const AppleHealthKit = getHealthKit();
  if (!AppleHealthKit) {
    console.warn("[HealthKit] Module not available, returning empty");
    return [];
  }

  const initialized = await initializeHealthKit();
  if (!initialized) {
    console.warn("[HealthKit] Init failed, returning empty");
    return [];
  }

  const metrics: HealthKitMetric[] = [];

  // Use 6-month window for all metrics on initial/full sync
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
  const startDate = sixMonthsAgo.toISOString();

  // 30-day window for primary metric values (most recent data)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // ─── Resting Heart Rate (use median, matching reference) ───
  try {
    const samples = await callHK(AppleHealthKit, "getRestingHeartRateSamples", {
      startDate,
      limit: 180,
    });
    if (samples && samples.length > 0) {
      const values = samples.map((r: any) => r.value).filter((v: number) => isFinite(v));
      const med = median(values);
      if (med !== undefined) {
        metrics.push({
          category: "autonomic",
          metricKey: "resting_hr",
          value: Math.round(med * 10) / 10,
          unit: "bpm",
        });
      }
    }
  } catch (e) {
    console.log("Failed to read resting HR:", e);
  }

  // ─── HRV SDNN (use median, compute CV with Bessel's correction) ───
  try {
    const samples = await callHK(AppleHealthKit, "getHeartRateVariabilitySamples", {
      startDate,
      limit: 180,
    });
    if (samples && samples.length > 0) {
      // react-native-health returns HRV SDNN in seconds; convert to milliseconds
      const values: number[] = samples
        .map((r: any) => r.value)
        .filter((v: number) => isFinite(v))
        .map((v: number) => v < 1 ? v * 1000 : v); // if < 1, it's in seconds → convert to ms
      const med = median(values);
      if (med !== undefined) {
        metrics.push({
          category: "autonomic",
          metricKey: "hrv",
          value: Math.round(med * 10) / 10,
          unit: "ms",
        });
      }

      // Compute HRV coefficient of variation (SD / mean) with Bessel's correction
      const m = mean(values);
      const sd = stdDev(values);
      if (values.length >= 5 && m !== undefined && sd !== undefined && m > 0) {
        const cv = sd / m;
        metrics.push({
          category: "autonomic",
          metricKey: "hrv_cv",
          value: Math.round(cv * 1000) / 1000,
          unit: "ratio",
        });
      }
    }
  } catch (e) {
    console.log("Failed to read HRV:", e);
  }

  // ─── VO2 Max (use median of all in-window, track sample count + trend slope) ───
  try {
    // Fetch 6-month window for trend, filter to 30-day for primary value
    const allSamples = await callHK(AppleHealthKit, "getVo2MaxSamples", {
      startDate,
      limit: 180,
    });
    if (allSamples && allSamples.length > 0) {
      const allPoints = allSamples
        .map((s: any) => ({ date: new Date(s.startDate || s.endDate), value: s.value }))
        .filter((p: any) => isFinite(p.date.getTime()) && isFinite(p.value));

      const inWindowValues = allPoints
        .filter((p: any) => p.date >= thirtyDaysAgo)
        .map((p: any) => p.value);

      // Use in-window median if available, otherwise fall back to all samples
      const vo2Values = inWindowValues.length > 0 ? inWindowValues : allPoints.map((p: any) => p.value);
      const med = median(vo2Values);
      if (med !== undefined) {
        metrics.push({
          category: "fitness",
          metricKey: "vo2_max",
          value: Math.round(med * 10) / 10,
          unit: "ml/kg/min",
        });
      }

      // Track sample count for quality gating
      metrics.push({
        category: "fitness",
        metricKey: "vo2_sample_count",
        value: inWindowValues.length,
        unit: "count",
      });

      // Compute VO2 trend (slope per week) from all available points
      const slope = slopePerWeek(allPoints);
      if (slope !== undefined) {
        metrics.push({
          category: "fitness",
          metricKey: "vo2_slope",
          value: Math.round(slope * 1000) / 1000,
          unit: "ml/kg/min/wk",
        });
      }
    }
  } catch (e) {
    console.log("Failed to read VO2 max:", e);
  }

  // ─── Sleep (use end-date keying, compute midpoint from full night span) ───
  try {
    const samples = await callHK(AppleHealthKit, "getSleepSamples", {
      startDate,
      limit: 5000,
    });
    if (samples && samples.length > 0) {
      interface NightData {
        legacyAsleepSeconds: number; // ASLEEP (legacy, pre-iOS 16)
        detailedAsleepSeconds: number; // CORE + DEEP + REM (modern, iOS 16+)
        inBedSeconds: number;
        start: Date;
        end: Date;
        hasDetailedStages: boolean;
      }
      const nightMap = new Map<string, NightData>();

      for (const s of samples) {
        const sStart = new Date(s.startDate);
        const sEnd = new Date(s.endDate);
        if (!isFinite(sStart.getTime()) || !isFinite(sEnd.getTime()) || sEnd <= sStart) continue;
        const durationSec = (sEnd.getTime() - sStart.getTime()) / 1000;

        // Use end-date's local calendar day as the "night" key (matches reference)
        const key = localYYYYMMDD(sEnd);
        const night = nightMap.get(key) ?? {
          legacyAsleepSeconds: 0,
          detailedAsleepSeconds: 0,
          inBedSeconds: 0,
          start: sStart,
          end: sEnd,
          hasDetailedStages: false,
        };
        night.start = sStart < night.start ? sStart : night.start;
        night.end = sEnd > night.end ? sEnd : night.end;

        if (s.value === "INBED") {
          night.inBedSeconds += durationSec;
        } else if (s.value === "CORE" || s.value === "DEEP" || s.value === "REM") {
          night.detailedAsleepSeconds += durationSec;
          night.hasDetailedStages = true;
        } else if (s.value === "ASLEEP") {
          night.legacyAsleepSeconds += durationSec;
        }
        nightMap.set(key, night);
      }

      const nightList = [...nightMap.values()];
      // Use detailed stages (CORE+DEEP+REM) if available, otherwise fall back to legacy ASLEEP
      const asleepHours = nightList
        .map((n) => {
          const secs = n.hasDetailedStages ? n.detailedAsleepSeconds : n.legacyAsleepSeconds;
          return secs / 3600;
        })
        .filter((h) => h > 2 && h < 14); // drop artifacts (< 2h naps, > 14h errors)

      if (asleepHours.length > 0) {
        const avgSleep = mean(asleepHours);
        if (avgSleep !== undefined) {
          metrics.push({
            category: "sleep",
            metricKey: "sleep_duration",
            value: Math.round(avgSleep * 10) / 10,
            unit: "hrs",
          });
        }

        // Sleep efficiency
        const efficiencies = nightList
          .filter((n) => n.inBedSeconds > 0)
          .map((n) => {
            const asleep = n.hasDetailedStages ? n.detailedAsleepSeconds : n.legacyAsleepSeconds;
            return (asleep / n.inBedSeconds) * 100;
          })
          .filter((x) => isFinite(x) && x > 0 && x <= 100);
        const avgEff = mean(efficiencies);
        if (avgEff !== undefined) {
          metrics.push({
            category: "sleep",
            metricKey: "sleep_efficiency",
            value: Math.round(avgEff * 10) / 10,
            unit: "%",
          });
        }

        // Nights count for quality gating
        metrics.push({
          category: "sleep",
          metricKey: "sleep_nights_count",
          value: asleepHours.length,
          unit: "nights",
        });

        // Sleep midpoint circular standard deviation (consistency)
        // Use full night span midpoint (matches reference)
        const midpointsHours = nightList
          .map((n) => {
            const mid = new Date(n.start.getTime() + (n.end.getTime() - n.start.getTime()) / 2);
            return mid.getHours() + mid.getMinutes() / 60 + mid.getSeconds() / 3600;
          });

        if (midpointsHours.length >= 3) {
          const twoPi = 2 * Math.PI;
          let sinSum = 0;
          let cosSum = 0;
          for (const h of midpointsHours) {
            const theta = twoPi * (h / 24);
            sinSum += Math.sin(theta);
            cosSum += Math.cos(theta);
          }
          const n = midpointsHours.length;
          const R = Math.sqrt((sinSum / n) ** 2 + (cosSum / n) ** 2);
          if (R > 0) {
            const stdRad = Math.sqrt(-2 * Math.log(R));
            const circStdHours = (24 / twoPi) * stdRad;
            metrics.push({
              category: "sleep",
              metricKey: "sleep_midpoint_std",
              value: Math.round(circStdHours * 100) / 100,
              unit: "hrs",
            });
          }
        }
      }
    }
  } catch (e) {
    console.log("Failed to read sleep:", e);
  }

  // ─── Step count + Walking distance → derive walking speed ───
  let dailySteps: number[] = [];
  let dailyDistances: number[] = [];

  try {
    const samples = await callHK(AppleHealthKit, "getDailyStepCountSamples", {
      startDate,
      limit: 180,
    });
    if (samples && samples.length > 0) {
      dailySteps = samples.map((r: any) => r.value).filter((v: number) => isFinite(v) && v > 0);
      const avg = mean(dailySteps);
      if (avg !== undefined) {
        metrics.push({
          category: "fitness",
          metricKey: "step_count",
          value: Math.round(avg),
          unit: "steps/day",
        });
      }
    }
  } catch (e) {
    console.log("Failed to read step count:", e);
  }

  try {
    const distSamples = await callHK(AppleHealthKit, "getDailyDistanceWalkingRunningSamples", {
      startDate,
      limit: 180,
    });
    if (distSamples && distSamples.length > 0) {
      dailyDistances = distSamples.map((r: any) => r.value).filter((v: number) => isFinite(v) && v > 0);
    }
  } catch (e) {
    console.log("Failed to read walking distance:", e);
  }

  // Estimate walking speed from steps + distance
  // Walking time = steps / cadence (assume ~110 steps/min = 1.833 steps/sec)
  // Walking speed = distance / walking_time
  if (dailySteps.length > 0 && dailyDistances.length > 0) {
    const count = Math.min(dailySteps.length, dailyDistances.length);
    const speeds: number[] = [];
    for (let i = 0; i < count; i++) {
      const steps = dailySteps[i];
      const dist = dailyDistances[i];
      if (steps > 500 && dist > 100) {
        const walkingTimeSec = steps / (110 / 60); // 110 steps/min cadence
        const speed = dist / walkingTimeSec;
        if (speed > 0.3 && speed < 3.0) speeds.push(speed); // sanity check
      }
    }
    const medSpeed = median(speeds);
    if (medSpeed !== undefined) {
      metrics.push({
        category: "mobility",
        metricKey: "walking_speed",
        value: Math.round(medSpeed * 100) / 100,
        unit: "m/s",
      });
    }
  }

  // ─── Circadian rhythm proxy from sleep timing ───
  // react-native-health doesn't support hourly step queries, so we derive
  // circadian regularity from sleep midpoint consistency (already computed above)
  // and activity patterns from daily step variance.
  // The server-side bioage calculation will use sleep-based circadian proxies
  // when hourly step data is unavailable.

  // ─── Active energy burned ───
  try {
    const samples = await callHK(AppleHealthKit, "getActiveEnergyBurned", {
      startDate,
      limit: 180,
    });
    if (samples && samples.length > 0) {
      const avg = samples.reduce((s: number, r: any) => s + r.value, 0) / samples.length;
      metrics.push({
        category: "fitness",
        metricKey: "active_energy",
        value: Math.round(avg),
        unit: "kcal/day",
      });
    }
  } catch (e) {
    console.log("Failed to read active energy:", e);
  }

  if (metrics.length > 0) {
    await setLastSyncTime();
  }

  console.log("[HealthKit] Sync complete, returning", metrics.length, "metrics");
  return metrics;
}
