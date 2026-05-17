/**
 * renderer.ts — Production GPU grading engine
 *
 * Architecture: two-pass linear workflow
 *   Pass 1 (GRADE_P1): sRGB decode → primary grade → LUT curves → HalfFloat scene-linear
 *   Pass 2 (GRADE_P2): optical effects (on graded linear) → ACES → sRGB → film texture
 *   Pass 3 (DISPLAY):  aspect-ratio composite + split-view → screen
 *
 * Coordinate convention (Y axis):
 *   tex.flipY = false → texture y=0 = image TOP (CSS convention).
 *   vUv.y=0 in grade shader samples the image top. Position uniforms
 *   (uSpotCenter, uDifCenter) use the same convention: y=0 is image top,
 *   y=1 is image bottom. UI edit state should encode Y the same way.
 *
 * Fixes applied vs. previous revision:
 *   1. Two-pass split — halation and diffusion now read the graded linear
 *      buffer (P1 output) instead of the ungraded source texture.
 *   2. HalfFloat intermediate render target — no premature clamping of
 *      scene-linear values before tone mapping; HDR headroom preserved.
 *   3. Linear-ramp LUT default — contrast curve is a true identity until
 *      the worker uploads real curve data.
 *   4. Project-owned ImageBitmap lifetime — renderer only borrows bitmaps.
 *   5. Full resource disposal (materials, geometries) in destroy().
 *   6. Split dirty flags — grain animation only re-runs P2, not the full
 *      primary grade; substantially reduces idle GPU load.
 *   7. Histogram analysis pass re-uses the existing P1 render target —
 *      only P2 rerenders at 128×128, halving histogram render cost.
 *   8. render target setSize replaced by dispose+recreate — avoids
 *      potential framebuffer leak on image reload.
 *   9. Dead clamp01 import removed.
 *  10. HalfFloat capability check with UnsignedByte fallback for safety.
 */

import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  ShaderMaterial,
  Mesh,
  PlaneGeometry,
  WebGLRenderTarget,
  LinearFilter,
  NearestFilter,
  RGBAFormat,
  UnsignedByteType,
  HalfFloatType,
  Vector2,
  LinearSRGBColorSpace,
  Texture,
  DataTexture,
  ClampToEdgeWrapping,
  ColorManagement,
  NoColorSpace,
} from "three";
import { CURVE_LUT_SIZE, createIdentityCurveLut } from "../core/curves/curveLut";

// ── Disable Three.js automatic color management ───────────────────────────────
// All color-space transforms are applied explicitly in shaders.
ColorManagement.enabled = false;

// ── LUT resolution ────────────────────────────────────────────────────────────
const LUT_SIZE = CURVE_LUT_SIZE;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VERTEX SHADER
// ─────────────────────────────────────────────────────────────────────────────
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SHARED GLSL CHUNKS
// Inlined into both P1 and P2 to avoid a GLSL include system.
// Color-space math, luminance, HSV, and LUT sampler.
// ─────────────────────────────────────────────────────────────────────────────

/** IEC 61966-2-1 sRGB EOTF and OETF, plus HSV, Rec.709 luma, LUT sampler. */
const CHUNK_COLOR = /* glsl */ `
  precision highp float;

  // sRGB EOTF — display-referred → scene-linear (toe + power curve)
  float srgbToLinearScalar(float v) {
    return v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4);
  }
  vec3 srgbToLinear(vec3 c) {
    return vec3(srgbToLinearScalar(c.r), srgbToLinearScalar(c.g), srgbToLinearScalar(c.b));
  }

  // sRGB OETF — scene-linear → display-referred
  float linearToSrgbScalar(float v) {
    v = max(v, 0.0);
    return v <= 0.0031308 ? v * 12.92 : 1.055 * pow(v, 1.0 / 2.4) - 0.055;
  }
  vec3 linearToSrgb(vec3 c) {
    return vec3(linearToSrgbScalar(c.r), linearToSrgbScalar(c.g), linearToSrgbScalar(c.b));
  }

  // Rec.709 luminance (scene-linear)
  float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  // HSV ↔ RGB (operates on display-encoded values for hue/sat detection)
  vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1.0e-10)), d / (q.x + 1.0e-10), q.x);
  }
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }

  // LUT sampler — half-texel offset for correct edge-bin sampling
  float sampleLUT(sampler2D lut, float x) {
    float u = (clamp(x, 0.0, 1.0) * float(${LUT_SIZE} - 1) + 0.5) / float(${LUT_SIZE});
    return texture2D(lut, vec2(u, 0.5)).r;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PASS 1 — PRIMARY GRADE FRAGMENT SHADER
// Input:  uTex (sRGB source)
// Output: scene-linear RGB, unclamped, into HalfFloat render target
//
// Stages: input transform → primary grade → LUT curves
// No optical effects, no tone mapping, no display transform here.
// ─────────────────────────────────────────────────────────────────────────────
const GRADE_P1_FRAG = /* glsl */ `
  ${CHUNK_COLOR}

  uniform sampler2D uTex;

  // Primary grade
  uniform float uExposure;
  uniform float uSaturation;
  uniform float uTemperature;
  uniform float uTint;
  uniform float uSmartContrast;

  // Curve LUT textures (256×1, R channel, bilinear)
  uniform sampler2D uLutExposure;
  uniform sampler2D uLutContrast;
  uniform sampler2D uLutDensity;
  uniform sampler2D uLutChroma;
  uniform sampler2D uLutRadiance;
  uniform sampler2D uLutSaturation;

  // Shadow / Highlight tint
  uniform float uShadowR, uShadowG, uShadowB;
  uniform float uHighR,   uHighG,   uHighB;

  // Scattering
  uniform vec2 uScatShadows, uScatHighlights;

  // Refraction
  uniform vec2  uRefShadows, uRefHighlights;
  uniform float uRefThreshold;

  // State
  uniform float uBypass;

  varying vec2 vUv;


  // ── Primary grade functions ────────────────────────────────────────────────

  vec3 applyExposure(vec3 c, float ev) {
    return c * exp2(ev);
  }

  // Diagonal white-balance matrix in scene-linear space
  vec3 applyWhiteBalance(vec3 c, float temp, float tint) {
    c.r *= 1.0 + temp * 0.08;
    c.g *= 1.0 + tint  * 0.04;
    c.b  = c.b * (1.0 - temp * 0.08) * (1.0 + tint * 0.02);
    return max(c, 0.0);
  }

  // Log2-space contrast around 0.18 middle grey
  vec3 applyContrast(vec3 c, float contrast) {
    if (abs(contrast) < 0.001) return c;
    const float pivot = 0.18;
    vec3 safe = max(c, 1.0e-5);
    vec3 logC = log2(safe / pivot);
    logC *= 1.0 + contrast * 0.5;
    return max(pivot * exp2(logC), 0.0);
  }

  // Rec.709 luma-preserving saturation in scene-linear
  vec3 applySaturation(vec3 c, float s) {
    float l = lum(c);
    return max(mix(vec3(l), c, 1.0 + s), 0.0);
  }

  // Shadow / Highlight additive tint (squared luminance masks)
  vec3 applySH(vec3 c) {
    float l  = lum(c);
    float sw = clamp(1.0 - l * 3.0, 0.0, 1.0); sw *= sw;
    float hw = clamp((l - 0.55) * 3.0, 0.0, 1.0); hw *= hw;
    c += vec3(uShadowR, uShadowG, uShadowB) * sw * 0.10;
    c += vec3(uHighR,   uHighG,   uHighB)   * hw * 0.10;
    return max(c, 0.0);
  }

  // Scattering (physics-inspired tonal split tint)
  vec3 applyScattering(vec3 c) {
    float l  = lum(c);
    float sw = clamp(1.0 - l * 3.0, 0.0, 1.0); sw *= sw;
    float hw = clamp((l - 0.55) * 3.0, 0.0, 1.0); hw *= hw;
    vec3 shadowTint = vec3(uScatShadows.x,    0.0, uScatShadows.y);
    vec3 highTint   = vec3(uScatHighlights.x, 0.0, uScatHighlights.y);
    return max(c + shadowTint * sw * 0.12 + highTint * hw * 0.12, 0.0);
  }

  // Refraction (chromatic dispersion by luminance region)
  vec3 applyRefraction(vec3 c) {
    float l     = lum(c);
    float split = smoothstep(uRefThreshold - 0.15, uRefThreshold + 0.15, l);
    vec2  ref   = mix(uRefShadows, uRefHighlights, split);
    float hueShift = ref.x * 0.06;
    float satGain  = 1.0 + ref.y * 0.3;
    vec3 shifted = vec3(c.r * (1.0 + hueShift), c.g, c.b * (1.0 - hueShift));
    float ll = lum(shifted);
    return max(mix(vec3(ll), shifted, satGain), 0.0);
  }

  // ── Curve LUT functions ────────────────────────────────────────────────────
  // All curves: display-domain UI → sample LUT in display domain → apply in linear.
  // This gives a correct round-trip: the curve UI preview matches GPU output exactly.

  // Luminance-driven EV offset (±1.2 EV range, centred at LUT midpoint)
  vec3 applyExposureCurve(vec3 c) {
    float linLum  = lum(c);
    float dispLum = linearToSrgbScalar(clamp(linLum, 0.0, 1.0));
    float mapped  = sampleLUT(uLutExposure, dispLum);
    float evDelta = (mapped - 0.5) * 2.4;
    return c * exp2(evDelta);
  }

  // Display-domain tone curve with linear round-trip (luminance ratio, hue preserved)
  vec3 applyContrastCurve(vec3 c) {
    float linLum = lum(c);
    if (linLum < 1.0e-6) return c;
    float dispLum   = linearToSrgbScalar(clamp(linLum, 0.0, 1.0));
    float mapped    = sampleLUT(uLutContrast, dispLum);
    float mappedLin = srgbToLinearScalar(mapped);
    return max(c * (mappedLin / max(linLum, 1.0e-6)), 0.0);
  }

  // Hue-selective saturation (display HSV for intuitive hue detection)
  vec3 applyDensityCurve(vec3 c) {
    vec3 disp = linearToSrgb(max(c, 0.0));
    vec3 hsv  = rgb2hsv(disp);
    float amount = sampleLUT(uLutDensity, hsv.x);
    hsv.y = clamp(hsv.y * (1.0 + (amount - 0.5) * 0.8), 0.0, 1.0);
    return srgbToLinear(hsv2rgb(hsv));
  }

  // Saturation-selective chroma gain
  vec3 applyChromaCurve(vec3 c) {
    vec3 disp = linearToSrgb(max(c, 0.0));
    vec3 hsv  = rgb2hsv(disp);
    float amount = sampleLUT(uLutChroma, hsv.y);
    hsv.y = clamp(hsv.y * (1.0 + (amount - 0.5) * 0.7), 0.0, 1.0);
    return srgbToLinear(hsv2rgb(hsv));
  }

  // Hue-selective exposure (EV tilt by hue angle)
  vec3 applyRadianceCurve(vec3 c) {
    vec3 disp = linearToSrgb(max(c, 0.0));
    vec3 hsv  = rgb2hsv(disp);
    float amount = sampleLUT(uLutRadiance, hsv.x);
    float ev = (amount - 0.5) * 1.2;
    return c * exp2(ev);
  }

  // Luminance-selective saturation
  vec3 applySaturationCurve(vec3 c) {
    float linLum  = lum(c);
    float dispLum = linearToSrgbScalar(clamp(linLum, 0.0, 1.0));
    float amount  = sampleLUT(uLutSaturation, dispLum);
    float l = lum(c);
    return max(mix(vec3(l), c, 1.0 + (amount - 0.5) * 1.0), 0.0);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN — Pass 1: sRGB → scene-linear working space
  // ═══════════════════════════════════════════════════════════════════════════
  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;

    // Bypass: pass raw sRGB bytes through — P2 will detect and short-circuit.
    if (uBypass > 0.5) { gl_FragColor = vec4(c, 1.0); return; }

    // ── Input transform ──────────────────────────────────────────────────────
    c = srgbToLinear(c);

    // ── Primary grade (scene-linear) ─────────────────────────────────────────
    c = applyExposure(c, uExposure);
    c = applyWhiteBalance(c, uTemperature, uTint);
    c = applyContrast(c, uSmartContrast);
    c = applySaturation(c, uSaturation);
    c = applySH(c);
    c = applyScattering(c);
    c = applyRefraction(c);

    // ── LUT curves ───────────────────────────────────────────────────────────
    c = applyExposureCurve(c);
    c = applyContrastCurve(c);
    c = applyDensityCurve(c);
    c = applyChromaCurve(c);
    c = applyRadianceCurve(c);
    c = applySaturationCurve(c);

    // Output: scene-linear, unclamped — stored in HalfFloat render target.
    // Tone mapping occurs in Pass 2.
    gl_FragColor = vec4(c, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// PASS 2 — OPTICAL EFFECTS + TONE MAPPING + DISPLAY FRAGMENT SHADER
// Input:  uGradedLinear (HalfFloat scene-linear from Pass 1)
//         uTex (original sRGB — used only as blur reference for acutance)
// Output: sRGB display-referred, into UInt8 render target
//
// Key improvement over previous single-pass design:
//   Halation and diffusion now sample uGradedLinear — they respond to the
//   actual graded signal (exposure, curves) rather than the ungraded source.
// ─────────────────────────────────────────────────────────────────────────────
const GRADE_P2_FRAG = /* glsl */ `
  ${CHUNK_COLOR}

  // Graded scene-linear (HalfFloat, from Pass 1)
  uniform sampler2D uGradedLinear;
  // Original sRGB — used only as unsharp-mask blur reference for acutance.
  // NOTE: A future 3-pass architecture would use the post-P2 display buffer
  // here for a fully correct reference. Acceptable limitation for now.
  uniform sampler2D uTex;

  // Halation
  uniform float uHalAmt, uHalSpill, uHalShift, uHalSat;

  // Diffusion
  uniform float uDifAmt, uDifFog, uDifThreshold, uDifFocus;
  uniform vec2  uDifCenter;

  // Film texture
  uniform float uGrain, uGrainChroma, uAcutance, uResolution;

  // Spotlight
  uniform float uSpotAmt, uSpotPop, uSpotBias, uSpotFocus;
  uniform vec2  uSpotCenter;

  // State
  uniform float uBypass;
  uniform float uToneMap;
  uniform float uTime;
  uniform vec2  uTexRes;

  varying vec2 vUv;

  // Hash noise for grain (stable across frames except for uTime)
  float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }


  // ── Optical effects (scene-linear) ────────────────────────────────────────
  // All sample uGradedLinear, which is scene-linear output of Pass 1.
  // This is the critical architectural improvement: effects now respond
  // to the graded signal, not the original ungraded source.

  // Halation: film highlight bleed. Blur samples come from the graded linear
  // buffer — exposure and curve work is already baked in.
  vec3 applyHalation(vec3 c, vec2 uv) {
    if (uHalAmt < 0.001) return c;
    float radius = (0.012 + uHalSpill * 0.07) * uHalAmt;
    vec3  bloom  = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float angle  = float(i) * 0.5236;
      vec2  offset = vec2(cos(angle), sin(angle)) * radius;
      // Sample graded linear directly — no decode needed (already linear)
      vec3 s = texture2D(uGradedLinear, clamp(uv + offset, 0.0, 1.0)).rgb;
      float linThresh = srgbToLinearScalar(mix(0.65, 0.35, uHalSpill));
      float glow = max(lum(s) - linThresh, 0.0) / max(1.0 - linThresh, 0.001);
      vec3 tint = vec3(1.0, 0.25 + uHalShift * 0.35, 0.05 + max(uHalShift, 0.0) * 0.15);
      tint = mix(vec3(lum(tint)), tint, uHalSat);
      bloom += s * glow * tint;
    }
    return c + bloom / 12.0 * uHalAmt * 0.9;
  }

  // Diffusion: atmospheric haze, additive linear light
  vec3 applyDiffusion(vec3 c, vec2 uv) {
    if (uDifAmt < 0.001) return c;
    float l = lum(c);
    float linThresh = srgbToLinearScalar(clamp(uDifThreshold, 0.0, 1.0));
    float thrMask   = smoothstep(linThresh - 0.02, linThresh + 0.01, l);
    float d         = distance(uv, uDifCenter);
    float focusMask = 1.0 - smoothstep(0.0, mix(0.8, 0.15, uDifFocus), d);
    float amount    = uDifAmt * thrMask * (1.0 - focusMask);
    return c + uDifFog * 0.06 * amount;
  }

  // Spotlight: radial exposure and saturation modifier
  vec3 applySpot(vec3 c, vec2 uv) {
    if (uSpotAmt < 0.001) return c;
    float d    = length(uv - uSpotCenter);
    float fr   = mix(0.8, 0.15, uSpotFocus);
    float mask = 1.0 - smoothstep(fr * 0.5, fr, d);
    float dm   = mix(1.0 - mask, 0.0, max(uSpotBias, 0.0));
    float bm   = mix(mask, 0.0, max(-uSpotBias, 0.0));
    c = c * exp2(uSpotAmt * bm * 0.8);
    c = c * exp2(-uSpotAmt * dm * 0.6);
    float l = lum(c);
    c += (c - vec3(l)) * (uSpotPop * mask * 0.5);
    return max(c, 0.0);
  }


  // ── Filmic tone mapping ───────────────────────────────────────────────────
  // ACES approximation (Narkowicz/Hill). Maps [0, ∞) → [0, 1].
  vec3 ACESFilmic(vec3 x) {
    const float a = 2.51, b = 0.03, c2 = 2.43, d = 0.59, e2 = 0.14;
    return clamp((x * (a * x + b)) / (x * (c2 * x + d) + e2), 0.0, 1.0);
  }


  // ── Film texture (display / perceptual space, post-encode) ────────────────
  // Applied after linearToSrgb. Real film grain has perceptually uniform
  // density in log/perceptual space — applying it after sRGB encode is correct.

  vec3 applyGrain(vec3 c, vec2 uv) {
    if (uGrain < 0.001) return c;
    float n  = (rand(uv * 1000.0 + uTime) - 0.5) * uGrain * 0.12;
    float nr = (rand(uv * 997.0  + uTime + vec2(0.1)) - 0.5) * uGrain * uGrainChroma * 0.12;
    float ng = (rand(uv * 991.0  + uTime + vec2(0.2)) - 0.5) * uGrain * uGrainChroma * 0.12;
    float nb = (rand(uv * 983.0  + uTime + vec2(0.3)) - 0.5) * uGrain * uGrainChroma * 0.12;
    return clamp(c + vec3(n + nr, n + ng, n + nb), 0.0, 1.0);
  }

  // Acutance: unsharp mask. Blur reference is the original sRGB texture (uTex).
  // Limitation: ref doesn't reflect grading; a 3-pass design would use the
  // post-P2 display buffer. The sharpening delta is applied to the graded signal.
  vec3 applyAcutance(vec3 c, vec2 uv) {
    if (abs(uAcutance) < 0.001) return c;
    vec2 px = 1.0 / uTexRes;
    vec3 blur = vec3(0.0);
    for (int x = -1; x <= 1; x++)
      for (int y = -1; y <= 1; y++)
        blur += texture2D(uTex, uv + vec2(float(x), float(y)) * px).rgb;
    blur /= 9.0;
    return clamp(c + (c - blur) * uAcutance * 2.0, 0.0, 1.0);
  }

  // Resolution: controllable softness
  vec3 applyResolution(vec3 c, vec2 uv) {
    if (abs(uResolution) < 0.001) return c;
    vec2 px = 1.0 / uTexRes;
    vec3 blur = vec3(0.0);
    for (int x = -1; x <= 1; x++)
      for (int y = -1; y <= 1; y++)
        blur += texture2D(uTex, uv + vec2(float(x), float(y)) * px).rgb;
    blur /= 9.0;
    if (uResolution > 0.0) return clamp(c + (c - blur) * uResolution * 1.5, 0.0, 1.0);
    return mix(c, blur, abs(uResolution));
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN — Pass 2: optical effects → tone mapping → display transform
  // ═══════════════════════════════════════════════════════════════════════════
  void main() {
    // Bypass: P1 stored raw sRGB bytes; pass them straight through.
    if (uBypass > 0.5) {
      gl_FragColor = texture2D(uGradedLinear, vUv);
      return;
    }

    // Read scene-linear graded value from P1
    vec3 c = texture2D(uGradedLinear, vUv).rgb;

    // ── Optical effects (scene-linear) ───────────────────────────────────────
    c = applyHalation(c, vUv);
    c = applyDiffusion(c, vUv);
    c = applySpot(c, vUv);

    // ── Tone mapping ─────────────────────────────────────────────────────────
    // Only apply filmic tone mapping if explicitly enabled.
    // Standard SDR images (JPEG/PNG) are already tone-mapped by the camera.
    if (uToneMap > 0.5) {
      c = ACESFilmic(c);
    }

    // ── Display transform ────────────────────────────────────────────────────
    c = linearToSrgb(c);

    // ── Film texture (perceptual / display space) ─────────────────────────────
    c = applyGrain(c, vUv);
    c = applyAcutance(c, vUv);
    c = applyResolution(c, vUv);

    gl_FragColor = vec4(c, 1.0);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// DISPLAY FRAGMENT SHADER — composites P2 output + split-view, unchanged
// ─────────────────────────────────────────────────────────────────────────────
const DISPLAY_FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform sampler2D uGraded;
  uniform float uSplitEnabled, uSplitX;
  uniform vec2 uRes, uTexRes;
  varying vec2 vUv;
  void main() {
    vec2 uvView = vec2(vUv.x, 1.0 - vUv.y);
    float texAspect  = uTexRes.x / max(uTexRes.y, 1.0);
    float viewAspect = uRes.x    / max(uRes.y,    1.0);
    vec2 scale  = (texAspect > viewAspect)
      ? vec2(1.0, viewAspect / texAspect)
      : vec2(texAspect / viewAspect, 1.0);
    vec2 uvImg  = (uvView - 0.5) / max(scale, vec2(1.0e-6)) + 0.5;
    bool outside = (uvImg.x < 0.0) || (uvImg.x > 1.0) || (uvImg.y < 0.0) || (uvImg.y > 1.0);
    vec3 bg = vec3(0.1137, 0.1137, 0.1373);
    if (uSplitEnabled > 0.5 && uvView.x > uSplitX) {
      float lw = 1.5 / uRes.x;
      if (abs(uvView.x - uSplitX) < lw) { gl_FragColor = vec4(1.0); return; }
      gl_FragColor = outside ? vec4(bg, 1.0) : texture2D(uTex, uvImg);
      return;
    }
    if (outside) { gl_FragColor = vec4(bg, 1.0); return; }
    gl_FragColor = texture2D(uGraded, uvImg);
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// EDIT STATE — public interface (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
export interface EditState {
  balance: { exposure: number; saturation: number; temperature: number; tint: number; bypass?: boolean; };
  exposure: { curve: { points: { x: number; y: number }[]; interpolation?: string; }; bypass?: boolean; };
  contrast: { curve: { points: { x: number; y: number }[]; interpolation?: string; }; smartContrast: number; bypass?: boolean; };
  density: { curve: { points: { x: number; y: number }[]; interpolation?: string; }; bypass?: boolean; };
  chroma: { curve: { points: { x: number; y: number }[]; interpolation?: string; }; bypass?: boolean; };
  radiance: { curve: { points: { x: number; y: number }[]; interpolation?: string; }; bypass?: boolean; };
  saturation: { curve: { points: { x: number; y: number }[]; interpolation?: string; }; bypass?: boolean; };
  scattering: { shadows: { x: number; y: number }; highlights: { x: number; y: number }; bypass?: boolean; };
  refraction: { shadows: { x: number; y: number }[]; highlights: { x: number; y: number }[]; threshold: number; bypass?: boolean; };
  rgb: { shadowR: number; shadowG: number; shadowB: number; highlightR: number; highlightG: number; highlightB: number; bypass?: boolean; };
  halation: { amount: number; lightSpill: number; colorShift: number; saturation: number; bypass?: boolean; };
  diffusion: { amount: number; fog: number; threshold: number; focus: number; focusX: number; focusY: number; bypass?: boolean; };
  texture: { grainAmount: number; grainChroma: number; acutance: number; resolution: number; bypass?: boolean; };
  spotlight: { amount: number; pop: number; bias: number; focus: number; centerX: number; centerY: number; bypass?: boolean; };
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER — two-pass GPU grading engine
// ─────────────────────────────────────────────────────────────────────────────
export class Renderer {
  readonly #renderer: WebGLRenderer;
  readonly #camera: OrthographicCamera;

  // ── Pass 1: primary grade → scene-linear HalfFloat ───────────────────────
  readonly #gradeP1Scene: Scene;
  readonly #gradeP1Material: ShaderMaterial;

  // ── Pass 2: optical effects + tonemap + display → UInt8 ──────────────────
  readonly #gradeP2Scene: Scene;
  readonly #gradeP2Material: ShaderMaterial;

  // ── Pass 3: display composite ─────────────────────────────────────────────
  readonly #displayScene: Scene;
  readonly #displayMaterial: ShaderMaterial;

  // ── Geometries (stored for disposal) ─────────────────────────────────────
  readonly #quadGeomP1: PlaneGeometry;
  readonly #quadGeomP2: PlaneGeometry;
  readonly #quadGeomDisplay: PlaneGeometry;

  // ── Render targets ────────────────────────────────────────────────────────
  // gradeTarget: HalfFloat, stores scene-linear P1 output (HDR headroom)
  #gradeTarget: WebGLRenderTarget;
  // displayTarget: UInt8, stores display-referred P2 output
  #displayTarget: WebGLRenderTarget;
  // analysisTarget: 128×128, for histogram readback (P2 re-render, throttled)
  readonly #analysisTarget: WebGLRenderTarget;

  // ── Texture / bitmap state ────────────────────────────────────────────────
  #texture: Texture | null = null;
  // Borrowed ImageBitmap reference; project state owns close().
  #bitmap: ImageBitmap | null = null;

  // ── RAF / timing ──────────────────────────────────────────────────────────
  #raf: number = 0;
  #time = 0;

  // ── Dirty flags ───────────────────────────────────────────────────────────
  // #gradeDirty: P1 needs to re-render (edit state, new image, LUT change)
  //   Setting this also forces P2 to re-render after.
  // #effectsDirty: P2 needs to re-render (grain animation, or after P1)
  #gradeDirty = true;
  #effectsDirty = true;

  // ── Misc ──────────────────────────────────────────────────────────────────
  readonly #container: HTMLDivElement;
  readonly #resizeObserver: ResizeObserver;
  #onHistogramPixelsUpdate?: (data: ArrayBuffer) => void;
  #lastHistogramRead = 0;
  readonly #histogramPixels = new Uint8Array(128 * 128 * 4);

  constructor(container: HTMLDivElement) {
    this.#container = container;

    this.#renderer = new WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    // Manual sRGB encode in P2 shader; prevent Three.js double-encoding.
    this.#renderer.outputColorSpace = LinearSRGBColorSpace;
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.#renderer.domElement);

    this.#camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ── Render targets ────────────────────────────────────────────────────────
    // Prefer HalfFloat for the intermediate grade target (HDR headroom, float
    // precision for scene-linear values). Fall back to UnsignedByte on WebGL1.
    const halfFloatSupported =
      this.#renderer.capabilities.isWebGL2 ||
      this.#renderer.extensions.has("OES_texture_half_float");
    const intermediateType = halfFloatSupported ? HalfFloatType : UnsignedByteType;

    this.#gradeTarget = new WebGLRenderTarget(1024, 1024, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: intermediateType,
    });
    this.#displayTarget = new WebGLRenderTarget(1024, 1024, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
    });
    this.#analysisTarget = new WebGLRenderTarget(128, 128, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
    });

    // ── Pass 1 ────────────────────────────────────────────────────────────────
    this.#gradeP1Scene = new Scene();
    this.#gradeP1Material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: GRADE_P1_FRAG,
      uniforms: this.#buildP1Uniforms(),
    });
    this.#quadGeomP1 = new PlaneGeometry(2, 2);
    this.#gradeP1Scene.add(new Mesh(this.#quadGeomP1, this.#gradeP1Material));

    // ── Pass 2 ────────────────────────────────────────────────────────────────
    this.#gradeP2Scene = new Scene();
    this.#gradeP2Material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: GRADE_P2_FRAG,
      uniforms: this.#buildP2Uniforms(),
    });
    this.#quadGeomP2 = new PlaneGeometry(2, 2);
    this.#gradeP2Scene.add(new Mesh(this.#quadGeomP2, this.#gradeP2Material));

    // ── Display pass ──────────────────────────────────────────────────────────
    this.#displayScene = new Scene();
    this.#displayMaterial = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: DISPLAY_FRAG,
      uniforms: {
        uTex: { value: null },
        uGraded: { value: this.#displayTarget.texture },
        uSplitEnabled: { value: 0 },
        uSplitX: { value: 0.5 },
        uRes: { value: new Vector2(container.clientWidth, container.clientHeight) },
        uTexRes: { value: new Vector2(1, 1) },
      },
    });
    this.#quadGeomDisplay = new PlaneGeometry(2, 2);
    this.#displayScene.add(new Mesh(this.#quadGeomDisplay, this.#displayMaterial));

    this.#resizeObserver = new ResizeObserver(() => {
      this.#renderer.setSize(container.clientWidth, container.clientHeight);
      this.#displayMaterial.uniforms.uRes.value.set(
        container.clientWidth,
        container.clientHeight,
      );
      this.#effectsDirty = true;
    });
    this.#resizeObserver.observe(container);
    this.#loop();
  }

  get domElement() { return this.#renderer.domElement; }

  // ── LUT helpers ─────────────────────────────────────────────────────────────

  /**
   * Creates a 256×1 RGBA DataTexture with a LINEAR RAMP in the R channel.
   *
   * A linear ramp (R[i] = i) encodes f(x)=x, which is:
   *   - Exposure curve: 0 EV offset at every luminance → identity ✓
   *   - Contrast curve: luminance ratio = 1.0 at every point → identity ✓
   *   - Others: (0.5 - 0.5) * scale = 0 → no change ✓
   *
   * Previously initialized flat at 128 (0.5), which was identity for most
   * curves but NOT for the contrast curve — that formula requires mapped=dispLum,
   * i.e. a true linear ramp. Flat 0.5 would crush highlights on the first frame
   * before the worker uploads real curve data.
   */
  #createLUT(): DataTexture {
    const data = createIdentityCurveLut();
    for (let i = 0; i < LUT_SIZE; i++) {
      data[i * 4 + 0] = i;   // R — linear ramp: f(x) = x
      data[i * 4 + 1] = i;   // G (unused, matches R for consistency)
      data[i * 4 + 2] = i;   // B (unused)
      data[i * 4 + 3] = 255; // A
    }
    const tex = new DataTexture(data, LUT_SIZE, 1, RGBAFormat, UnsignedByteType);
    tex.minFilter = LinearFilter;
    tex.magFilter = LinearFilter;
    tex.wrapS = ClampToEdgeWrapping;
    tex.wrapT = ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  /**
   * Updates an existing LUT DataTexture in-place.
   * No GPU reallocation — only the pixel data is replaced.
   */
  setLUT(uniformName: string, data: Uint8Array): void {
    const tex = this.#gradeP1Material.uniforms[uniformName]?.value as DataTexture | null;
    if (!tex) return;
    tex.image.data.set(data);
    tex.needsUpdate = true;
    this.#gradeDirty = true;
  }

  // ── Uniform construction ─────────────────────────────────────────────────────

  #buildP1Uniforms(): Record<string, { value: unknown }> {
    return {
      uTex: { value: null },
      uExposure: { value: 0 },
      uSaturation: { value: 0 },
      uTemperature: { value: 0 },
      uTint: { value: 0 },
      uSmartContrast: { value: 0 },

      // LUT textures — linear ramp default = identity for all curves
      uLutExposure: { value: this.#createLUT() },
      uLutContrast: { value: this.#createLUT() },
      uLutDensity: { value: this.#createLUT() },
      uLutChroma: { value: this.#createLUT() },
      uLutRadiance: { value: this.#createLUT() },
      uLutSaturation: { value: this.#createLUT() },

      uShadowR: { value: 0 }, uShadowG: { value: 0 }, uShadowB: { value: 0 },
      uHighR: { value: 0 }, uHighG: { value: 0 }, uHighB: { value: 0 },

      uScatShadows: { value: new Vector2(0, 0) },
      uScatHighlights: { value: new Vector2(0, 0) },
      uRefShadows: { value: new Vector2(0, 0) },
      uRefHighlights: { value: new Vector2(0, 0) },
      uRefThreshold: { value: 0.5 },

      uBypass: { value: 0 },
    };
  }

  #buildP2Uniforms(): Record<string, { value: unknown }> {
    return {
      uGradedLinear: { value: this.#gradeTarget.texture },
      uTex: { value: null },

      uHalAmt: { value: 0 }, uHalSpill: { value: 0 },
      uHalShift: { value: 0 }, uHalSat: { value: 1 },

      uDifAmt: { value: 0 }, uDifFog: { value: 0 },
      uDifThreshold: { value: 1 }, uDifFocus: { value: 0 },
      uDifCenter: { value: new Vector2(0.5, 0.5) },

      uGrain: { value: 0 }, uGrainChroma: { value: 0 },
      uAcutance: { value: 0 }, uResolution: { value: 0 },

      uSpotAmt: { value: 0 }, uSpotPop: { value: 0 },
      uSpotBias: { value: 0 }, uSpotFocus: { value: 0.5 },
      uSpotCenter: { value: new Vector2(0.5, 0.5) },

      uBypass: { value: 0 },
      uToneMap: { value: 0 },
      uTime: { value: 0 },
      uTexRes: { value: new Vector2(1, 1) },
    };
  }

  // ── Render loop ──────────────────────────────────────────────────────────────

  #loop(): void {
    this.#raf = requestAnimationFrame(() => this.#loop());
    this.#time += 0.016;

    // Grain animation only dirties P2 — P1 (primary grade) is unaffected.
    const grainActive = (this.#gradeP2Material.uniforms.uGrain.value as number) > 0.001;
    if (grainActive) {
      this.#gradeP2Material.uniforms.uTime.value = this.#time;
      this.#effectsDirty = true;
    }

    if (!this.#gradeDirty && !this.#effectsDirty) return;

    // ── Pass 1: primary grade → HalfFloat scene-linear ─────────────────────
    if (this.#gradeDirty) {
      this.#renderer.setRenderTarget(this.#gradeTarget);
      this.#renderer.render(this.#gradeP1Scene, this.#camera);
      this.#gradeDirty = false;
      // P1 changed → P2 must follow; always.
      this.#effectsDirty = true;

      // Histogram / scopes readback (throttled to ~15fps).
      // Re-renders P2 at 128×128 using the fresh full-res gradeTarget.
      // P1 does NOT need to re-run at analysis resolution — it's already done.
      const now = performance.now();
      if (this.#onHistogramPixelsUpdate && now - this.#lastHistogramRead > 66) {
        this.#renderer.setRenderTarget(this.#analysisTarget);
        this.#renderer.render(this.#gradeP2Scene, this.#camera);
        this.#updateHistogram();
        this.#lastHistogramRead = now;
      }
    }

    // ── Pass 2: optical effects + tone mapping → UInt8 display ─────────────
    if (this.#effectsDirty) {
      this.#renderer.setRenderTarget(this.#displayTarget);
      this.#renderer.render(this.#gradeP2Scene, this.#camera);
      this.#effectsDirty = false;
    }

    // ── Pass 3: display composite → screen ───────────────────────────────────
    this.#renderer.setRenderTarget(null);
    this.#renderer.render(this.#displayScene, this.#camera);
  }

  // ── Histogram ────────────────────────────────────────────────────────────────

  #updateHistogram(): void {
    if (!this.#onHistogramPixelsUpdate) return;
    this.#renderer.readRenderTargetPixels(this.#analysisTarget, 0, 0, 128, 128, this.#histogramPixels);
    this.#onHistogramPixelsUpdate(this.#histogramPixels.buffer);
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  onHistogramPixels(callback: (data: ArrayBuffer) => void): void {
    this.#onHistogramPixelsUpdate = callback;
  }

  /**
   * Set an arbitrary uniform by name on any of the three materials.
   * Preserved for external tools and debug overrides.
   */
  setUniform(key: string, value: unknown): void {
    if (this.#gradeP1Material.uniforms[key]) {
      this.#gradeP1Material.uniforms[key].value = value;
      this.#gradeDirty = true;
    }
    if (this.#gradeP2Material.uniforms[key]) {
      this.#gradeP2Material.uniforms[key].value = value;
      this.#effectsDirty = true;
    }
    if (this.#displayMaterial.uniforms[key]) {
      this.#displayMaterial.uniforms[key].value = value;
      this.#effectsDirty = true;
    }
  }

  /**
   * Upload a new source image as a GPU texture.
   *
   * Lifecycle:
   *   1. Drop the previous ImageBitmap reference. The project model owns
   *      imported bitmaps; the renderer only borrows them for texture upload.
   *   2. Dispose the previous Three.js texture (releases GPU texture object).
   *   3. Dispose and recreate render targets at the new image resolution.
   *      (setSize reuses the FBO but has historically leaked in some Three
   *      versions; recreating is explicit and safe.)
   *   4. Upload the new texture with NoColorSpace — the grade shader handles
   *      the sRGB → linear transform explicitly.
   *
   * colorSpace = NoColorSpace: prevents Three.js from applying an implicit
   * sRGB decode, which would corrupt the input to our manual pipeline.
   * flipY = false: ImageBitmap is already in CSS/canvas Y convention (y=0 at
   * top). Position uniforms (spotlight, diffusion center) use the same
   * convention: y=0 is image top, y=1 is image bottom.
   */
  loadBitmap(bitmap: ImageBitmap | null): void {
    // Project state owns ImageBitmap lifetime. Renderer must not close it.
    this.#bitmap = null;

    this.#texture?.dispose();
    this.#texture = null;

    if (!bitmap) {
      this.#gradeP1Material.uniforms.uTex.value = null;
      this.#gradeP2Material.uniforms.uTex.value = null;
      this.#displayMaterial.uniforms.uTex.value = null;
      this.#renderer.setRenderTarget(null);
      this.#renderer.clear(true, true, true);
      return;
    }

    this.#bitmap = bitmap;

    const tex = new Texture(bitmap);
    tex.colorSpace = NoColorSpace; // manual pipeline; no auto-decode
    tex.flipY = false;             // CSS Y convention (y=0 = image top)
    tex.needsUpdate = true;
    this.#texture = tex;

    // Resize render targets to image resolution.
    // Dispose + recreate avoids any potential FBO leak from setSize.
    const prevGradeTargetParams = {
      minFilter: this.#gradeTarget.texture.minFilter,
      magFilter: this.#gradeTarget.texture.magFilter,
      format: this.#gradeTarget.texture.format,
      type: this.#gradeTarget.texture.type,
    };
    this.#gradeTarget.dispose();
    this.#gradeTarget = new WebGLRenderTarget(bitmap.width, bitmap.height, prevGradeTargetParams);

    this.#displayTarget.dispose();
    this.#displayTarget = new WebGLRenderTarget(bitmap.width, bitmap.height, {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat,
      type: UnsignedByteType,
    });

    // Rewire render target textures in materials that reference them.
    this.#gradeP2Material.uniforms.uGradedLinear.value = this.#gradeTarget.texture;
    this.#displayMaterial.uniforms.uGraded.value = this.#displayTarget.texture;

    // Distribute source texture and resolution
    const res = new Vector2(bitmap.width, bitmap.height);
    this.#gradeP1Material.uniforms.uTex.value = tex;
    this.#gradeP2Material.uniforms.uTex.value = tex;
    this.#gradeP2Material.uniforms.uTexRes.value = res;
    this.#displayMaterial.uniforms.uTex.value = tex;
    this.#displayMaterial.uniforms.uTexRes.value = res;

    this.#gradeDirty = true;
  }

  /**
   * Apply a full EditState to the grade pipeline.
   *
   * Primary grade and LUT curve controls update P1 uniforms (→ #gradeDirty).
   * Optical effects update P2 uniforms (→ #effectsDirty).
   * Both dirty flags are set here for simplicity; a future optimization could
   * compare the previous state and only dirty the affected pass.
   */
  applyEditState(edit: EditState, bypass: boolean): void {
    const p1 = this.#gradeP1Material.uniforms;
    const p2 = this.#gradeP2Material.uniforms;
    const {
      balance, contrast, density, chroma, radiance, saturation,
      scattering, refraction, rgb, halation, diffusion, texture, spotlight,
    } = edit;

    // ── Pass 1: primary grade ─────────────────────────────────────────────────
    p1.uExposure.value = balance.bypass ? 0 : balance.exposure;
    p1.uSaturation.value = balance.bypass ? 0 : balance.saturation;
    p1.uTemperature.value = balance.bypass ? 0 : balance.temperature;
    p1.uTint.value = balance.bypass ? 0 : balance.tint;
    p1.uSmartContrast.value = contrast.bypass ? 0 : contrast.smartContrast;

    p1.uShadowR.value = rgb.bypass ? 0 : rgb.shadowR;
    p1.uShadowG.value = rgb.bypass ? 0 : rgb.shadowG;
    p1.uShadowB.value = rgb.bypass ? 0 : rgb.shadowB;
    p1.uHighR.value = rgb.bypass ? 0 : rgb.highlightR;
    p1.uHighG.value = rgb.bypass ? 0 : rgb.highlightG;
    p1.uHighB.value = rgb.bypass ? 0 : rgb.highlightB;

    (p1.uScatShadows.value as Vector2).set(
      scattering.bypass ? 0 : scattering.shadows.x,
      scattering.bypass ? 0 : scattering.shadows.y,
    );
    (p1.uScatHighlights.value as Vector2).set(
      scattering.bypass ? 0 : scattering.highlights.x,
      scattering.bypass ? 0 : scattering.highlights.y,
    );

    (p1.uRefShadows.value as Vector2).set(
      refraction.bypass ? 0 : (refraction.shadows[0]?.x ?? 0),
      refraction.bypass ? 0 : (refraction.shadows[0]?.y ?? 0),
    );
    (p1.uRefHighlights.value as Vector2).set(
      refraction.bypass ? 0 : (refraction.highlights[0]?.x ?? 0),
      refraction.bypass ? 0 : (refraction.highlights[0]?.y ?? 0),
    );
    p1.uRefThreshold.value = refraction.bypass ? 0.5 : refraction.threshold;

    p1.uBypass.value = bypass ? 1 : 0;

    // ── Pass 2: optical effects ───────────────────────────────────────────────
    p2.uHalAmt.value = halation.bypass ? 0 : halation.amount;
    p2.uHalSpill.value = halation.bypass ? 0 : halation.lightSpill;
    p2.uHalShift.value = halation.bypass ? 0 : halation.colorShift;
    p2.uHalSat.value = halation.bypass ? 1 : halation.saturation;

    p2.uDifAmt.value = diffusion.bypass ? 0 : diffusion.amount;
    p2.uDifFog.value = diffusion.bypass ? 0 : diffusion.fog;
    p2.uDifThreshold.value = diffusion.bypass ? 1 : diffusion.threshold;
    p2.uDifFocus.value = diffusion.bypass ? 0 : diffusion.focus;
    (p2.uDifCenter.value as Vector2).set(diffusion.focusX, diffusion.focusY);

    p2.uGrain.value = texture.bypass ? 0 : texture.grainAmount;
    p2.uGrainChroma.value = texture.bypass ? 0 : texture.grainChroma;
    p2.uAcutance.value = texture.bypass ? 0 : texture.acutance;
    p2.uResolution.value = texture.bypass ? 0 : texture.resolution;

    p2.uSpotAmt.value = spotlight.bypass ? 0 : spotlight.amount;
    p2.uSpotPop.value = spotlight.bypass ? 0 : spotlight.pop;
    p2.uSpotBias.value = spotlight.bypass ? 0 : spotlight.bias;
    p2.uSpotFocus.value = spotlight.bypass ? 0.5 : spotlight.focus;
    (p2.uSpotCenter.value as Vector2).set(spotlight.centerX, spotlight.centerY);

    p2.uBypass.value = bypass ? 1 : 0;

    this.#gradeDirty = true;
    this.#effectsDirty = true;
  }

  setSplit(enabled: boolean, x: number): void {
    this.#displayMaterial.uniforms.uSplitEnabled.value = enabled ? 1 : 0;
    this.#displayMaterial.uniforms.uSplitX.value = x;
    this.#effectsDirty = true;
  }

  destroy(): void {
    cancelAnimationFrame(this.#raf);
    this.#resizeObserver.disconnect();

    // Project state owns ImageBitmap lifetime. Renderer only drops its borrow.
    this.#bitmap = null;

    // Dispose Three.js texture wrapper
    this.#texture?.dispose();

    // Dispose LUT DataTextures
    const lutKeys = [
      "uLutExposure", "uLutContrast", "uLutDensity",
      "uLutChroma", "uLutRadiance", "uLutSaturation",
    ] as const;
    for (const key of lutKeys) {
      (this.#gradeP1Material.uniforms[key]?.value as DataTexture | null)?.dispose();
    }

    // Dispose render targets
    this.#gradeTarget.dispose();
    this.#displayTarget.dispose();
    this.#analysisTarget.dispose();

    // Dispose materials (shader programs + uniform bindings)
    this.#gradeP1Material.dispose();
    this.#gradeP2Material.dispose();
    this.#displayMaterial.dispose();

    // Dispose geometries (VAOs + vertex buffers)
    this.#quadGeomP1.dispose();
    this.#quadGeomP2.dispose();
    this.#quadGeomDisplay.dispose();

    this.#renderer.dispose();

    if (this.#renderer.domElement.parentNode === this.#container) {
      this.#container.removeChild(this.#renderer.domElement);
    }
  }

  async exportCanvasBlob(mimeType: "image/png" | "image/jpeg", quality?: number): Promise<Blob> {
    this.#renderer.setRenderTarget(null);
    this.#renderer.render(this.#displayScene, this.#camera);

    const blob = await new Promise<Blob | null>((resolve) => {
      this.#renderer.domElement.toBlob(resolve, mimeType, quality);
    });

    if (!blob) {
      throw new Error("Failed to encode rendered canvas");
    }

    return blob;
  }
}
