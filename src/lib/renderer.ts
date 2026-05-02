import * as THREE from "three";

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uExposure, uSaturation, uTemperature, uTint;
  uniform float uShadowR, uShadowG, uShadowB;
  uniform float uHighR, uHighG, uHighB;
  uniform float uHalAmt, uHalSpill, uHalShift, uHalSat;
  uniform float uDifAmt, uDifFog;
  uniform float uGrain, uGrainChroma, uAcutance;
  uniform float uSpotAmt, uSpotPop, uSpotBias, uSpotFocus;
  uniform vec2  uSpotCenter;
  uniform float uSplitEnabled, uSplitX;
  uniform float uBypass;
  uniform float uTime;
  uniform vec2  uRes;
  uniform vec2  uTexRes;
  varying vec2 vUv;

  float lum(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
  float rand(vec2 co){ return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453); }

  vec3 softKnee(vec3 c){
    vec3 k=vec3(0.85); vec3 o=max(c-k,0.);
    return min(c,k)+o/(1.+o*4.);
  }
  vec3 applyExp(vec3 c, float ev){ return softKnee(c*pow(2.,ev)); }
  vec3 applySat(vec3 c, float s){ float l=lum(c); return mix(vec3(l),c,1.+s); }
  vec3 applyTemp(vec3 c, float t, float tn){
    c.r=clamp(c.r+t*.1,0.,1.); c.b=clamp(c.b-t*.1,0.,1.); c.g=clamp(c.g+tn*.05,0.,1.); return c;
  }
  vec3 applySH(vec3 c){
    float l=lum(c);
    float sw=clamp(1.-l*3.,0.,1.), hw=clamp((l-.67)*3.,0.,1.);
    c.r=clamp(c.r+uShadowR*sw+uHighR*hw,0.,1.);
    c.g=clamp(c.g+uShadowG*sw+uHighG*hw,0.,1.);
    c.b=clamp(c.b+uShadowB*sw+uHighB*hw,0.,1.);
    return c;
  }
  vec3 applyHalation(vec3 c, vec2 uv){
    if(uHalAmt<.001) return c;
    float r=(0.01+uHalSpill*.06)*uHalAmt; vec3 bloom=vec3(0.);
    for(int i=0;i<8;i++){
      float a=float(i)*.7854;
      vec3 s=texture2D(uTex,clamp(uv+vec2(cos(a),sin(a))*r,0.,1.)).rgb;
      float thr=mix(.75,.5,uHalSpill);
      float glow=max(lum(s)-thr,0.)/max(1.-thr,.001);
      vec3 tint=vec3(1.,.3+uHalShift*.4,.1+max(uHalShift,0.)*.2);
      tint=mix(vec3(lum(tint)),tint,uHalSat);
      bloom+=s*glow*tint;
    }
    return clamp(c+bloom/8.*uHalAmt,0.,1.);
  }
  vec3 applySpot(vec3 c, vec2 uv){
    if(uSpotAmt<.001) return c;
    float d=length(uv-uSpotCenter);
    float fr=mix(.8,.15,uSpotFocus);
    float mask=1.-smoothstep(fr*.5,fr,d);
    float dm=mix(1.-mask,0.,max(uSpotBias,0.));
    float bm=mix(mask,    0.,max(-uSpotBias,0.));
    c=applyExp(c, uSpotAmt*bm*.8);
    c=applyExp(c,-uSpotAmt*dm*.6);
    return clamp(c,0.,1.);
  }
  vec3 applyGrain(vec3 c, vec2 uv){
    if(uGrain<.001) return c;
    float n=(rand(uv*1000.+uTime)-.5)*uGrain*.15;
    float nr=(rand(uv*997.+uTime+vec2(.1))-.5)*uGrain*uGrainChroma*.15;
    float ng=(rand(uv*991.+uTime+vec2(.2))-.5)*uGrain*uGrainChroma*.15;
    float nb=(rand(uv*983.+uTime+vec2(.3))-.5)*uGrain*uGrainChroma*.15;
    return clamp(c+vec3(n+nr,n+ng,n+nb),0.,1.);
  }
  vec3 applyAcutance(vec3 c, vec2 uv){
    if(abs(uAcutance)<.001) return c;
    vec2 px=1./uRes; vec3 blur=vec3(0.);
    for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++)
      blur+=texture2D(uTex,uv+vec2(float(x),float(y))*px).rgb;
    return clamp(c+(c-blur/9.)*uAcutance*2.,0.,1.);
  }
  vec3 grade(vec2 uv){
    vec3 c=texture2D(uTex,uv).rgb;
    c=applyExp(c,uExposure); c=applySat(c,uSaturation);
    c=applyTemp(c,uTemperature,uTint); c=applySH(c);
    c=applyHalation(c,uv);
    c=mix(c,c+uDifFog*.1,uDifAmt*max(1.-lum(c)*2.,0.));
    c=applySpot(c,uv); c=applyGrain(c,uv); c=applyAcutance(c,uv);
    return c;
  }
  void main(){
    vec2 uvView=vec2(vUv.x, 1.0 - vUv.y);

    float texAspect  = uTexRes.x / max(uTexRes.y, 1.0);
    float viewAspect = uRes.x / max(uRes.y, 1.0);
    vec2 scale = (texAspect > viewAspect)
      ? vec2(1.0, viewAspect / texAspect)
      : vec2(texAspect / viewAspect, 1.0);

    vec2 uvImg = (uvView - 0.5) / max(scale, vec2(1e-6)) + 0.5;
    bool outside = (uvImg.x < 0.0) || (uvImg.x > 1.0) || (uvImg.y < 0.0) || (uvImg.y > 1.0);
    vec3 bg = vec3(0.1137, 0.1137, 0.1373);

    if(uSplitEnabled>.5 && uvView.x>uSplitX){
      float lw=1.5/uRes.x;
      if(abs(uvView.x-uSplitX)<lw){ gl_FragColor=vec4(1.); return; }
      gl_FragColor = outside ? vec4(bg, 1.0) : texture2D(uTex, uvImg);
      return;
    }
    if(outside){ gl_FragColor = vec4(bg, 1.0); return; }
    if(uBypass>.5){ gl_FragColor=texture2D(uTex,uvImg); return; }
    gl_FragColor=vec4(grade(uvImg),1.);
  }
`;

export interface EditState {
  balance: {
    exposure: number;
    saturation: number;
    temperature: number;
    tint: number;
    bypass?: boolean;
  };
  rgb: {
    shadowR: number;
    shadowG: number;
    shadowB: number;
    highlightR: number;
    highlightG: number;
    highlightB: number;
    bypass?: boolean;
  };
  halation: {
    amount: number;
    lightSpill: number;
    colorShift: number;
    saturation: number;
    bypass?: boolean;
  };
  diffusion: {
    amount: number;
    fog: number;
    bypass?: boolean;
  };
  texture: {
    grainAmount: number;
    grainChroma: number;
    acutance: number;
    bypass?: boolean;
  };
  spotlight: {
    amount: number;
    pop: number;
    bias: number;
    focus: number;
    centerX: number;
    centerY: number;
    bypass?: boolean;
  };
}

export class Renderer {
  #renderer: any;
  #scene: any;
  #camera: any;
  #material: any;
  #texture: any | null = null;
  #raf: number = 0;
  #time = 0;
  #container: HTMLDivElement;
  #resizeObserver: ResizeObserver;

  constructor(container: HTMLDivElement) {
    this.#container = container;
    this.#renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.#renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.#renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.#renderer.domElement);

    this.#scene = new THREE.Scene();
    this.#camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.#material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.#buildUniforms(),
    });
    this.#scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.#material));

    this.#resizeObserver = new ResizeObserver(() => {
      this.#renderer.setSize(container.clientWidth, container.clientHeight);
      this.setUniform("uRes", new THREE.Vector2(container.clientWidth, container.clientHeight));
    });
    this.#resizeObserver.observe(container);

    this.#loop();
  }

  get domElement() {
    return this.#renderer.domElement;
  }

  #buildUniforms() {
    return {
      uTex: { value: null },
      uExposure: { value: 0 },
      uSaturation: { value: 0 },
      uTemperature: { value: 0 },
      uTint: { value: 0 },
      uShadowR: { value: 0 },
      uShadowG: { value: 0 },
      uShadowB: { value: 0 },
      uHighR: { value: 0 },
      uHighG: { value: 0 },
      uHighB: { value: 0 },
      uHalAmt: { value: 0 },
      uHalSpill: { value: 0 },
      uHalShift: { value: 0 },
      uHalSat: { value: 1 },
      uDifAmt: { value: 0 },
      uDifFog: { value: 0 },
      uGrain: { value: 0 },
      uGrainChroma: { value: 0 },
      uAcutance: { value: 0 },
      uSpotAmt: { value: 0 },
      uSpotPop: { value: 0 },
      uSpotBias: { value: 0 },
      uSpotFocus: { value: 0.5 },
      uSpotCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uSplitEnabled: { value: 0 },
      uSplitX: { value: 0.5 },
      uBypass: { value: 0 },
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(this.#container.clientWidth, this.#container.clientHeight) },
      uTexRes: { value: new THREE.Vector2(1, 1) },
    };
  }

  #loop() {
    this.#raf = requestAnimationFrame(() => this.#loop());
    this.#time += 0.016;
    this.setUniform("uTime", this.#time);
    this.#renderer.render(this.#scene, this.#camera);
  }

  setUniform(key: string, value: any) {
    if (this.#material.uniforms[key]) {
      this.#material.uniforms[key].value = value;
    }
  }

  loadBitmap(bitmap: ImageBitmap | null) {
    this.#texture?.dispose();
    if (!bitmap) { 
      this.setUniform('uTex', null);
      this.setUniform('uTexRes', new THREE.Vector2(1, 1)); 
      return 
    }
    const tex = new THREE.Texture(bitmap);
    tex.flipY = false;
    tex.needsUpdate = true;
    this.#texture = tex;
    this.setUniform("uTex", tex);
    this.setUniform("uTexRes", new THREE.Vector2(bitmap.width, bitmap.height));
  }

  applyEditState(edit: EditState, bypass: boolean) {
    const { balance, rgb, halation, diffusion, texture, spotlight } = edit;
    this.setUniform("uExposure", balance.bypass ? 0 : balance.exposure);
    this.setUniform("uSaturation", balance.bypass ? 0 : balance.saturation);
    this.setUniform("uTemperature", balance.bypass ? 0 : balance.temperature);
    this.setUniform("uTint", balance.bypass ? 0 : balance.tint);
    this.setUniform("uShadowR", rgb.bypass ? 0 : rgb.shadowR);
    this.setUniform("uShadowG", rgb.bypass ? 0 : rgb.shadowG);
    this.setUniform("uShadowB", rgb.bypass ? 0 : rgb.shadowB);
    this.setUniform("uHighR", rgb.bypass ? 0 : rgb.highlightR);
    this.setUniform("uHighG", rgb.bypass ? 0 : rgb.highlightG);
    this.setUniform("uHighB", rgb.bypass ? 0 : rgb.highlightB);
    this.setUniform("uHalAmt", halation.bypass ? 0 : halation.amount);
    this.setUniform("uHalSpill", halation.bypass ? 0 : halation.lightSpill);
    this.setUniform("uHalShift", halation.bypass ? 0 : halation.colorShift);
    this.setUniform("uHalSat", halation.bypass ? 1 : halation.saturation);
    this.setUniform("uDifAmt", diffusion.bypass ? 0 : diffusion.amount);
    this.setUniform("uDifFog", diffusion.bypass ? 0 : diffusion.fog);
    this.setUniform("uGrain", texture.bypass ? 0 : texture.grainAmount);
    this.setUniform("uGrainChroma", texture.bypass ? 0 : texture.grainChroma);
    this.setUniform("uAcutance", texture.bypass ? 0 : texture.acutance);
    this.setUniform("uSpotAmt", spotlight.bypass ? 0 : spotlight.amount);
    this.setUniform("uSpotPop", spotlight.bypass ? 0 : spotlight.pop);
    this.setUniform("uSpotBias", spotlight.bypass ? 0 : spotlight.bias);
    this.setUniform("uSpotFocus", spotlight.bypass ? 0.5 : spotlight.focus);
    this.setUniform("uSpotCenter", new THREE.Vector2(spotlight.centerX, spotlight.centerY));
    this.setUniform("uBypass", bypass ? 1 : 0);
  }

  setSplit(enabled: boolean, x = 0.5) {
    this.setUniform("uSplitEnabled", enabled ? 1 : 0);
    this.setUniform("uSplitX", x);
  }

  destroy() {
    cancelAnimationFrame(this.#raf);
    this.#resizeObserver.disconnect();
    this.#texture?.dispose();
    this.#renderer.dispose();
    if (this.#renderer.domElement.parentNode === this.#container) {
      this.#container.removeChild(this.#renderer.domElement);
    }
  }
}
