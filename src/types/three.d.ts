declare module "three" {
  export class WebGLRenderer {
    constructor(options?: any);
    outputColorSpace: string;
    capabilities: { isWebGL2: boolean };
    extensions: { has(name: string): boolean };
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number): void;
    setRenderTarget(target: WebGLRenderTarget | null): void;
    render(scene: any, camera: any): void;
    clear(color?: boolean, depth?: boolean, stencil?: boolean): void;
    readRenderTargetPixels(
      target: WebGLRenderTarget,
      x: number,
      y: number,
      width: number,
      height: number,
      buffer: Uint8Array,
    ): void;
    dispose(): void;
    domElement: HTMLCanvasElement;
  }

  export class Scene {
    add(object: any): void;
  }

  export class OrthographicCamera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
  }

  export class ShaderMaterial {
    constructor(options: any);
    uniforms: { [key: string]: { value: any } };
    dispose(): void;
  }

  export class Mesh {
    constructor(geometry: any, material: any);
  }

  export class PlaneGeometry {
    constructor(width: number, height: number);
    dispose(): void;
  }

  export class WebGLRenderTarget {
    constructor(width: number, height: number, options?: any);
    texture: Texture;
    dispose(): void;
  }

  export class Texture {
    constructor(bitmap?: ImageBitmap);
    flipY: boolean;
    needsUpdate: boolean;
    colorSpace: string;
    minFilter: any;
    magFilter: any;
    format: any;
    type: any;
    dispose(): void;
  }

  export class DataTexture extends Texture {
    constructor(data: Uint8Array, width: number, height: number, format?: any, type?: any);
    image: { data: Uint8Array };
    minFilter: any;
    magFilter: any;
    wrapS: any;
    wrapT: any;
  }

  export class Vector2 {
    constructor(x: number, y: number);
    x: number;
    y: number;
    set(x: number, y: number): this;
  }

  export const SRGBColorSpace: string;
  export const LinearSRGBColorSpace: string;
  export const NoColorSpace: string;
  export const LinearFilter: any;
  export const NearestFilter: any;
  export const RGBAFormat: any;
  export const UnsignedByteType: any;
  export const HalfFloatType: any;
  export const ClampToEdgeWrapping: any;
  export const ColorManagement: { enabled: boolean };
}
