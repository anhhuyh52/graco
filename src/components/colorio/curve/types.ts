/**
 * Curve component types.
 * Separate from core/curves/types.ts — these are UI-layer interfaces.
 */

import type { CurvePoint, Curve, CurveSemantics } from "../../../core/curves/types";

export type { CurvePoint, Curve, CurveSemantics };

/** Props passed to CurveEditor and its sub-components. */
export interface CurveEditorProps {
  curve: Curve;
  semantics?: CurveSemantics;
  hueMode?: boolean;
  lineColor?: string;
  identityReset?: boolean;

  onPointChange: (index: number, point: CurvePoint, commit?: boolean) => void;
  onPointCountChange: (count: number) => void;
  onInterpolationChange: (mode: string) => void;

  onOffsetAll?: (delta: number, commit?: boolean) => void;
  onReset?: () => void;

  onAddPoint?: (point: CurvePoint) => void;
  onRemovePoint?: (index: number) => void;

  smartValue?: number;
  onSmartChange?: (value: number) => void;

  onPointCommit?: () => void;
  onOffsetCommit?: () => void;
}

/** Result of a drag operation. */
export interface DragResult {
  x: number;
  y: number;
}

/** Endpoint constraint description. */
export interface EndpointConstraint {
  lockX: boolean;
  lockY: boolean;
}
