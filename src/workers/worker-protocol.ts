import type { CurveLutDefinition } from "../core/curves/curveLut";

export type WorkerRequestType = "decode" | "histogram" | "generateLuts" | "cancel";

export interface DecodeRequest {
  id: number;
  type: "decode";
  buffer: ArrayBuffer;
}

export interface HistogramRequest {
  id: number;
  type: "histogram";
  pixels: ArrayBuffer;
  width: number;
  height: number;
}

export interface CurveDef extends CurveLutDefinition {}

export interface GenerateLutsRequest {
  id: number;
  type: "generateLuts";
  curves: Record<string, CurveDef | undefined>;
}

export interface CancelRequest {
  id: number;
  type: "cancel";
  targetId: number;
}

export type AnyWorkerRequest =
  | DecodeRequest
  | HistogramRequest
  | GenerateLutsRequest
  | CancelRequest;

export interface WorkerErrorPayload {
  message: string;
  name?: string;
  stack?: string;
  code?: string;
}

interface WorkerResponseBase {
  id: number;
  error?: WorkerErrorPayload;
}

export interface DecodeResponse extends WorkerResponseBase {
  type: "decode";
  image?: {
    width: number;
    height: number;
    pixels: ArrayBuffer;
    format: string;
  };
}

export interface HistogramResponse extends WorkerResponseBase {
  type: "histogram";
  bins?: ArrayBuffer;
}

export interface GenerateLutsResponse extends WorkerResponseBase {
  type: "generateLuts";
  luts?: Record<string, ArrayBuffer>;
}

export interface CancelResponse extends WorkerResponseBase {
  type: "cancel";
  targetId: number;
}

export type AnyWorkerResponse =
  | DecodeResponse
  | HistogramResponse
  | GenerateLutsResponse
  | CancelResponse;
