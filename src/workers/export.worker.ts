import { bakeCurveLut, type CurveLutDefinition } from "../core/curves/curveLut";

type ExportRequest =
  | {
      id: number;
      type: "lut1d";
      title: string;
      curve: CurveLutDefinition;
    }
  | {
      id: number;
      type: "projectJson";
      project: unknown;
    };

type ExportResponse =
  | {
      id: number;
      type: "lut1d";
      text?: string;
      error?: string;
    }
  | {
      id: number;
      type: "projectJson";
      text?: string;
      error?: string;
    };

function encodeCube1D(title: string, curve: CurveLutDefinition): string {
  const lut = bakeCurveLut(curve);
  const lines = [
    `TITLE "${title.replace(/"/g, "'")}"`,
    "LUT_1D_SIZE 256",
    "DOMAIN_MIN 0.0 0.0 0.0",
    "DOMAIN_MAX 1.0 1.0 1.0",
  ];

  for (let i = 0; i < 256; i += 1) {
    const v = (lut[i * 4] / 255).toFixed(6);
    lines.push(`${v} ${v} ${v}`);
  }

  return `${lines.join("\n")}\n`;
}

self.onmessage = (event: MessageEvent<ExportRequest>) => {
  const msg = event.data;

  try {
    if (msg.type === "lut1d") {
      const response: ExportResponse = {
        id: msg.id,
        type: "lut1d",
        text: encodeCube1D(msg.title, msg.curve),
      };
      self.postMessage(response);
      return;
    }

    const response: ExportResponse = {
      id: msg.id,
      type: "projectJson",
      text: JSON.stringify(msg.project, null, 2),
    };
    self.postMessage(response);
  } catch (error) {
    const response: ExportResponse = {
      id: msg.id,
      type: msg.type,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
