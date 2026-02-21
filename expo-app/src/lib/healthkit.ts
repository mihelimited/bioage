import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LAST_SYNC_KEY = "aura_healthkit_last_sync";

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
    const mod = require("react-native-health").default;
    if (!mod) {
      console.warn("[HealthKit] Module loaded but .default is falsy");
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
    ];
    if (P.WalkingSpeed) readPerms.push(P.WalkingSpeed);

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
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString();

  try {
    const samples = await callHK(AppleHealthKit, "getRestingHeartRateSamples", {
      startDate,
      limit: 30,
    });
    if (samples && samples.length > 0) {
      const avg = samples.reduce((s: number, r: any) => s + r.value, 0) / samples.length;
      metrics.push({
        category: "autonomic",
        metricKey: "resting_hr",
        value: Math.round(avg * 10) / 10,
        unit: "bpm",
      });
    }
  } catch (e) {
    console.log("Failed to read resting HR:", e);
  }

  try {
    const samples = await callHK(AppleHealthKit, "getHeartRateVariabilitySamples", {
      startDate,
      limit: 30,
    });
    if (samples && samples.length > 0) {
      const avgHRV = samples.reduce((s: number, r: any) => s + r.value, 0) / samples.length;
      metrics.push({
        category: "autonomic",
        metricKey: "hrv",
        value: Math.round(avgHRV * 10) / 10,
        unit: "ms",
      });
    }
  } catch (e) {
    console.log("Failed to read HRV:", e);
  }

  try {
    const samples = await callHK(AppleHealthKit, "getVo2MaxSamples", {
      startDate,
      limit: 10,
    });
    if (samples && samples.length > 0) {
      metrics.push({
        category: "fitness",
        metricKey: "vo2_max",
        value: Math.round(samples[0].value * 10) / 10,
        unit: "ml/kg/min",
      });
    }
  } catch (e) {
    console.log("Failed to read VO2 max:", e);
  }

  try {
    const samples = await callHK(AppleHealthKit, "getSleepSamples", {
      startDate,
      limit: 60,
    });
    if (samples && samples.length > 0) {
      const nightMap: Record<string, { inBed: number; asleep: number }> = {};
      for (const s of samples) {
        const startMs = new Date(s.startDate).getTime();
        const endMs = new Date(s.endDate).getTime();
        const hours = (endMs - startMs) / (1000 * 60 * 60);
        const nightKey = new Date(s.startDate).toISOString().slice(0, 10);
        if (!nightMap[nightKey]) nightMap[nightKey] = { inBed: 0, asleep: 0 };
        if (s.value === "INBED") {
          nightMap[nightKey].inBed += hours;
        } else if (s.value === "ASLEEP" || s.value === "CORE" || s.value === "DEEP" || s.value === "REM") {
          nightMap[nightKey].asleep += hours;
        }
      }

      const nights = Object.values(nightMap).filter(n => n.inBed > 0 || n.asleep > 0);
      if (nights.length > 0) {
        const totalAsleep = nights.reduce((s, n) => s + (n.asleep || n.inBed), 0);
        const avgSleep = totalAsleep / nights.length;
        metrics.push({
          category: "sleep",
          metricKey: "sleep_duration",
          value: Math.round(avgSleep * 10) / 10,
          unit: "hrs",
        });

        const nightsWithBoth = nights.filter(n => n.inBed > 0 && n.asleep > 0);
        if (nightsWithBoth.length > 0) {
          const totalEff = nightsWithBoth.reduce((s, n) => s + (n.asleep / n.inBed) * 100, 0);
          const avgEff = totalEff / nightsWithBoth.length;
          metrics.push({
            category: "sleep",
            metricKey: "sleep_efficiency",
            value: Math.round(avgEff * 10) / 10,
            unit: "%",
          });
        }
      }
    }
  } catch (e) {
    console.log("Failed to read sleep:", e);
  }

  try {
    if (typeof AppleHealthKit.getWalkingSpeedSamples === "function") {
      const samples = await callHK(AppleHealthKit, "getWalkingSpeedSamples", {
        startDate,
        limit: 30,
      });
      if (samples && samples.length > 0) {
        const avg = samples.reduce((s: number, r: any) => s + r.value, 0) / samples.length;
        metrics.push({
          category: "mobility",
          metricKey: "walking_speed",
          value: Math.round(avg * 100) / 100,
          unit: "m/s",
        });
      }
    }
  } catch (e) {
    console.log("Failed to read walking speed:", e);
  }

  if (metrics.length > 0) {
    await setLastSyncTime();
  }

  console.log("[HealthKit] Sync complete, returning", metrics.length, "metrics");
  return metrics;
}
