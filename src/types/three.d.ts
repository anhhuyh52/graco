declare module "three" {
  export class WebGLRenderer {
    constructor(options?: any);
    setPixelRatio(ratio: number): void;
    setSize(width: number, height: number): void;
    render(scene: any, camera: any): void;
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
  }

  export class Mesh {
    constructor(geometry: any, material: any);
  }

  export class PlaneGeometry {
    constructor(width: number, height: number);
  }

  export class Texture {
    constructor(bitmap: ImageBitmap);
    flipY: boolean;
    needsUpdate: boolean;
    colorSpace: string;
    dispose(): void;
  }

  export class Vector2 {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  export const SRGBColorSpace: string;
}
