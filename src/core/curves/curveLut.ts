import { clamp01 } from "../math/clamp";
import { createCurveEvaluator } from "./curveEvaluator";
import type { CurvePoint } from "./types";

export interface CurveLutDefinition {
  points: CurvePoint[];
  interpolation?: string;
}

export const CURVE_LUT_SIZE = 256;

export function createIdentityCurveLut(): Uint8Array {
  const data = new Uint8Array(CURVE_LUT_SIZE * 4);

  for (let i = 0; i < CURVE_LUT_SIZE; i += 1) {
    const offset = i * 4;
    data[offset] = i;
    data[offset + 1] = i;
    data[offset + 2] = i;
    data[offset + 3] = 255;
  }

  return data;
}

export function bakeCurveLut(curve: CurveLutDefinition): Uint8Array {
  const data = new Uint8Array(CURVE_LUT_SIZE * 4);
  const evaluate = createCurveEvaluator(curve.points, curve.interpolation);

  for (let i = 0; i < CURVE_LUT_SIZE; i += 1) {
    const x = i / (CURVE_LUT_SIZE - 1);
    const value = Math.round(clamp01(evaluate(x)) * 255);
    const offset = i * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }

  return data;
}

export function generateAllCurveLuts(
  curves: Record<string, CurveLutDefinition | undefined>,
): Record<string, Uint8Array> {
  const result: Record<string, Uint8Array> = {};

  for (const [key, curve] of Object.entries(curves)) {
    result[key] = curve && curve.points.length >= 2
      ? bakeCurveLut(curve)
      : createIdentityCurveLut();
  }

  return result;
}
