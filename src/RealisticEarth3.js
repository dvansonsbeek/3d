/* ---------------------------------------------------------------------------
   RealisticEarth.js  –  Three.js r175  •  ES-modules  •  June 2025
   ---------------------------------------------------------------------------
   Requires:
     three                       (already imported elsewhere)
     three/examples/jsm/utils/BufferGeometryUtils.js
   ------------------------------------------------------------------------- */
import * as THREE from "https://esm.sh/three";
import { computeTangents } from
  "https://esm.sh/three/examples/jsm/utils/BufferGeometryUtils.js";

/* ╭──────────────────────────── helper scratch vectors ───────────────────╮ */
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
/* ╰────────────────────────────────────────────────────────────────────────╯ */

export class RealisticEarth {

  constructor({
    radius         = 0.0852704,
    segments       = 128,
    dayMap,
    nightMap,
    normalMap,
    specMap,
    cloudMap       = null,
    normalStrength = 5.0
  } = {}) {

    /* ── 1. geometry (with tangents for the normal-map) ───────────────── */
    const geom = new THREE.SphereGeometry(radius, segments, segments);
    computeTangents(geom);

    /* ── 2. textures ──────────────────────────────────────────────────── */
    const TL = new THREE.TextureLoader();
    const tex = {
      day   : TL.load(dayMap),
      night : TL.load(nightMap),
      norm  : TL.load(normalMap),
      spec  : TL.load(specMap),
      cloud : cloudMap ? TL.load(cloudMap) : null
    };
    Object.values(tex).forEach(t => { if (t) t.colorSpace = THREE.SRGBColorSpace; });

    /* ── 3. shared uniforms ───────────────────────────────────────────── */
    const U = {
      u_dayTexture     : { value: tex.day   },
      u_nightTexture   : { value: tex.night },
      u_normalTexture  : { value: tex.norm  },
      u_specTexture    : { value: tex.spec  },
      u_cloudTexture   : { value: tex.cloud },
      u_normalPower    : { value: normalStrength },
      u_sunRelPosition : { value: new THREE.Vector3() },
      u_position       : { value: new THREE.Vector3() },
      /* eclipse placeholders (safe defaults) */
      u_moonPosition   : { value: new THREE.Vector3() },
      u_moonRadius     : { value: 1e-6 },
      u_sunRadius      : { value: 1e-6 }
    };

    /* ── 4. core material (day/night, mountains, specular, clouds) ────── */
    const earthMat = new THREE.ShaderMaterial({
      uniforms      : U,
      vertexShader  : RealisticEarth.vert,
      fragmentShader: RealisticEarth.frag
    });

    /* ── 5. atmosphere & Fresnel shells ───────────────────────────────── */
    const atmosphere = RealisticEarth.#makeShell(radius*1.05, segments,
                           RealisticEarth.atmoFrag, U);
    const rim        = RealisticEarth.#makeShell(radius*1.0001, segments,
                           RealisticEarth.fresnelFrag, U, THREE.FrontSide);

    /* ── 6. assemble local graph ──────────────────────────────────────── */
    this.core      = new THREE.Mesh(geom, earthMat);
    this.core.add(atmosphere, rim);

    this.object3D  = new THREE.Object3D();
    this.object3D.add(this.core);

    U.u_position.value.copy(this.core.position);   // constant per instance
    this._U = U;                                   // expose for GUI tweaks
  }

  /** Call once per frame to feed the light direction into the shaders. */
  updateSunDir(sunObj){
    sunObj.getWorldPosition(_v1);
    this.core.getWorldPosition(_v2);
    _v3.subVectors(_v1, _v2);
    this._U.u_sunRelPosition.value.copy(_v3);
  }

  /* ───────────────────── internal helper to build a shell ────────────── */
  static #makeShell(r, seg, fragSrc, sharedU, whichSide = THREE.BackSide){
    const g = new THREE.SphereGeometry(r, seg, seg);
    return new THREE.Mesh(
      g,
      new THREE.ShaderMaterial({
        uniforms      : { u_sunRelPosition: sharedU.u_sunRelPosition,
                          u_color: { value: new THREE.Color(0x75aaff) } },
        vertexShader  : RealisticEarth.addonVert,
        fragmentShader: fragSrc,
        side          : whichSide,
        transparent   : true,
        depthWrite    : false
      })
    );
  }

  /* ──────────────────────────── GLSL sources ─────────────────────────── */
  /* main vertex shader (needs attribute `tangent`) */
  static vert = `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying mat3 vTbn;
attribute vec4 tangent;           // geometry.computeTangents()

void main(){
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix)*normal);
    vPosition = mat3(modelMatrix)*position;
    gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);

    vec3 t = normalize(tangent.xyz);
    vec3 n = normalize(normal.xyz);
    vec3 b = normalize(cross(t,n));
    t = mat3(modelMatrix)*t;
    b = mat3(modelMatrix)*b;
    n = mat3(modelMatrix)*n;
    vTbn = mat3(t,b,n);
}`;

/* fragment shader – full text from Sangil Lee’s article */  /* :contentReference[oaicite:0]{index=0} */
  static frag = `uniform sampler2D u_dayTexture;
uniform sampler2D u_nightTexture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_specTexture;
uniform sampler2D u_cloudTexture;
uniform vec3  u_sunRelPosition;
uniform float u_normalPower;
uniform vec3  u_position;
uniform vec3  u_moonPosition;
uniform float u_moonRadius;
uniform float u_sunRadius;
varying mat3  vTbn;
varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vPosition;
#define PI 3.141592

float eclipse(float angleBtw, float angleLight, float angleObs){
    float k = pow(angleObs/angleLight,2.0);
    float v;
    if(angleBtw>angleLight-angleObs&&angleBtw<angleLight+angleObs){
        if(angleBtw<angleObs-angleLight){
            v = 0.0;
        }else{
            float x = 0.5/angleBtw*(angleBtw*angleBtw+angleLight*angleLight-angleObs*angleObs);
            float ths = acos(x/angleLight);
            float thm = acos((angleBtw-x)/angleObs);
            v = 1.0/PI*(PI-ths+0.5*sin(2.0*ths)-thm*k+0.5*k*sin(2.0*thm));
        }
    }else if(angleBtw>angleLight+angleObs){
        v = 1.0;
    }else{
        v = 1.0 - k;
    }
    return clamp(v,0.0,1.0);
}

void main(){
    vec3 sunDir = normalize(u_sunRelPosition);

    /* 1. day & night --------------------------------------------------- */
    vec3 dayColor   = texture2D(u_dayTexture,   vUv).rgb;
    vec3 nightColor = texture2D(u_nightTexture, vUv).rgb;
    float cosNga    = dot(vNormal, sunDir);
    float mixTex    = 1.0 / (1.0 + exp(-20.0*cosNga));
    float mixHem    = mixTex;

    /* 2. eclipse ------------------------------------------------------- */
    vec3 surfacePos = u_position + vPosition;
    float dSun      = length(u_sunRelPosition);
    float cosSM     = dot(sunDir, normalize(u_moonPosition-surfacePos));
    float angSM     = acos(cosSM);
    float dMoon     = length(u_moonPosition-surfacePos);
    mixHem *= eclipse(angSM, asin(u_sunRadius/dSun), asin(u_moonRadius/dMoon));

    /* 3. normal-map mountain shadow ----------------------------------- */
    vec3 tNorm  = texture2D(u_normalTexture, vUv).xyz*2.0-1.0;
    vec3 normal = normalize(vTbn*tNorm);
    float cosSurf = dot(normal, sunDir);
    mixTex *= 1.0 + u_normalPower*(cosSurf - cosNga);
    mixTex *= mixHem;
    mixTex  = clamp(mixTex,0.0,1.0);

    /* 4. cloud shadow -------------------------------------------------- */
    vec3 transVec   = 0.0005*inverse(vTbn)*(vNormal - sunDir);
    vec4 cloudSh    = texture2D(u_cloudTexture, vUv - transVec.xy);
    mixTex *= (1.0 - 0.5*cloudSh.a);

    /* 5. base colour --------------------------------------------------- */
    vec3 color = mix(nightColor, dayColor, mixTex);

    /* 6. ocean specular ------------------------------------------------ */
    float reflR = texture2D(u_specTexture, vUv).r;
    reflR = 0.3*reflR + 0.1;
    vec3 reflVec = reflect(-sunDir, normal);
    float specP  = clamp(dot(reflVec, normalize(cameraPosition-surfacePos)),0.0,1.0);
    color += mixTex * pow(specP,2.0) * reflR;

    /* 7. clouds (RGBA) ------------------------------------------------- */
    vec4 clouds = texture2D(u_cloudTexture, vUv);
    clouds.r *= clamp(mixHem,0.2,1.0);
    clouds.g *= clamp(pow(mixHem,1.5),0.2,1.0);
    clouds.b *= clamp(pow(mixHem,2.0),0.2,1.0);
    clouds.a *= clamp(mixHem,0.1,1.0);
    color = color*(1.0-clouds.a) + clouds.rgb*clouds.a;

    gl_FragColor = vec4(color,1.0);
}`;

/* add-on vertex shader for shells */  /* :contentReference[oaicite:1]{index=1} */
  static addonVert = `varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vNormalView;
varying vec3 vPosition;
void main(){
    vUv = uv;
    vNormal = normalize(mat3(modelMatrix)*normal);
    vNormalView = normalize(normalMatrix*normal);
    vPosition = normalize(vec3(modelViewMatrix*vec4(position,1.0)));
    gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

/* atmosphere fragment */  /* :contentReference[oaicite:2]{index=2} */
  static atmoFrag = `uniform vec3 u_sunRelPosition;
uniform vec3 u_color;
varying vec3 vNormal;
varying vec3 vNormalView;
varying vec3 vPosition;
void main(){
    vec3 sunDir = normalize(u_sunRelPosition);
    float cosA  = dot(vNormal, sunDir);
    float mixV  = 1.0 / (1.0 + exp(-7.0*(cosA+0.1)));
    float rawI  = 3.0*max(dot(vPosition, vNormalView),0.0);
    float I     = pow(rawI,3.0);
    gl_FragColor = vec4(u_color, I) * mixV;
}`;

/* Fresnel rim fragment */  /* :contentReference[oaicite:3]{index=3} */
  static fresnelFrag = `uniform vec3 u_sunRelPosition;
uniform vec3 u_color;
varying vec3 vNormal;
varying vec3 vNormalView;
varying vec3 vPosition;
void main(){
    vec3 sunDir = normalize(u_sunRelPosition);
    float cosA  = dot(vNormal, sunDir);
    float mixV  = 1.0 / (1.0 + exp(-7.0*(cosA+0.1)));
    float fTerm = pow(1.0 + dot(normalize(vPosition), normalize(vNormalView)),2.0);
    gl_FragColor = vec4(u_color,1.0) * fTerm * mixV;
}`;
}
