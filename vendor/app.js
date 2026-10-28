import {
  WebGLRenderer, Scene, PerspectiveCamera,
  HemisphereLight, DirectionalLight, PointLight,
  Mesh, Group,
  BoxGeometry, SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, CircleGeometry, PlaneGeometry,
  MeshLambertMaterial, MeshBasicMaterial,
  CanvasTexture, SRGBColorSpace, RepeatWrapping, DoubleSide,
  Raycaster, Vector2, Vector3, Box3,
} from "./three.module.min.js";

const TOTAL = 100;
const GRAV = 10;
const BALL_M = 1;
const RAMP_H = 4;
const THETA = 28 * Math.PI / 180;
const MU = 0.18;
const RAMP_LEN = RAMP_H / Math.sin(THETA);
const LIFT_KEEP = 0.88;
const SPRING_K = 80;
const SPRING_M = 2;
const SPRING_C = 2.5;
const SPRING_XMAX = 0.6;
const LAMP_W = 5;
const SPR_VIS = 1.15;

const RA = { x: -0.84, y: 0.2 };
const RB = { x: 0.8, y: 0.96 };

const COPY = {
  en: {
    title: "Every Joule",
    intro: "Lift the ball, stretch the spring, switch on the lamp. Joules move between stores. The plaque total stays put.",
    hint: "Drag the red ball or the wood block. Tap the switch. Tap the brass disc to set the bench back.",
    model: "Model bench. g = 10 N/kg. Ball 1 kg, ramp height 4 m. Spring 80 N/m. Lamp 5 J each second, all of it ending as thermal. About a tenth of each lift is wasted as heat.",
    lang: "中文",
    next: "Next",
    done: "That's the four checks. The plaque total never moved.",
    fuel: "fuel empty",
    stores: ["Kinetic", "Gravitational", "Elastic", "Thermal", "Chemical", "Nuclear", "Magnetic", "Electrostatic"],
    plaque: { fuel: "fuel", heat: "heat", grav: "grav", spring: "spring", motion: "motion" },
  },
  zh: {
    title: "每一焦耳",
    intro: "举起小球、拉开弹簧、打开台灯。焦耳在各个储存之间转移，铭牌上的总量不变。",
    hint: "拖动红球或木块，点按开关。点按黄铜圆片可把实验台复原。",
    model: "模型实验台。g = 10 N/kg。球 1 kg，坡高 4 m。弹簧 80 N/m。灯每秒 5 J，全部进入热能。每次举起大约有十分之一变成热能。",
    lang: "EN",
    next: "下一题",
    done: "四题都看过了。铭牌上的总量始终没变。",
    fuel: "燃料用尽",
    stores: ["动能", "重力势能", "弹性势能", "热能", "化学能", "核能", "磁能", "静电能"],
    plaque: { fuel: "化学", heat: "热", grav: "重力", spring: "弹性", motion: "动" },
  },
};

const QUIZ = [
  {
    q: {
      en: "You hold the ball at the top. Those joules mostly came from which store?",
      zh: "你把小球停在坡顶。这些焦耳主要来自哪个储存？",
    },
    opts: [
      { en: "Thermal energy in the wood", zh: "木头里的热能", ok: false },
      { en: "Chemical energy in your muscles", zh: "肌肉里的化学能", ok: true },
      { en: "They were created by the lift", zh: "是举起这个动作新造出来的", ok: false },
    ],
    note: {
      en: "A lift does not create joules. It moves them out of a chemical store. The plaque total stays put, and a little of the effort becomes thermal.",
      zh: "举起不会创造焦耳，只是把它们从化学能储存里搬出来。铭牌总量不变，还有一小部分变成热能。",
    },
  },
  {
    q: {
      en: "The ball rolls down and stops. Which store has gained the most?",
      zh: "小球滚下去并停住。哪个储存增加得最多？",
    },
    opts: [
      { en: "Kinetic — it was moving", zh: "动能——因为它动过", ok: false },
      { en: "Gravitational — it went downhill", zh: "重力势能——因为它往下走", ok: false },
      { en: "Thermal — friction and the stop", zh: "热能——摩擦和最后停下", ok: true },
    ],
    note: {
      en: "Kinetic energy rises on the way down, then the stop turns it into thermal energy. A resting ball stores none of it as kinetic.",
      zh: "下行时动能变大，停下后又变成热能。静止的小球不再把这份能量存在动能里。",
    },
  },
  {
    q: {
      en: "The block passes the spring's rest point, so the elastic store is nearly empty. Where are those joules?",
      zh: "木块经过弹簧原长，弹性势能几乎为零。那些焦耳在哪里？",
    },
    opts: [
      { en: "Mostly kinetic", zh: "大部分是动能", ok: true },
      { en: "They have vanished", zh: "已经消失了", ok: false },
      { en: "Back in the chemical store", zh: "回到了化学能储存", ok: false },
    ],
    note: {
      en: "At the middle of a bounce the block is fastest. Damping later hands that kinetic store to thermal.",
      zh: "经过中点时木块最快。之后阻尼把这份动能交给热能。",
    },
  },
  {
    q: {
      en: "The lamp is bright, but light is not a store. When the cell is flat, where have the joules finished?",
      zh: "灯很亮，但光不是储存。电池用尽时，焦耳最终去了哪里？",
    },
    opts: [
      { en: "They left with the light and are gone", zh: "随光线离开，没有了", ok: false },
      { en: "In the thermal store", zh: "到了热能储存", ok: true },
      { en: "In the nuclear store", zh: "到了核能储存", ok: false },
    ],
    note: {
      en: "Radiation is a pathway. The glow is absorbed and ends as thermal energy. Nuclear, magnetic and electrostatic stay empty on this bench.",
      zh: "辐射是转移途径。光被吸收后变成热能。这张实验台上，核能、磁能和静电能保持为空。",
    },
  },
];

const STORE_KEYS = ["kinetic", "grav", "elastic", "thermal", "chemical", "nuclear", "magnetic", "electro"];
const STORE_HEX = ["#e0a31a", "#2f74a0", "#2f8a62", "#e25a2b", "#6b4c9a", "#b9a6d6", "#7e97a0", "#d4b43a"];
const STORE_NUM = [0xe0a31a, 0x2f74a0, 0x2f8a62, 0xe25a2b, 0x6b4c9a, 0xb9a6d6, 0x7e97a0, 0xd4b43a];

const LAYOUT = {
  stack: {
    ramp: { x: 0, y: 0.72, z: 0, s: 1 },
    spring: { x: 0, y: -0.28, z: 0.06, s: 1 },
    lamp: { x: -0.15, y: -1.12, z: 0.02, s: 0.96 },
    reset: { x: 0.92, y: -1.08, z: 0.16, s: 0.96 },
    jars: { x: 0, y: 2.5, z: -0.02, s: 1, cols: 4 },
    plaque: { x: 0, y: 2.02, z: 0.24, w: 2.2, h: 0.4 },
    sign: { x: 0, y: 3.98, z: 0.06, w: 1.95, h: 0.4 },
    plant: { x: -1.05, y: -1.05, z: 0.02, s: 0.92 },
  },
  row: {
    ramp: { x: -1.12, y: 0.2, z: 0, s: 0.72 },
    spring: { x: 0.2, y: 0.2, z: 0.06, s: 0.72 },
    lamp: { x: 1.32, y: 0.14, z: 0, s: 0.68 },
    reset: { x: 1.38, y: -1.32, z: 0.16, s: 0.62 },
    jars: { x: 0, y: 1.58, z: -0.02, s: 0.6, cols: 8 },
    plaque: { x: 0, y: -1.32, z: 0.28, w: 2.15, h: 0.4 },
    sign: { x: 0, y: 2.48, z: 0.04, w: 2.05, h: 0.4 },
    plant: { x: -1.42, y: -1.22, z: 0, s: 0.62 },
  },
};

const canvas = document.getElementById("stage");
const notes = document.getElementById("notes");
const quizEl = document.getElementById("quiz");
const readoutEl = document.getElementById("readout");

let lang = "en";
let qi = 0;
let picked = -1;
let actx = null;

const S = {
  kinetic: 0, grav: 0, elastic: 0, thermal: 20, chemical: 80,
  nuclear: 0, magnetic: 0, electro: 0,
};
const ball = { u: 0, v: 0, knock: false, armed: true };
const spring = { x: 0, v: 0 };
const lamp = { on: false };
const hold = { ball: false, spring: false };
let flash = "";
let flashUntil = 0;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function audio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!actx) actx = new AC();
  if (actx.state === "suspended") actx.resume();
  return actx;
}

function tone(freq, dur, type, gain) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || "sine";
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(Math.max(0.0001, gain || 0.03), t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function payUp(increase) {
  if (!(increase > 1e-5)) return 0;
  const cost = increase / LIFT_KEEP;
  if (cost <= S.chemical + 1e-8) {
    S.chemical -= cost;
    S.thermal += cost;
    return increase;
  }
  const gained = S.chemical * LIFT_KEEP;
  S.thermal += S.chemical;
  S.chemical = 0;
  if (increase - gained > 0.2) {
    flash = COPY[lang].fuel;
    flashUntil = performance.now() + 1300;
  }
  return gained;
}

function setBallU(newU) {
  const oldE = BALL_M * GRAV * RAMP_H * ball.u;
  const want = clamp(newU, 0, 1);
  const desired = BALL_M * GRAV * RAMP_H * want;
  const d = desired - oldE;
  if (d > 0) {
    const gained = payUp(d);
    ball.u = (oldE + gained) / (BALL_M * GRAV * RAMP_H);
  } else {
    ball.u = want;
  }
  ball.v = 0;
}

function setSpringX(newX) {
  const oldE = 0.5 * SPRING_K * spring.x * spring.x;
  let x = clamp(newX, -SPRING_XMAX, SPRING_XMAX);
  const desired = 0.5 * SPRING_K * x * x;
  const d = desired - oldE;
  if (d > 0) {
    const gained = payUp(d);
    const mag = Math.sqrt(Math.max(0, (2 * (oldE + gained)) / SPRING_K));
    x = newX < 0 ? -mag : mag;
  }
  spring.x = x;
  spring.v = 0;
}

function fixTotal() {
  const keys = ["kinetic", "grav", "elastic", "chemical", "nuclear", "magnetic", "electro"];
  let rest = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!(S[k] > 0)) S[k] = 0;
    rest += S[k];
  }
  if (rest > TOTAL) {
    const scale = TOTAL / rest;
    for (let i = 0; i < keys.length; i++) S[keys[i]] *= scale;
    S.thermal = 0;
  } else {
    S.thermal = TOTAL - rest;
  }
}

function sync() {
  const g = BALL_M * GRAV * RAMP_H * ball.u;
  const e = 0.5 * SPRING_K * spring.x * spring.x;
  const k = 0.5 * BALL_M * ball.v * ball.v + 0.5 * SPRING_M * spring.v * spring.v;
  const prev = S.grav + S.elastic + S.kinetic;
  S.grav = g;
  S.elastic = e;
  S.kinetic = k;
  S.thermal += prev - (g + e + k);
  fixTotal();
}

function stepBall(dt) {
  if (ball.u <= 0 && ball.v <= 0) {
    ball.u = 0;
    ball.v = 0;
    return;
  }
  const pull = -GRAV * Math.sin(THETA);
  const fr = MU * GRAV * Math.cos(THETA);
  const dir = Math.abs(ball.v) > 0.03 ? Math.sign(ball.v) : -1;
  const a = pull - dir * fr;
  const vBefore = ball.v;
  ball.v += a * dt;
  ball.u += (ball.v * dt) / RAMP_LEN;
  if (ball.u <= 0) {
    if (vBefore < -0.45 && ball.armed) {
      ball.armed = false;
      ball.knock = true;
    }
    ball.u = 0;
    ball.v = 0;
  } else if (ball.u >= 1) {
    ball.u = 1;
    if (ball.v > 0) ball.v = 0;
  } else if (ball.u > 0.06) {
    ball.armed = true;
  }
}

function stepSpring(dt) {
  const a = (-SPRING_K * spring.x - SPRING_C * spring.v) / SPRING_M;
  spring.v += a * dt;
  spring.x += spring.v * dt;
  if (spring.x > SPRING_XMAX) {
    spring.x = SPRING_XMAX;
    if (spring.v > 0) spring.v = 0;
  } else if (spring.x < -SPRING_XMAX) {
    spring.x = -SPRING_XMAX;
    if (spring.v < 0) spring.v = 0;
  }
}

function tickLamp(dt) {
  if (!lamp.on) return;
  const draw = Math.min(S.chemical, LAMP_W * dt);
  S.chemical -= draw;
  S.thermal += draw;
  if (S.chemical <= 0.08) {
    lamp.on = false;
    tone(180, 0.08, "sine", 0.03);
  }
}

let acc = 0;
function simulate(dt) {
  acc += Math.min(0.05, Math.max(0, dt));
  const h = 1 / 120;
  let n = 0;
  while (acc >= h && n < 8) {
    acc -= h;
    n += 1;
    if (!hold.ball) stepBall(h);
    if (!hold.spring) stepSpring(h);
    tickLamp(h);
  }
  if (n === 8) acc = 0;
  sync();
  if (ball.knock) {
    ball.knock = false;
    tone(96, 0.12, "sine", 0.05);
  }
}

function resetBench() {
  hold.ball = false;
  hold.spring = false;
  ball.u = 0;
  ball.v = 0;
  ball.armed = true;
  spring.x = 0;
  spring.v = 0;
  lamp.on = false;
  S.kinetic = 0;
  S.grav = 0;
  S.elastic = 0;
  S.thermal = 20;
  S.chemical = 80;
  S.nuclear = 0;
  S.magnetic = 0;
  S.electro = 0;
  flash = "";
  tone(330, 0.07, "triangle", 0.03);
  tone(494, 0.1, "triangle", 0.03);
}

function nudgeBall() {
  if (ball.u < 0.08 && Math.abs(ball.v) < 0.25) setBallU(0.28);
}

function pluck() {
  if (Math.abs(spring.v) > 1.2) return;
  if (spring.x < 0.28) setSpringX(0.42);
}

function paint(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return { canvas: c, ctx: c.getContext("2d"), tex };
}

function woodTex() {
  const p = paint(128, 128, (g, w, h) => {
    g.fillStyle = "#c4844a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      g.strokeStyle = "rgba(90,48,18," + (0.06 + (i % 3) * 0.03) + ")";
      g.lineWidth = 1 + (i % 2);
      g.beginPath();
      const y = (i + 0.5) * (h / 16);
      g.moveTo(0, y);
      g.bezierCurveTo(36, y + 5, 80, y - 4, 128, y + 2);
      g.stroke();
    }
  });
  p.tex.wrapS = RepeatWrapping;
  p.tex.wrapT = RepeatWrapping;
  p.tex.repeat.set(2, 2);
  return p.tex;
}

function wallTex() {
  return paint(256, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, "#f7ecdc");
    grd.addColorStop(1, "#ead4b8");
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(150,110,70,0.15)";
    g.lineWidth = 3;
    for (let x = 32; x < w; x += 64) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, h);
      g.stroke();
    }
  }).tex;
}

function iconTex(i) {
  return paint(64, 64, (g) => {
    g.clearRect(0, 0, 64, 64);
    g.strokeStyle = "#4a301c";
    g.fillStyle = "#4a301c";
    g.lineWidth = 3;
    g.lineCap = "round";
    g.lineJoin = "round";
    if (i === 0) {
      g.beginPath();
      g.arc(30, 34, 10, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(44, 22);
      g.lineTo(54, 18);
      g.moveTo(46, 32);
      g.lineTo(58, 32);
      g.stroke();
    } else if (i === 1) {
      g.beginPath();
      g.moveTo(8, 50);
      g.lineTo(32, 16);
      g.lineTo(56, 50);
      g.stroke();
      g.beginPath();
      g.arc(32, 28, 4, 0, Math.PI * 2);
      g.fill();
    } else if (i === 2) {
      g.beginPath();
      g.moveTo(8, 32);
      for (let k = 0; k < 4; k++) g.lineTo(14 + k * 12, k % 2 ? 18 : 46);
      g.lineTo(56, 32);
      g.stroke();
    } else if (i === 3) {
      g.beginPath();
      g.moveTo(32, 10);
      g.bezierCurveTo(48, 24, 50, 40, 32, 54);
      g.bezierCurveTo(14, 40, 16, 24, 32, 10);
      g.fill();
    } else if (i === 4) {
      g.beginPath();
      g.moveTo(24, 14);
      g.lineTo(40, 14);
      g.lineTo(38, 24);
      g.lineTo(48, 50);
      g.lineTo(16, 50);
      g.lineTo(26, 24);
      g.closePath();
      g.stroke();
    } else if (i === 5) {
      g.beginPath();
      g.arc(32, 32, 16, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(32, 32, 16, 6, 0.6, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.ellipse(32, 32, 16, 6, -0.6, 0, Math.PI * 2);
      g.stroke();
    } else if (i === 6) {
      g.beginPath();
      g.arc(32, 30, 14, Math.PI, 0);
      g.stroke();
      g.beginPath();
      g.moveTo(18, 30);
      g.lineTo(18, 48);
      g.moveTo(46, 30);
      g.lineTo(46, 48);
      g.stroke();
    } else {
      g.beginPath();
      g.moveTo(36, 8);
      g.lineTo(18, 34);
      g.lineTo(30, 34);
      g.lineTo(26, 56);
      g.lineTo(48, 28);
      g.lineTo(34, 28);
      g.closePath();
      g.fill();
    }
  }).tex;
}

function arrowTex() {
  return paint(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.strokeStyle = "#6a4318";
    g.fillStyle = "#6a4318";
    g.lineWidth = 12;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.arc(64, 64, 36, 0.9, Math.PI * 2.15);
    g.stroke();
    g.beginPath();
    g.moveTo(96, 22);
    g.lineTo(112, 48);
    g.lineTo(78, 40);
    g.closePath();
    g.fill();
  }).tex;
}

const plaquePaint = paint(640, 180, () => {});
const signPaint = paint(640, 160, (g, w, h) => {
  g.fillStyle = "#f4e2c4";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#8a542c";
  g.lineWidth = 10;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = "#4a3018";
  g.font = "700 54px sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("Every Joule", w / 2, 58);
  g.font = "600 36px \"Noto Sans CJK SC\", sans-serif";
  g.fillText("每一焦耳", w / 2, 112);
});

let plaqueKey = "";
function updatePlaque(now) {
  const L = COPY[lang].plaque;
  const num = (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1));
  const bitN = (name, v) => (v >= 0.15 ? name + " " + num(v) : "");
  let sub = [bitN(L.fuel, S.chemical), bitN(L.heat, S.thermal), bitN(L.grav, S.grav), bitN(L.spring, S.elastic), bitN(L.motion, S.kinetic)].filter(Boolean).join(" · ");
  if (now < flashUntil) sub = flash;
  const key = lang + "|" + sub;
  if (key === plaqueKey) return;
  plaqueKey = key;
  const g = plaquePaint.ctx;
  const w = 640;
  const h = 180;
  g.clearRect(0, 0, w, h);
  g.fillStyle = "#f7edd8";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#8a542c";
  g.lineWidth = 12;
  g.strokeRect(8, 8, w - 16, h - 16);
  g.fillStyle = "#4a3018";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 68px sans-serif";
  g.fillText("100 J", w / 2, sub ? 64 : 90);
  if (sub) {
    let size = 30;
    g.font = "600 " + size + "px \"Noto Sans CJK SC\", sans-serif";
    while (size > 14 && g.measureText(sub).width > w - 40) {
      size -= 1;
      g.font = "600 " + size + "px \"Noto Sans CJK SC\", sans-serif";
    }
    g.fillText(sub, w / 2, 128);
  }
  plaquePaint.tex.needsUpdate = true;
}

function softGL() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl", { antialias: false });
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "";
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return /swiftshader|llvmpipe|software/i.test(name);
  } catch (err) {
    return false;
  }
}

const dprCap = softGL() ? 1 : 1.35;
const renderer = new WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
  stencil: false,
});
renderer.setClearColor(0xf3e6d2, 1);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = 0;

const scene = new Scene();
const camera = new PerspectiveCamera(32, 1, 0.08, 80);
const world = new Group();
scene.add(world);

scene.add(new HemisphereLight(0xfff6ea, 0xc4a07a, 0.95));
const sun = new DirectionalLight(0xfff7ee, 1.2);
sun.position.set(3.2, 6.4, 5);
scene.add(sun);

const wood = new MeshLambertMaterial({ map: woodTex(), color: 0xffffff });
const woodDark = new MeshLambertMaterial({ color: 0x8a542c });
const cream = new MeshLambertMaterial({ color: 0xf4efe6 });
const ballMat = new MeshLambertMaterial({ color: 0xd94b3a });
const bandMat = new MeshLambertMaterial({ color: 0xf3e0c4 });
const coilMat = new MeshLambertMaterial({ color: 0xc86a32 });
const shadeMat = new MeshLambertMaterial({ color: 0xf2d36b, emissive: 0xf2d36b, emissiveIntensity: 0.08 });
const bulbMat = new MeshLambertMaterial({ color: 0xfff4d2, emissive: 0xffe7b0, emissiveIntensity: 0.25 });
const baseMat = new MeshLambertMaterial({ color: 0x2f5f73 });
const brass = new MeshLambertMaterial({ color: 0xe0b15a });
const leafMat = new MeshLambertMaterial({ color: 0x3f7d45 });
const potMat = new MeshLambertMaterial({ color: 0xb64b3a });
const glassSkip = new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

function addMesh(geo, material, parent, x, y, z) {
  const m = new Mesh(geo, material);
  m.position.set(x || 0, y || 0, z || 0);
  parent.add(m);
  return m;
}

const wall = addMesh(new PlaneGeometry(1, 1), new MeshLambertMaterial({ map: wallTex() }), world, 0, 1.2, -0.7);
wall.scale.set(14, 14, 1);
wall.userData.skip = true;
wall.visible = false;

const shelfGeo = new BoxGeometry(1, 0.1, 0.62);
function shelf(parent, w, y) {
  const m = addMesh(shelfGeo, wood, parent, 0, y, 0);
  m.scale.set(w, 1, 1);
  return m;
}

const rampG = new Group();
const springG = new Group();
const lampG = new Group();
const resetG = new Group();
const jarRoot = new Group();
const plantG = new Group();
world.add(rampG, springG, lampG, resetG, jarRoot, plantG);

shelf(rampG, 2.05, 0);
const rampAngle = Math.atan2(RB.y - RA.y, RB.x - RA.x);
const rampLen = Math.hypot(RB.x - RA.x, RB.y - RA.y);
const deck = addMesh(new BoxGeometry(rampLen, 0.08, 0.34), woodDark, rampG, (RA.x + RB.x) / 2, (RA.y + RB.y) / 2 - 0.18, 0);
deck.rotation.z = rampAngle;
addMesh(new BoxGeometry(0.12, 0.16, 0.4), woodDark, rampG, RA.x - 0.08, RA.y - 0.1, 0);
const ballPivot = new Group();
rampG.add(ballPivot);
const ballMesh = addMesh(new SphereGeometry(0.16, 18, 12), ballMat, ballPivot, 0, 0, 0);
addMesh(new TorusGeometry(0.16, 0.028, 6, 14), bandMat, ballPivot, 0, 0, 0).rotation.x = Math.PI / 2;
const ballPad = addMesh(new SphereGeometry(0.32, 8, 6), glassSkip, ballPivot, 0, 0, 0);
ballPad.userData.kind = "ball";
ballPad.userData.skip = true;
const ballShadow = addMesh(new CircleGeometry(0.18, 12), new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false }), rampG, RA.x, 0.07, 0);
ballShadow.rotation.x = -Math.PI / 2;
ballShadow.userData.skip = true;
const rampPlane = addMesh(new PlaneGeometry(6, 4), glassSkip, rampG, 0, 0.4, -0.04);
rampPlane.userData.skip = true;

shelf(springG, 2.15, 0);
addMesh(new BoxGeometry(1.7, 0.05, 0.08), woodDark, springG, 0.05, 0.1, 0);
addMesh(new BoxGeometry(0.1, 0.28, 0.1), woodDark, springG, -0.95, 0.2, 0);
const coils = [];
const coilGeo = new TorusGeometry(0.11, 0.02, 6, 12);
for (let i = 0; i < 8; i++) {
  const c = addMesh(coilGeo, coilMat, springG, 0, 0.22, 0);
  c.rotation.y = 1.15;
  coils.push(c);
}
const block = addMesh(new BoxGeometry(0.3, 0.26, 0.26), wood, springG, 0, 0.24, 0);
const springPad = addMesh(new SphereGeometry(0.42, 8, 6), glassSkip, block, 0, 0, 0);
springPad.userData.kind = "spring";
springPad.userData.skip = true;
const springPlane = addMesh(new PlaneGeometry(6, 3), glassSkip, springG, 0, 0.3, -0.05);
springPlane.userData.skip = true;

shelf(lampG, 1.15, 0);
addMesh(new CylinderGeometry(0.24, 0.26, 0.08, 16), baseMat, lampG, 0, 0.1, 0);
addMesh(new CylinderGeometry(0.035, 0.04, 0.46, 10), baseMat, lampG, 0, 0.36, 0);
const shade = addMesh(new ConeGeometry(0.22, 0.26, 18, 1, true), shadeMat, lampG, 0, 0.66, 0);
shade.material.side = DoubleSide;
const bulb = addMesh(new SphereGeometry(0.07, 12, 10), bulbMat, lampG, 0, 0.52, 0);
const glow = new PointLight(0xffe1a8, 0, 3.2, 2);
glow.position.set(0, 0.55, 0.1);
lampG.add(glow);
const switchMesh = addMesh(new BoxGeometry(0.1, 0.16, 0.08), brass, lampG, 0.16, 0.16, 0.18);
const switchPad = addMesh(new SphereGeometry(0.28, 8, 6), glassSkip, lampG, 0.16, 0.18, 0.16);
switchPad.userData.kind = "switch";
switchPad.userData.skip = true;

shelf(resetG, 0.7, 0);
const disc = addMesh(new CylinderGeometry(0.16, 0.16, 0.04, 18), brass, resetG, 0, 0.22, 0.22);
disc.rotation.x = Math.PI / 2;
const arrow = addMesh(new CircleGeometry(0.11, 16), new MeshBasicMaterial({ map: arrowTex(), transparent: true, depthWrite: false }), resetG, 0, 0.22, 0.26);
const resetPad = addMesh(new SphereGeometry(0.28, 8, 6), glassSkip, resetG, 0, 0.22, 0.22);
resetPad.userData.kind = "reset";
resetPad.userData.skip = true;

const jarBodyGeo = new CylinderGeometry(0.115, 0.11, 0.46, 12);
const jarLiqGeo = new CylinderGeometry(0.1, 0.1, 1, 12);
const rimGeo = new TorusGeometry(0.112, 0.016, 6, 12);
const jars = [];
const jarBack = addMesh(new BoxGeometry(1, 1, 1), woodDark, jarRoot, 0, 0.3, -0.16);
for (let i = 0; i < 8; i++) {
  const g = new Group();
  jarRoot.add(g);
  addMesh(jarBodyGeo, cream, g, 0, 0.25, 0);
  const liquid = addMesh(jarLiqGeo, new MeshLambertMaterial({ color: STORE_NUM[i] }), g, 0, 0.02, 0.02);
  const rim = addMesh(rimGeo, brass, g, 0, 0.48, 0);
  rim.rotation.x = Math.PI / 2;
  const icon = addMesh(new PlaneGeometry(0.22, 0.22), new MeshBasicMaterial({ map: iconTex(i), transparent: true }), g, 0, -0.02, 0.16);
  jars.push({ g, liquid, icon });
}

const plaque = addMesh(new PlaneGeometry(1, 1), new MeshLambertMaterial({ map: plaquePaint.tex }), world, 0, 2, 0.2);
const sign = addMesh(new PlaneGeometry(1, 1), new MeshLambertMaterial({ map: signPaint.tex }), world, 0, 3.6, 0);

addMesh(new CylinderGeometry(0.12, 0.14, 0.16, 10), potMat, plantG, 0, 0.16, 0);
addMesh(new CylinderGeometry(0.03, 0.04, 0.34, 6), woodDark, plantG, 0, 0.36, 0);
addMesh(new SphereGeometry(0.16, 10, 8), leafMat, plantG, 0, 0.58, 0);
addMesh(new SphereGeometry(0.11, 8, 6), leafMat, plantG, 0.12, 0.5, 0.04);
addMesh(new SphereGeometry(0.1, 8, 6), leafMat, plantG, -0.1, 0.48, 0.02);

const pickList = [ballPad, springPad, switchPad, resetPad];
const raycaster = new Raycaster();
const ndc = new Vector2();
const tmp = new Vector3();

function placeJars(cols) {
  const gapX = cols === 8 ? 0.36 : 0.52;
  const gapY = 0.66;
  const rows = Math.ceil(8 / cols);
  for (let i = 0; i < 8; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    jars[i].g.position.set((c - (cols - 1) / 2) * gapX, (rows - 1 - r) * gapY, 0);
  }
  const w = (cols - 1) * gapX + 0.5;
  const h = (rows - 1) * gapY + 0.78;
  jarBack.scale.set(w, h, 0.08);
  jarBack.position.set(0, (rows - 1) * gapY * 0.45 + 0.2, -0.18);
}

function put(obj, p) {
  obj.position.set(p.x, p.y, p.z || 0);
  const s = p.s == null ? 1 : p.s;
  obj.scale.setScalar(s);
}

let mode = "";
function applyLayout(next) {
  mode = next;
  const L = LAYOUT[next];
  put(rampG, L.ramp);
  put(springG, L.spring);
  put(lampG, L.lamp);
  put(resetG, L.reset);
  put(jarRoot, L.jars);
  placeJars(L.jars.cols);
  put(plantG, L.plant);
  plaque.position.set(L.plaque.x, L.plaque.y, L.plaque.z);
  plaque.scale.set(L.plaque.w, L.plaque.h, 1);
  sign.position.set(L.sign.x, L.sign.y, L.sign.z);
  sign.scale.set(L.sign.w, L.sign.h, 1);
}

const boardMat = new MeshLambertMaterial({ color: 0xf4e6d0 });
const board = addMesh(new BoxGeometry(1, 1, 0.06), boardMat, world, 0, 0, -0.46);
const rim = addMesh(new BoxGeometry(1, 1, 0.05), woodDark, world, 0, 0, -0.52);
board.userData.board = true;
rim.userData.board = true;

function contentBox() {
  const box = new Box3();
  world.updateMatrixWorld(true);
  world.traverse((o) => {
    if (!o.isMesh || o.userData.skip || o.userData.board || !o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox.clone();
    b.applyMatrix4(o.matrixWorld);
    box.union(b);
  });
  return box;
}

function frameCamera() {
  world.rotation.y = 0;
  const box = contentBox();
  const aspect = Math.max(0.35, (canvas.clientWidth || 1) / Math.max(1, canvas.clientHeight || 1));
  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  let w = Math.max(0.4, (box.max.x - box.min.x) * 1.1);
  let h = Math.max(0.4, (box.max.y - box.min.y) * 1.08);
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  const fw = w + 0.18;
  const fh = h + 0.18;
  board.position.set(cx, cy, -0.46);
  board.scale.set(w, h, 1);
  rim.position.set(cx, cy, -0.52);
  rim.scale.set(fw, fh, 1);
  const fov = 32 * Math.PI / 180;
  const dist = (fh / 2) / Math.tan(fov / 2) * 1.018;
  camera.fov = 32;
  camera.aspect = aspect;
  camera.near = 0.05;
  camera.far = dist + 40;
  camera.position.set(cx, cy + dist * 0.012, dist);
  camera.lookAt(cx, cy, 0);
  camera.updateProjectionMatrix();
}

let viewW = 0;
let viewH = 0;
function resize() {
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  if (w < 2 || h < 2) return false;
  const next = h / w > 1.45 ? "stack" : "row";
  if (next !== mode) applyLayout(next);
  const pr = Math.min(window.devicePixelRatio || 1, dprCap);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  frameCamera();
  viewW = w;
  viewH = h;
  return true;
}

function rampPoint(u, target) {
  target.set(RA.x + (RB.x - RA.x) * u, RA.y + (RB.y - RA.y) * u, 0);
  return target;
}

function updateVisuals(now) {
  rampPoint(ball.u, ballPivot.position);
  ballShadow.position.x = ballPivot.position.x;
  ballShadow.position.z = 0.02;
  const left = -0.72;
  const right = spring.x * SPR_VIS - 0.18;
  block.position.x = spring.x * SPR_VIS;
  block.position.y = 0.24;
  for (let i = 0; i < coils.length; i++) {
    const t = i / (coils.length - 1);
    coils[i].position.x = left + (right - left) * t;
    coils[i].position.y = 0.22;
  }
  const jarH = 0.44;
  for (let i = 0; i < jars.length; i++) {
    const key = STORE_KEYS[i];
    const h = Math.max(0, S[key] / TOTAL) * jarH;
    const liquid = jars[i].liquid;
    liquid.visible = h > 0.01;
    liquid.scale.y = Math.max(h, 0.001);
    liquid.position.y = h * 0.5 + 0.02;
  }
  const lit = lamp.on ? 1 : 0;
  bulbMat.emissiveIntensity = 0.2 + lit * 1.35;
  shadeMat.emissiveIntensity = 0.05 + lit * 0.55;
  glow.intensity = lit ? 2.4 : 0;
  switchMesh.rotation.z = lamp.on ? -0.6 : 0.5;
  updatePlaque(now);
  updateReadout();
}

let readoutKey = "";
function updateReadout() {
  const parts = [lang];
  for (let i = 0; i < STORE_KEYS.length; i++) parts.push(S[STORE_KEYS[i]].toFixed(1));
  const key = parts.join("|");
  if (key === readoutKey) return;
  readoutKey = key;
  const rows = readoutEl.children;
  for (let i = 0; i < STORE_KEYS.length; i++) {
    const v = S[STORE_KEYS[i]];
    const row = rows[i];
    row.querySelector(".j").textContent = v.toFixed(1);
    row.querySelector("i").style.width = Math.max(0, Math.min(100, (v / TOTAL) * 100)) + "%";
  }
}

function buildReadout() {
  readoutEl.replaceChildren();
  for (let i = 0; i < STORE_KEYS.length; i++) {
    const row = document.createElement("div");
    row.className = "store";
    const nm = document.createElement("span");
    nm.className = "nm";
    const bar = document.createElement("span");
    bar.className = "bar";
    const fill = document.createElement("i");
    fill.style.background = STORE_HEX[i];
    bar.appendChild(fill);
    const j = document.createElement("span");
    j.className = "j";
    row.append(nm, bar, j);
    readoutEl.appendChild(row);
  }
  readoutKey = "";
}

function labelReadout() {
  const names = COPY[lang].stores;
  const rows = readoutEl.children;
  for (let i = 0; i < names.length; i++) rows[i].querySelector(".nm").textContent = names[i];
}

function renderQuiz(silent) {
  const pack = COPY[lang];
  const item = QUIZ[qi];
  quizEl.replaceChildren();
  const q = document.createElement("p");
  q.className = "q";
  q.textContent = (qi + 1) + " / 4  " + item.q[lang];
  quizEl.appendChild(q);
  item.opts.forEach((op, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "opt";
    b.textContent = op[lang];
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (picked >= 0) return;
      picked = idx;
      markQuiz(false);
    });
    quizEl.appendChild(b);
  });
  if (picked >= 0) markQuiz(true);
  if (!silent) return;
}

function markQuiz(already) {
  const item = QUIZ[qi];
  const buttons = quizEl.querySelectorAll("button.opt");
  buttons.forEach((b, idx) => {
    if (item.opts[idx].ok) b.classList.add("good");
    else if (idx === picked) b.classList.add("bad");
    b.disabled = true;
  });
  if (!quizEl.querySelector(".note")) {
    const note = document.createElement("p");
    note.className = "note";
    note.textContent = item.note[lang];
    quizEl.appendChild(note);
    const pack = COPY[lang];
    if (qi < QUIZ.length - 1) {
      const n = document.createElement("button");
      n.type = "button";
      n.className = "next";
      n.textContent = pack.next;
      n.addEventListener("click", (e) => {
        e.stopPropagation();
        qi += 1;
        picked = -1;
        renderQuiz(false);
      });
      quizEl.appendChild(n);
    } else {
      const done = document.createElement("p");
      done.className = "note";
      done.textContent = pack.done;
      quizEl.appendChild(done);
    }
  }
  if (!already) {
    const ok = item.opts[picked] && item.opts[picked].ok;
    if (ok) {
      tone(523, 0.08, "sine", 0.04);
      tone(659, 0.12, "sine", 0.04);
    } else {
      tone(196, 0.14, "sine", 0.04);
    }
  }
}

function renderCopy() {
  const pack = COPY[lang];
  document.getElementById("ttl").textContent = pack.title;
  document.getElementById("intro").textContent = pack.intro;
  document.getElementById("hint").textContent = pack.hint;
  document.getElementById("model").textContent = pack.model;
  document.getElementById("lang").textContent = pack.lang;
  labelReadout();
  readoutKey = "";
  plaqueKey = "";
  renderQuiz(false);
}

document.getElementById("lang").addEventListener("click", (e) => {
  e.stopPropagation();
  lang = lang === "en" ? "zh" : "en";
  renderCopy();
});

["pointerdown", "pointermove", "pointerup", "touchstart", "touchmove", "touchend"].forEach((name) => {
  notes.addEventListener(name, (e) => e.stopPropagation(), { passive: true });
});

buildReadout();
renderCopy();

function setNdc(x, y) {
  const r = canvas.getBoundingClientRect();
  ndc.x = ((x - r.left) / Math.max(1, r.width)) * 2 - 1;
  ndc.y = -((y - r.top) / Math.max(1, r.height)) * 2 + 1;
}

function pick(x, y) {
  setNdc(x, y);
  world.updateMatrixWorld(true);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(pickList, false);
  return hits.length ? hits[0].object.userData.kind : "";
}

function localHit(group, plane, x, y) {
  setNdc(x, y);
  world.updateMatrixWorld(true);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(plane, false);
  if (!hits.length) return null;
  return group.worldToLocal(hits[0].point.clone());
}

const ptr = { id: null, x: 0, y: 0, sx: 0, sy: 0, kind: "", moved: false };
let userYaw = 0;
let sway = 0;

function onDown(e) {
  if (ptr.id !== null) return;
  if (e.cancelable) e.preventDefault();
  ptr.id = e.pointerId;
  ptr.x = ptr.sx = e.clientX;
  ptr.y = ptr.sy = e.clientY;
  ptr.moved = false;
  ptr.kind = pick(e.clientX, e.clientY);
  if (ptr.kind === "ball") hold.ball = true;
  if (ptr.kind === "spring") hold.spring = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
}

function onMove(e) {
  if (e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.sx;
  const dy = e.clientY - ptr.sy;
  if (dx * dx + dy * dy > 36) ptr.moved = true;
  ptr.x = e.clientX;
  ptr.y = e.clientY;
  if (ptr.kind === "ball") {
    const p = localHit(rampG, rampPlane, e.clientX, e.clientY);
    if (!p) return;
    const dxr = RB.x - RA.x;
    const dyr = RB.y - RA.y;
    const u = ((p.x - RA.x) * dxr + (p.y - RA.y) * dyr) / (dxr * dxr + dyr * dyr);
    setBallU(u);
    if (e.cancelable) e.preventDefault();
  } else if (ptr.kind === "spring") {
    const p = localHit(springG, springPlane, e.clientX, e.clientY);
    if (!p) return;
    setSpringX(p.x / SPR_VIS);
    if (e.cancelable) e.preventDefault();
  } else if (ptr.kind === "" || ptr.kind === "yaw") {
    ptr.kind = "yaw";
    userYaw = clamp((e.clientX - ptr.sx) * 0.004, -0.4, 0.4);
  }
}

function onUp(e) {
  if (e.pointerId !== ptr.id) return;
  const kind = ptr.kind;
  const moved = ptr.moved;
  hold.ball = false;
  hold.spring = false;
  ptr.id = null;
  ptr.kind = "";
  if (moved) {
    if (kind === "spring") tone(210, 0.08, "triangle", 0.03);
    return;
  }
  audio();
  if (kind === "switch") {
    if (!lamp.on && S.chemical < 0.4) {
      flash = COPY[lang].fuel;
      flashUntil = performance.now() + 1300;
      tone(160, 0.08, "sine", 0.03);
      return;
    }
    lamp.on = !lamp.on;
    tone(lamp.on ? 620 : 280, 0.05, "square", 0.02);
    return;
  }
  if (kind === "reset") {
    resetBench();
    return;
  }
  if (kind === "ball") {
    nudgeBall();
    tone(360, 0.06, "sine", 0.03);
    return;
  }
  pluck();
  tone(250, 0.1, "triangle", 0.035);
}

canvas.addEventListener("pointerdown", onDown, { passive: false });
canvas.addEventListener("pointermove", onMove, { passive: false });
canvas.addEventListener("pointerup", onUp);
canvas.addEventListener("pointercancel", onUp);

function ensureFold() {
  if (document.getElementById("gb-ui-toggle") || document.getElementById("fold")) return;
  if (document.querySelector('script[src="/sandbox/_ready.js"]')) return;
  const b = document.createElement("button");
  b.id = "fold";
  b.type = "button";
  b.setAttribute("aria-label", "Notes");
  b.textContent = "\u2699";
  b.addEventListener("click", (ev) => {
    ev.stopPropagation();
    document.documentElement.classList.toggle("gb-ui-open");
  });
  document.body.appendChild(b);
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => setTimeout(ensureFold, 0));
} else {
  setTimeout(ensureFold, 0);
}

let prev = 0;
let readySent = false;

function loop(now) {
  requestAnimationFrame(loop);
  const w = canvas.clientWidth || window.innerWidth;
  const h = canvas.clientHeight || window.innerHeight;
  if (w < 2 || h < 2) return;
  if (w !== viewW || h !== viewH) resize();
  const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 1 / 60;
  prev = now;
  simulate(dt);
  const dragging = ptr.id !== null;
  const targetSway = dragging ? 0 : Math.sin(now * 0.0011) * 0.022;
  sway += (targetSway - sway) * 0.08;
  if (!dragging) userYaw += (0 - userYaw) * 0.04;
  world.rotation.y = userYaw + sway;
  updateVisuals(now);
  renderer.render(scene, camera);
  if (!readySent && window.__gbSandbox && window.__gbSandbox.ready) {
    readySent = true;
    window.__gbSandbox.ready();
  }
}

resize();
requestAnimationFrame(loop);
