/**
 * test-harness.js — Menjalankan game di Node dengan stub DOM/canvas
 * untuk menangkap runtime error tanpa browser.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- Stub canvas 2D context ----
function makeCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return new Proxy({
    canvas: { width: 800, height: 680 },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: () => ({ width: 50 }),
    getImageData: () => ({ data: [] }),
    setLineDash: noop,
    createPattern: () => ({}),
    createImageData: () => ({ data: [] })
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      // semua method lain = noop
      return noop;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    }
  });
}

function makeCanvas() {
  return {
    width: 800,
    height: 680,
    getContext: () => makeCtx(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 680 }),
    addEventListener: () => {},
    style: {}
  };
}

const canvas = makeCanvas();

// ---- Stub element ----
function makeEl() {
  return {
    textContent: '',
    innerHTML: '',
    value: 'normal',
    dataset: {},          // DOM dataset standar
    className: '',
    id: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    children: [],
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => makeEl(),
    querySelectorAll: () => [],
    addEventListener: () => {},
    getContext: () => makeCtx()
  };
}

const elements = {};
const listeners = { window: {}, document: {}, canvas: {} };

// ---- Stub Audio ----
class FakeAudio {
  constructor() {
    this.loop = false;
    this.preload = '';
    this.src = '';
    this.volume = 1;
    this._cbs = {};
  }
  addEventListener(ev, cb) { (this._cbs[ev] = this._cbs[ev] || []).push(cb); }
  play() { return Promise.resolve(); }
  pause() {}
  dispatch(ev) { (this._cbs[ev] || []).forEach(cb => cb()); }
}

// ---- Stub AudioContext ----
class FakeParam {
  constructor() { this.value = 0; }
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
  setTargetAtTime() {}
}
class FakeNode {
  constructor() {
    this.gain = new FakeParam();
    this.frequency = new FakeParam();
    this.Q = new FakeParam();
    this.delayTime = new FakeParam();
    this.type = '';
  }
  connect() {}
  disconnect() {}
  start() {}
  stop() {}
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.sampleRate = 44100;
    this.destination = new FakeNode();
  }
  resume() { return Promise.resolve(); }
  createGain() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  createDelay() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
}

// ---- Global sandbox ----
let rafCallbacks = [];
let now = 0;

const sandbox = {
  console,
  Math,
  Date,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  performance: { now: () => now },
  requestAnimationFrame: (cb) => { rafCallbacks.push(cb); return rafCallbacks.length; },
  setTimeout: (cb, t) => setTimeout(cb, t || 0),
  clearTimeout,
  setInterval: (cb, t) => setInterval(cb, 1000), // jangan terlalu cepat
  clearInterval,
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; }
  },
  document: {
    getElementById: (id) => {
      if (id === 'gameCanvas') return canvas;
      elements[id] = elements[id] || makeEl();
      return elements[id];
    },
    createElement: (tag) => {
      if (tag === 'canvas') return makeCanvas();
      return makeEl();
    },
    addEventListener: (ev, cb) => { (listeners.document[ev] = listeners.document[ev] || []).push(cb); },
    querySelector: () => makeEl(),
    body: makeEl(),
    fullscreenElement: null
  },
  window: null, // diisi setelahnya
  Audio: FakeAudio,
  AudioContext: FakeAudioContext,
  webkitAudioContext: FakeAudioContext,
  Event: class Event { constructor(type) { this.type = type; } },
  dispatchEvent: () => {},
  alert: () => {},
  Image: class { constructor() { this.src = ''; } },
  navigator: { userAgent: 'node-test' },
  location: { href: 'http://localhost/' }
};

sandbox.window = sandbox;
sandbox.window.addEventListener = (ev, cb) => { (listeners.window[ev] = listeners.window[ev] || []).push(cb); };
sandbox.window.dispatchEvent = () => {};
sandbox.window.innerWidth = 1200;
sandbox.window.innerHeight = 900;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);

// ---- Load semua script urut ----
const files = ['js/arabic.js', 'js/quizzes.js', 'js/audio.js', 'js/danmaku.js', 'js/player.js', 'js/boss.js', 'js/game.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
  try {
    vm.runInContext(code, sandbox, { filename: f });
    console.log('✔ loaded', f);
  } catch (e) {
    console.error('✘ ERROR loading', f, '→', e.message);
    process.exit(1);
  }
}

// ---- Trigger DOMContentLoaded ----
function fireWin(ev, arg) {
  (listeners.window[ev] || []).forEach(cb => cb(arg));
}
function fireDoc(ev, arg) {
  (listeners.document[ev] || []).forEach(cb => cb(arg));
}

try {
  fireWin('DOMContentLoaded');
  fireDoc('DOMContentLoaded');
  console.log('✔ DOMContentLoaded fired, game constructed:', !!sandbox.window.game);
} catch (e) {
  console.error('✘ ERROR constructing Game →', e.stack);
  process.exit(1);
}

const game = sandbox.window.game;
if (!game) { console.error('✘ game not created'); process.exit(1); }

console.log('   state:', game.state, '| letters:', sandbox.window.Arabic.letters.length,
  '| words:', sandbox.window.Arabic.words.length, '| quizzes:', sandbox.window.Arabic.quizzes.length);

// ---- Validasi data kuis ----
let quizErr = 0;
sandbox.window.Arabic.quizzes.forEach((q, i) => {
  if (!q.q) { console.error(`✘ quiz[${i}] tanpa q`); quizErr++; }
  if (!Array.isArray(q.options) || q.options.length !== 4) { console.error(`✘ quiz[${i}] opsi != 4`); quizErr++; }
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) { console.error(`✘ quiz[${i}] answer invalid`); quizErr++; }
  if (new Set(q.options).size !== 4) { console.error(`✘ quiz[${i}] opsi duplikat:`, q.options); quizErr++; }
});
console.log(quizErr === 0 ? '✔ semua kuis valid' : `✘ ${quizErr} kuis bermasalah`);

// ---- Jalankan beberapa frame (state TITLE) ----
function runFrames(n) {
  for (let i = 0; i < n; i++) {
    now += 16;
    const cbs = rafCallbacks;
    rafCallbacks = [];
    cbs.forEach(cb => cb(now));
  }
}

try {
  runFrames(5);
  console.log('✔ TITLE frames OK, state =', game.state);
} catch (e) {
  console.error('✘ ERROR di frame TITLE →', e.stack);
  process.exit(1);
}

// ---- Mulai game ----
try {
  game.startGame();
  runFrames(10);
  console.log('✔ startGame + 10 frames OK, state =', game.state);
} catch (e) {
  console.error('✘ ERROR startGame →', e.stack);
  process.exit(1);
}

// ---- Simulasi main 1200 frame (termasuk spawn pola, item, dst) ----
try {
  // paksa kuis muncul cepat
  game.nextQuizAt = game.frameCount + 30;
  runFrames(1200);
  console.log('✔ 1200 frames OK. state =', game.state,
    '| frame =', game.frameCount,
    '| bullets =', game.danmaku.bullets.length,
    '| boss phase =', game.boss.currentPhaseIdx + 1,
    '| boss hp =', Math.round(game.boss.hp));
} catch (e) {
  console.error('✘ ERROR simulasi →', e.stack);
  process.exit(1);
}

// ---- Pastikan kuis sempat muncul ----
if (game.state === 'QUIZ' || game.quizAsked > 0) {
  console.log('✔ kuis berfungsi (asked =', game.quizAsked + ')');
} else {
  console.log('⚠ kuis belum sempat muncul dalam 1200 frame');
}

// ---- Jika sedang QUIZ, coba jawab ----
if (game.state === 'QUIZ' && game.quiz) {
  try {
    game.quizIndex = game.quiz.answer;
    game.answerQuiz();
    console.log('✔ answerQuiz OK → state =', game.state, '| correct =', game.quizCorrect);
    runFrames(30);
  } catch (e) {
    console.error('✘ ERROR answerQuiz →', e.stack);
    process.exit(1);
  }
}

// ---- Paksa semua fase boss (uji semua pola) ----
try {
  if (game.state !== 'PLAYING') game.startGame();
  for (let p = 0; p < 5; p++) {
    game.boss.hp = 0;
    game.boss.timeLeft = 999;
    runFrames(180); // jalankan tiap pola ~3 detik
    console.log(`✔ fase ${p + 1} jalan OK (state=${game.state}, bullets=${game.danmaku.bullets.length})`);
    if (game.boss.defeated) break;
  }
} catch (e) {
  console.error('✘ ERROR fase boss →', e.stack);
  process.exit(1);
}

// ---- Test bomb ----
try {
  if (game.state !== 'PLAYING') game.startGame();
  game.player.bombs = 3;
  game.keys['KeyX'] = true;
  runFrames(5);
  console.log('✔ bomb OK → active =', game.player.bombActive);
} catch (e) {
  console.error('✘ ERROR bomb →', e.stack);
  process.exit(1);
}

// ---- Test kematian ----
try {
  if (game.state !== 'PLAYING') game.startGame();
  game.player.invulnerableTimer = 0;
  game.player.lives = 1;
  game.player.hit(game.audio, (x, y, c, n) => game.createExplosionParticles(x, y, c, n));
  runFrames(3);
  console.log('✔ death OK → alive =', game.player.alive, '| state =', game.state);
} catch (e) {
  console.error('✘ ERROR death →', e.stack);
  process.exit(1);
}

// ---- Test semua kuis (render tiap tipe) ----
try {
  const types = new Set(sandbox.window.Arabic.quizzes.map(q => q.type));
  console.log('✔ tipe kuis:', [...types].join(', '));
  // render satu kuis dari tiap tipe
  for (const t of types) {
    const q = sandbox.window.Arabic.quizzes.find(x => x.type === t);
    game.state = 'QUIZ';
    game.quiz = q;
    game.quizIndex = 0;
    game.quizTimer = 600;
    runFrames(2);
    game.state = 'PLAYING';
  }
  console.log('✔ render semua tipe kuis OK');
} catch (e) {
  console.error('✘ ERROR render kuis →', e.stack);
  process.exit(1);
}

// ---- Test draw semua state overlay ----
try {
  game.state = 'TITLE'; runFrames(2);
  game.state = 'PAUSED'; runFrames(2);
  game.state = 'GAMEOVER'; runFrames(2);
  game.state = 'VICTORY'; runFrames(2);
  console.log('✔ semua overlay ter-render OK');
} catch (e) {
  console.error('✘ ERROR overlay →', e.stack);
  process.exit(1);
}

console.log('\n========== SEMUA TEST LULUS ==========');
process.exit(0);
