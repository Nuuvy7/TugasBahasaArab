class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.synthGain = null;
    this.delaySend = null;

    this.musicVolume = 0.6;
    this.sfxVolume = 0.55;
    this.musicMuted = false;
    this.sfxMuted = false;

    // ---- DROP-IN MP3 SLOT ------------------------------------
    this.bgmAudio = new Audio();
    this.bgmAudio.loop = true;
    this.bgmAudio.preload = "auto";
    this.bgmSources = [
      "assets/qawlu-qawlu-sawarim.mp3", // 👈 taruh mp3-mu di sini
    ];
    this.bgmSourceIndex = 0;
    this.ostAvailable = false; // diprobe di bawah
    this.bgmAudio.src = this.bgmSources[0];
    this.bgmAudio.volume = this.musicVolume;

    // Probe: apakah file MP3 benar-benar ada?
    this.bgmAudio.addEventListener("loadedmetadata", () => {
      this.ostAvailable = true;
      if (this.bgmMode !== "ost") this.bgmMode = "ost";
      window.dispatchEvent(new Event("bgm-probe-done"));
    });
    this.bgmAudio.addEventListener("error", () => {
      this.ostAvailable = false;
      this.bgmMode = "synth"; // belum ada file → pakai synth
      window.dispatchEvent(new Event("bgm-probe-done"));
      if (this.isPlaying) this.startSynthBGM();
    });

    // Default: synth dulu (baru ganti ke ost kalau file ketemu)
    this.bgmMode = "synth";
    this.isPlaying = false;
    this.audioInitialized = false;

    // Synth state
    this.synthTimer = null;
    this.synthStep = 0;
  }

  init() {
    if (this.audioInitialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Simple feedback delay for the synth (desert ambience)
      this.delaySend = this.ctx.createDelay(1.0);
      this.delaySend.delayTime.value = 0.28;
      const delayFeedback = this.ctx.createGain();
      delayFeedback.gain.value = 0.28;
      const delayWet = this.ctx.createGain();
      delayWet.gain.value = 0.22;
      this.delaySend.connect(delayFeedback);
      delayFeedback.connect(this.delaySend);
      this.delaySend.connect(delayWet);
      delayWet.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.synthGain = this.ctx.createGain();
      this.synthGain.gain.setValueAtTime(
        this.musicVolume * 0.5,
        this.ctx.currentTime,
      );
      this.synthGain.connect(this.masterGain);
      this.synthGain.connect(this.delaySend);

      this.audioInitialized = true;
    } catch (err) {
      console.warn("Web Audio API tidak didukung / diblokir:", err);
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // ==========================================================
  // BGM CONTROL
  // ==========================================================
  playBGM() {
    this.ensureContext();
    this.isPlaying = true;

    if (this.bgmMode === "ost" && this.ostAvailable) {
      this.stopSynthBGM();
      this.bgmAudio.volume = this.musicMuted ? 0 : this.musicVolume;
      const p = this.bgmAudio.play();
      if (p !== undefined) p.catch(() => {});
    } else {
      this.bgmAudio.pause();
      this.startSynthBGM();
    }
  }

  pauseBGM() {
    this.isPlaying = false;
    this.bgmAudio.pause();
    this.stopSynthBGM();
  }

  toggleBGM() {
    if (this.isPlaying) this.pauseBGM();
    else this.playBGM();
    return this.isPlaying;
  }

  setBGMMode(mode) {
    this.bgmMode = mode;
    if (this.isPlaying) {
      if (mode === "ost" && this.ostAvailable) {
        this.stopSynthBGM();
        this.playBGM();
      } else {
        this.bgmAudio.pause();
        this.bgmMode = "synth";
        this.startSynthBGM();
      }
    }
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.bgmAudio.volume = this.musicMuted ? 0 : this.musicVolume;
    if (this.synthGain && this.ctx) {
      this.synthGain.gain.setTargetAtTime(
        this.musicMuted ? 0 : this.musicVolume * 0.5,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  setSFXVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        this.sfxVolume,
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  // ==========================================================
  // SFX PROSEDURAL
  // ==========================================================

  playShoot() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(980, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.07);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playGraze() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    const freqs = [1760, 2093, 2349, 2637];
    const f = freqs[Math.floor(Math.random() * freqs.length)];
    osc.frequency.setValueAtTime(f, now);
    osc.frequency.exponentialRampToValueAtTime(f * 1.25, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playHit() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.05);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  playItem() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.05);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Dentuman lambaian tangan / kartu ilmu dibuka
  playSpellCard() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.18, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2 + idx * 0.05);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.04);
      osc.stop(now + 1.5);
    });
  }

  // Bom SHAWARMA HABIBI — bass drop + ledakan debu
  playBomb() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(240, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
    subGain.gain.setValueAtTime(0.5, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 1.2);

    const bufferSize = this.ctx.sampleRate * 1.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(110, now + 1.0);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(now);
  }

  // Kematian pemain — "pichuun" klasik
  playPichuun() {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.65);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2000, now);
    filter.Q.setValueAtTime(3, now);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  // Jawaban kuis: benar = chime emas, salah = buzz merah
  playQuiz(correct) {
    if (this.sfxMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = correct ? [659.25, 830.61, 1046.5] : [220, 165];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = correct ? "triangle" : "sawtooth";
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.22, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  }

  playBossDefeat() {
    if (this.sfxMuted || !this.ctx) return;
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.playBomb(), i * 150);
    }
  }

  // ==========================================================
  //  SYNTH BGM — maqam Hijaz + pola darbuka
  //  Gaya "Qawlu Qawlu Sawarim" versi chiptune.
  // ==========================================================
  startSynthBGM() {
    this.stopSynthBGM();
    this.ensureContext();
    if (!this.ctx) return;

    // Nada maqam Hijaz: D - Eb - F# - G - A - Bb - C - D
    const N = {
      D3: 146.83,
      Eb3: 155.56,
      Fs3: 185.0,
      G3: 196.0,
      A3: 220.0,
      Bb3: 233.08,
      C4: 261.63,
      D4: 293.66,
      Eb4: 311.13,
      Fs4: 369.99,
      G4: 392.0,
      A4: 440.0,
      Bb4: 466.16,
      C5: 523.25,
      D5: 587.33,
      Eb5: 622.25,
      Fs5: 739.99,
      G5: 783.99,
      A5: 880.0,
      Bb5: 932.33,
      C6: 1046.5,
      D6: 1174.66,
    };

    // Melodi lambat bergaya nasheed (accented 8ths)
    const melody = [
      N.D5,
      0,
      N.Eb5,
      N.Fs5,
      N.G5,
      0,
      N.Fs5,
      N.Eb5,
      N.D5,
      0,
      N.C5,
      N.D5,
      N.Eb5,
      0,
      0,
      0,
      N.Bb4,
      0,
      N.C5,
      N.D5,
      N.Eb5,
      0,
      N.D5,
      N.C5,
      N.D5,
      0,
      N.Eb5,
      N.G5,
      N.Fs5,
      0,
      N.Eb5,
      N.D5,
    ];

    // Bass (doum)
    const bass = [
      N.D3,
      0,
      0,
      0,
      N.D3,
      0,
      N.A3,
      0,
      N.G3,
      0,
      0,
      0,
      N.G3,
      0,
      N.D3,
      0,
      N.Bb3,
      0,
      0,
      0,
      N.Bb3,
      0,
      N.Fs3,
      0,
      N.A3,
      0,
      N.D3,
      0,
      N.A3,
      0,
      N.D3,
      0,
    ];

    const stepMs = 110; // ~136 BPM 8ths
    this.synthStep = 0;

    this.synthTimer = setInterval(() => {
      if (!this.isPlaying || this.bgmMode !== "synth" || !this.ctx) return;
      const now = this.ctx.currentTime;
      const s = this.synthStep;
      const i = s % 32;

      // Melodi
      const m = melody[i];
      if (m) this.pluck(m, now, 0.16, "sawtooth");

      // Bass tiap genap
      const b = bass[i];
      if (b && s % 2 === 0) this.pluck(b, now, 0.26, "triangle");

      // Darbuka: doum (1 & 3), tek (2 & 4 & offbeats)
      const beat = i % 8;
      if (beat === 0 || beat === 4)
        this.drum(now, 85, 0.35, 0.09); // doum
      else if (beat === 2 || beat === 6)
        this.drum(now, 380, 0.2, 0.05); // tek
      else if (beat === 7) this.drum(now, 500, 0.12, 0.03); // tek kecil
      // Hi-hat offbeat
      if (s % 2 === 1) this.hat(now);

      this.synthStep++;
    }, stepMs);
  }

  pluck(freq, when, vol, type) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.28);
    osc.connect(gain);
    gain.connect(this.synthGain);
    osc.start(when);
    osc.stop(when + 0.3);
  }

  drum(when, freq, vol, dur) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, when + dur);
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain);
    gain.connect(this.synthGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  hat(when) {
    const len = Math.floor(this.ctx.sampleRate * 0.03);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++)
      d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.value = 0.06;
    src.connect(hp);
    hp.connect(g);
    g.connect(this.synthGain);
    src.start(when);
  }

  stopSynthBGM() {
    if (this.synthTimer) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
  }
}

// Global audio singleton
window.audioManager = new AudioManager();
