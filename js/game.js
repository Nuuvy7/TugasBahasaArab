class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.playBounds = { left: 30, top: 25, right: 510, bottom: 655 };
    this.hudBounds = { left: 530, top: 25, right: 775, bottom: 655 };

    this.audio = window.audioManager;
    this.danmaku = new DanmakuEngine();
    this.player = new Player(this.playBounds);
    this.boss = new Boss(this.playBounds);

    this.state = "TITLE"; // TITLE | PLAYING | PAUSED | QUIZ | GAMEOVER | VICTORY
    this.difficulty = "normal";

    // Label + tuning tiap difficulty (kunci internal: easy/hard/normal/lunatic)
    this.diffLabels = {
      baby: "Baby mode — chill guy",
      easy: "Yalla yalla brother no problem very easy",
      hard: "Habibi this is good very nice",
      normal: "Wallahi habibi youre good brother",
      lunatic: "HABIBI WELCOME TO JAHANNAM HABIBI",
    };
    // Label pendek khusus HUD (versi panjang ada di dropdown & layar judul)
    this.diffShort = {
      baby: "BABY",
      easy: "EASY",
      hard: "MEDIUM",
      normal: "NORMAL",
      lunatic: "LUNATIC",
    };
    // multiplier = kepadatan peluru, lives/bombs = modal awal
    this.diffConfig = {
      baby: { multiplier: 0.1, lives: 6, bombs: 6 },
      easy: { multiplier: 0.4, lives: 5, bombs: 5 },
      hard: { multiplier: 0.7, lives: 4, bombs: 4 },
      normal: { multiplier: 1.0, lives: 3, bombs: 3 },
      lunatic: { multiplier: 1.4, lives: 2, bombs: 2 },
    };

    this.keys = {};

    this.particles = [];
    this.floatingTexts = [];
    this.items = [];
    this.backgroundGlyphs = [];

    this.bgOffset = 0;

    this.highScore = parseInt(
      localStorage.getItem("tajawwul_hiscore") || "100000",
      10,
    );

    this.spellCardsCaptured = 0;

    // ---- Sistem kuis ----
    this.quiz = null; // soal aktif
    this.quizIndex = 0; // opsi terpilih (0..3)
    this.quizTimer = 0; // hitung mundur tampil
    this.nextQuizAt = 18 * 60; // frame pertama kuis
    this.quizCooldown = 20 * 60;
    this.wordsCollected = 0; // kata yang berhasil dikumpulkan
    this.quizCorrect = 0;
    this.quizAsked = 0;
    this.streak = 0;

    this.touchActive = false;

    this.initBackground();
    this.initListeners();

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  // =========================================================
  // SETUP
  // =========================================================
  initBackground() {
    // Glyph Arab melayang di background
    const glyphs = [
      "ا",
      "ب",
      "ت",
      "ث",
      "ج",
      "ح",
      "خ",
      "د",
      "ل",
      "م",
      "ن",
      "ه",
      "و",
      "ي",
      "س",
      "ش",
      "ك",
      "ق",
    ];
    for (let i = 0; i < 30; i++) {
      this.backgroundGlyphs.push({
        x:
          this.playBounds.left +
          Math.random() * (this.playBounds.right - this.playBounds.left),
        y:
          this.playBounds.top +
          Math.random() * (this.playBounds.bottom - this.playBounds.top),
        speed: 0.6 + Math.random() * 1.3,
        swaySpeed: 0.02 + Math.random() * 0.03,
        swayAmount: 15 + Math.random() * 25,
        seed: Math.random() * 100,
        size: 14 + Math.random() * 16,
        glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
        alpha: 0.06 + Math.random() * 0.12,
        rot: Math.random() * Math.PI * 2,
      });
    }
  }

  initListeners() {
    window.addEventListener("keydown", (e) => {
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      ) {
        e.preventDefault();
      }

      this.keys[e.code] = true;
      this.keys[e.key] = true;

      if (e.code === "KeyP" || e.code === "Escape") {
        if (this.state === "PLAYING") this.state = "PAUSED";
        else if (this.state === "PAUSED") this.state = "PLAYING";
      }

      if (e.code === "KeyM") {
        const playing = this.audio.toggleBGM();
        this.addFloatingText(
          this.playBounds.left + 150,
          this.playBounds.top + 50,
          playing ? "BGM: ON" : "BGM: OFF",
          "#00e5ff",
        );
      }

      if (e.code === "KeyN") {
        const nextMode = this.audio.bgmMode === "ost" ? "synth" : "ost";
        this.audio.setBGMMode(nextMode);
        this.addFloatingText(
          this.playBounds.left + 150,
          this.playBounds.top + 70,
          `BGM Mode: ${this.audio.bgmMode.toUpperCase()}`,
          "#ffd700",
        );
      }

      // Mulai dari judul
      if (
        this.state === "TITLE" &&
        (e.code === "KeyZ" || e.code === "Space" || e.code === "Enter")
      ) {
        this.startGame();
      }

      // Restart
      if (
        (this.state === "GAMEOVER" || this.state === "VICTORY") &&
        (e.code === "KeyZ" || e.code === "Space" || e.code === "KeyR")
      ) {
        this.startGame();
      }

      // ---- Navigasi kuis ----
      if (this.state === "QUIZ") {
        if (e.code === "ArrowUp" || e.code === "KeyW") this.moveQuiz(-1);
        if (e.code === "ArrowDown" || e.code === "KeyS") this.moveQuiz(1);
        if (e.code === "KeyZ" || e.code === "Space" || e.code === "Enter")
          this.answerQuiz();
        if (e.code === "KeyX") this.skipQuiz();
      }
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    });

    // Klik untuk pilih jawaban kuis / mulai game
    this.canvas.addEventListener("click", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      if (
        this.state === "TITLE" ||
        this.state === "GAMEOVER" ||
        this.state === "VICTORY"
      ) {
        this.startGame();
        return;
      }

      if (this.state === "QUIZ" && this.quiz) {
        for (let i = 0; i < 4; i++) {
          const r = this.getQuizOptionRect(i);
          if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
            this.quizIndex = i;
            this.answerQuiz();
            return;
          }
        }
      }
    });

    // Touch support
    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const tx = (touch.clientX - rect.left) * scaleX;
        const ty = (touch.clientY - rect.top) * scaleY;

        if (
          this.state === "TITLE" ||
          this.state === "GAMEOVER" ||
          this.state === "VICTORY"
        ) {
          this.startGame();
        } else if (this.state === "QUIZ" && this.quiz) {
          // Tap opsi jawaban
          for (let i = 0; i < 4; i++) {
            const r = this.getQuizOptionRect(i);
            if (tx >= r.x && tx <= r.x + r.w && ty >= r.y && ty <= r.y + r.h) {
              this.quizIndex = i;
              this.answerQuiz();
              return;
            }
          }
        } else if (this.state === "PLAYING") {
          this.keys["KeyZ"] = true;
        }
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        if (this.state !== "PLAYING") return;
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.player.x = (touch.clientX - rect.left) * scaleX;
        this.player.y = (touch.clientY - rect.top) * scaleY - 30;
      },
      { passive: false },
    );

    this.canvas.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.keys["KeyZ"] = false;
    });
  }

  // =========================================================
  // KUIS BAHASA ARAB
  // =========================================================
  startQuiz() {
    const bank = window.Arabic.quizzes;
    this.quiz = bank[Math.floor(Math.random() * bank.length)];
    this.quizIndex = 0;
    this.quizTimer = 15 * 60; // 15 detik
    this.quizAsked++;
    this.state = "QUIZ";
    this.chat("ustaz", `KUIS MENDADAK! ${this.quiz.q.replace(/<[^>]+>/g, "")}`);
  }

  moveQuiz(dir) {
    if (!this.quiz) return;
    this.quizIndex = (this.quizIndex + dir + 4) % 4;
  }

  getQuizBox() {
    // Popup kuis diperbesar biar jelas (area main hanya 480px lebar)
    const w = 452;
    const h = 430;
    return {
      x: (this.playBounds.left + this.playBounds.right - w) / 2,
      y: (this.playBounds.top + this.playBounds.bottom - h) / 2 - 10,
      w,
      h,
    };
  }

  // Layout tombol opsi — dipakai saat menggambar DAN deteksi klik/touch,
  // supaya area yang diklik selalu sama dengan yang terlihat.
  getQuizOptionRect(i) {
    const box = this.getQuizBox();
    const optH = 50;
    const gap = 8;
    const top = box.y + 130;
    return {
      x: box.x + 16,
      y: top + i * (optH + gap),
      w: box.w - 32,
      h: optH,
    };
  }

  answerQuiz() {
    if (!this.quiz) return;
    const correct = this.quizIndex === this.quiz.answer;
    this.audio.playQuiz(correct);

    const box = this.getQuizBox();
    const cx = box.x + box.w / 2;

    if (correct) {
      this.quizCorrect++;
      this.streak++;
      const bonus = 25000 + this.streak * 5000;
      this.player.score += bonus;
      this.addFloatingText(
        cx,
        box.y + box.h + 20,
        `✔ BENAR! +${bonus.toLocaleString()} (streak ${this.streak})`,
        "#00e676",
      );
      this.chat("habibi", `✔ BENAR! (${this.streak}x berturut-turut)`, "good");
      this.chat(
        "ustaz",
        this.streak >= 3
          ? `Masya Allah… makin jago kamu! 🌟`
          : `Heeh, bener. Jangan sombong ya!`,
        "good",
      );
      // Bomb kecil sebagai hadiah tiap 5 streak
      if (this.streak % 5 === 0 && this.player.bombs < this.player.maxBombs) {
        this.player.bombs++;
        this.addFloatingText(
          cx,
          box.y + box.h + 44,
          "+1 BOMB (HABIBI!)",
          "#ffcc33",
        );
        this.chat("habibi", "Bonus bomb! Wih, mantap habibi 🎁", "good");
      }
    } else {
      this.streak = 0;
      const right = this.quiz.options[this.quiz.answer];
      this.addFloatingText(
        cx,
        box.y + box.h + 20,
        `✘ SALAH! Jawaban: ${right}`,
        "#ff5252",
      );
      this.chat("habibi", `✘ Salah… jawabannya ${right}`, "bad");
      this.chat(
        "ustaz",
        `Salah! Hafalkan ya, nak. Baca ulang bukumu! 📖`,
        "bad",
      );
    }

    this.quiz = null;
    this.nextQuizAt = this.frameCount + this.quizCooldown;
    this.state = "PLAYING";
  }

  skipQuiz() {
    this.streak = 0;
    this.addFloatingText(
      this.playBounds.left + 150,
      this.playBounds.top + 120,
      "Dilewati… hafalkan ya!",
      "#ffaa00",
    );
    this.quiz = null;
    this.nextQuizAt = this.frameCount + this.quizCooldown;
    this.state = "PLAYING";
  }

  // =========================================================
  // SIDE PANEL: dialog chat + kuis HTML (untuk fullscreen / layar lebar)
  // =========================================================
  chat(who, text, cls = "") {
    const log = document.getElementById("chatLog");
    if (!log) return;
    const div = document.createElement("div");
    div.className = `chat-msg ${who === "ustaz" ? "ustaz" : "habibi"} ${cls}`;
    div.innerHTML = `<span class="who">${who === "ustaz" ? "الأستاذ" : "الحبيب"}</span><span class="bubble"></span>`;
    div.querySelector(".bubble").textContent = text;
    log.appendChild(div);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
  }

  // Render kuis ke panel kanan (dipanggil tiap frame saat state QUIZ)
  syncSidePanel() {
    const box = document.getElementById("sideQuiz");
    const timer = document.getElementById("sideQuizTimer");
    if (!box) return;

    if (this.state === "QUIZ" && this.quiz) {
      const q = this.quiz;
      if (box.dataset.q !== q.q) {
        box.dataset.q = q.q;
        box.innerHTML =
          `<div class="quiz-q">${q.q}</div>` +
          q.options
            .map(
              (o, i) =>
                `<button class="quiz-opt" data-i="${i}">${i + 1}. ${o}</button>`,
            )
            .join("") +
          `<button class="quiz-skip" id="sideQuizSkip">Lewat (X)</button>`;
      }
      // sorot opsi terpilih
      box.querySelectorAll(".quiz-opt").forEach((b, i) => {
        b.style.borderColor = i === this.quizIndex ? "#ffd700" : "";
        b.style.background =
          i === this.quizIndex ? "rgba(212,175,55,0.22)" : "";
      });
      if (timer)
        timer.textContent = `⏱ ${Math.ceil(this.quizTimer / 60)}s • streak ${this.streak}`;
    } else {
      if (box.dataset.q) {
        box.dataset.q = "";
        box.innerHTML = `<div class="quiz-idle">Kuis muncul tiap ~18 detik…<br><small>Jawab di sini atau langsung di canvas.</small></div>`;
      }
      if (timer) timer.textContent = "";
    }
  }

  // =========================================================
  // GAME LOOP
  // =========================================================
  startGame() {
    this.audio.playBGM();
    this.danmaku.clear();
    this.player.reset();
    this.boss.init();
    this.boss.setDifficulty(this.difficulty);
    this.syncSidePanel();

    // Modal nyawa/bomb sesuai difficulty (Baby dimanjakan)
    const cfg = this.diffConfig[this.difficulty] || this.diffConfig.normal;
    this.player.lives = cfg.lives;
    this.player.bombs = cfg.bombs;
    this.player.baseBombs = cfg.bombs;
    this.particles = [];
    this.floatingTexts = [];
    this.items = [];
    this.spellCardsCaptured = 0;
    this.quiz = null;
    this.quizCorrect = 0;
    this.quizAsked = 0;
    this.streak = 0;
    this.wordsCollected = 0;
    this.frameCount = 0;
    this.nextQuizAt = 18 * 60;
    this.state = "PLAYING";
  }

  addParticle(x, y, color, size = 3, vx = null, vy = null, life = 30) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3.5 + 0.5;
    this.particles.push({
      x,
      y,
      vx: vx !== null ? vx : Math.cos(angle) * speed,
      vy: vy !== null ? vy : Math.sin(angle) * speed,
      color,
      size,
      maxLife: life,
      life: life,
    });
  }

  createExplosionParticles(x, y, color, count = 25) {
    for (let i = 0; i < count; i++) {
      this.addParticle(
        x,
        y,
        color,
        2 + Math.random() * 3,
        null,
        null,
        20 + Math.random() * 25,
      );
    }
  }

  addFloatingText(x, y, text, color = "#ffffff") {
    this.floatingTexts.push({ x, y, text, color, life: 70, maxLife: 70 });
  }

  // Drop item: power, skor, dan KATA ARAB
  spawnItems(x, y, powerCount = 3, scoreCount = 4, wordChance = 0.5) {
    for (let i = 0; i < powerCount; i++) {
      this.items.push({
        x: x + (Math.random() * 40 - 20),
        y: y + (Math.random() * 20 - 10),
        vy: -3.5 - Math.random() * 2,
        type: "power",
        color: "#ff3366",
        label: "P",
      });
    }
    for (let i = 0; i < scoreCount; i++) {
      this.items.push({
        x: x + (Math.random() * 50 - 25),
        y: y + (Math.random() * 30 - 15),
        vy: -3.0 - Math.random() * 2,
        type: "score",
        color: "#3399ff",
        label: "点",
      });
    }
    // Kata Arab edukatif
    if (Math.random() < wordChance) {
      const w = window.Arabic.randomWord();
      this.items.push({
        x,
        y: y - 5,
        vy: -4.5,
        type: "word",
        color: "#00e676",
        label: "A",
        word: w,
      });
    }
  }

  loop(timestamp) {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update();
    this.render();

    // Sinkronkan panel kanan (chat/kuis) tiap ~4 frame biar murah
    this._panelTick = (this._panelTick || 0) + 1;
    if (this._panelTick % 4 === 0) this.syncSidePanel();

    requestAnimationFrame(this.loop.bind(this));
  }

  update() {
    this.frameCount = (this.frameCount || 0) + 1;

    // Glyph latar melayang
    this.bgOffset += 0.8;
    this.backgroundGlyphs.forEach((p) => {
      p.y += p.speed;
      p.rot += 0.01;
      p.x += Math.sin(p.seed + p.y * p.swaySpeed) * 0.4;
      if (p.y > this.playBounds.bottom + 30) {
        p.y = this.playBounds.top - 20;
        p.x =
          this.playBounds.left +
          Math.random() * (this.playBounds.right - this.playBounds.left);
      }
    });

    // Partikel
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life--;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 0.6;
      ft.life--;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // ---- QUIZ STATE ----
    if (this.state === "QUIZ") {
      this.quizTimer--;
      if (this.quizTimer <= 0) this.skipQuiz();
      return;
    }

    if (this.state !== "PLAYING") return;

    // Jadwal kuis berikutnya
    if (this.frameCount >= this.nextQuizAt && !this.quiz) {
      this.startQuiz();
      return;
    }

    // Player
    this.player.update(
      this.keys,
      this.danmaku,
      this.audio,
      (x, y, col, count) => this.createExplosionParticles(x, y, col, count),
    );

    if (!this.player.alive) {
      this.state = "GAMEOVER";
      this.chat("habibi", "Astaghfirullah… habibi gugur 😭", "bad");
      this.chat("ustaz", "Yalla, coba lagi! Jangan menyerah 💪", "bad");
      if (this.player.score > this.highScore) {
        this.highScore = this.player.score;
        localStorage.setItem("tajawwul_hiscore", this.highScore.toString());
      }
      return;
    }

    // PoC: dekat atas = auto collect
    const isAtPoC = this.player.y < this.playBounds.top + 160;

    // Items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.vy += 0.12;
      item.y += item.vy;

      const dx = this.player.x - item.x;
      const dy = this.player.y - item.y;
      const dist = Math.hypot(dx, dy);

      if (isAtPoC || dist < 70) {
        item.x += (dx / dist) * 7.5;
        item.y += (dy / dist) * 7.5;
      }

      if (dist < 22) {
        this.audio.playItem();
        if (item.type === "power") {
          this.player.power = Math.min(
            this.player.maxPower,
            +(this.player.power + 0.05).toFixed(2),
          );
          this.player.score += 500;
          this.addFloatingText(item.x, item.y, "POWER UP!", "#ff3366");
        } else if (item.type === "score") {
          const pts = isAtPoC ? 10000 : 3000;
          this.player.score += pts;
          this.addFloatingText(item.x, item.y, `+${pts}`, "#ffd700");
        } else if (item.type === "word") {
          // Kata Arab: edukasi + bonus besar
          this.wordsCollected++;
          this.player.score += 15000;
          const w = item.word;
          this.addFloatingText(
            item.x,
            item.y - 10,
            `${w.ar} = ${w.id}`,
            "#00e676",
            95,
          );
          this.addFloatingText(
            item.x,
            item.y + 12,
            `(${w.sound}) +15000`,
            "#a5d6a7",
            95,
          );
          if (this.wordsCollected % 10 === 0) {
            this.addFloatingText(
              this.playBounds.left + 150,
              this.playBounds.top + 90,
              `${this.wordsCollected} kata hafal! 📚`,
              "#ffcc33",
            );
          }
        }
        this.items.splice(i, 1);
        continue;
      }

      if (item.y > this.playBounds.bottom + 20) this.items.splice(i, 1);
    }

    // Boss
    this.boss.update(
      this.player,
      this.danmaku,
      this.audio,
      (x, y, col, count) => this.createExplosionParticles(x, y, col, count),
      (phase, captured) => {
        if (phase.isSpell && captured) {
          const bonus = 100000;
          this.player.score += bonus;
          this.spellCardsCaptured++;
          this.addFloatingText(
            this.boss.x,
            this.boss.y - 30,
            "SYUKRAN! +100,000",
            "#ffd700",
          );
          this.chat("habibi", `Kartu ilmu ditaklukkan! +100,000 ✨`, "good");
          this.chat(
            "ustaz",
            `Bismillah… kartu ilmu berikutnya, habibi! 💪`,
            "good",
          );
          // Tampilkan penjelasan grammar sebagai floating text
          const g = window.Arabic.grammar[phase.grammar];
          if (g) {
            this.addFloatingText(
              this.boss.x,
              this.boss.y + 10,
              g.title,
              "#00e5ff",
              120,
            );
            this.addFloatingText(
              this.boss.x,
              this.boss.y + 32,
              g.body.slice(0, 60),
              "#b0e0ff",
              120,
            );
            this.chat("ustaz", `${g.title} — ${g.body}`);
          }
        }
        this.spawnItems(this.boss.x, this.boss.y, 4, 6, 0.7);
      },
    );

    if (this.boss.defeated) {
      this.state = "VICTORY";
      const clearBonus =
        500000 + this.player.lives * 100000 + this.player.bombs * 50000;
      this.player.score += clearBonus;
      this.chat(
        "habibi",
        window.Arabic.randomFrom(window.Arabic.victoryQuotes),
        "good",
      );
      this.chat(
        "ustaz",
        "Masya Allah… kamu lulus pelajaran ini, habibi! 🎓",
        "good",
      );
      if (this.player.score > this.highScore) {
        this.highScore = this.player.score;
        localStorage.setItem("tajawwul_hiscore", this.highScore.toString());
      }
      return;
    }

    // Bullets
    this.danmaku.update(this.playBounds, this.player, this.boss);

    // Collision pemain
    this.danmaku.checkPlayerCollisions(
      this.player,
      (hitBullet) => {
        const wasHit = this.player.hit(this.audio, (x, y, col, count) =>
          this.createExplosionParticles(x, y, col, count),
        );
        if (wasHit) {
          this.boss.spellCaptured = false;
          // Tampilkan huruf yang membunuh (edukasi saat mati!)
          const q = window.Arabic.randomFrom(window.Arabic.deathQuotes);
          this.addFloatingText(this.player.x, this.player.y - 30, q, "#ff5252");
          this.chat("habibi", `Kena! ${q}`, "bad");
          this.chat("ustaz", `Fokus, habibi! Jangan lengah ⚠️`, "bad");
        }
      },
      (grazeBullet) => {
        this.player.graze++;
        this.player.score += 50;
        this.audio.playGraze();
        this.addParticle(
          this.player.x,
          this.player.y,
          "#ffffff",
          2.5,
          null,
          null,
          12,
        );
      },
    );

    this.danmaku.checkBossCollisions(this.boss, (playerBullet) => {
      this.player.score += 10;
      this.audio.playHit();
      this.addParticle(
        playerBullet.x,
        playerBullet.y,
        "#ffffff",
        2,
        (Math.random() - 0.5) * 2,
        -Math.random() * 2,
        8,
      );
    });

    if (this.player.bombActive) this.boss.spellCaptured = false;

    if (this.player.score > this.highScore) this.highScore = this.player.score;
  }

  // =========================================================
  // RENDER
  // =========================================================
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawGameFrame();
    this.drawPlayfield();
    this.drawSideHUD();

    if (this.state === "TITLE") this.drawTitleScreen();
    else if (this.state === "PAUSED") this.drawPauseScreen();
    else if (this.state === "GAMEOVER") this.drawGameOverScreen();
    else if (this.state === "VICTORY") this.drawVictoryScreen();
    else if (this.state === "QUIZ") this.drawQuizScreen();
  }

  drawGameFrame() {
    // Latar polos — tanpa gradien supaya HUD terbaca lebih jelas
    this.ctx.fillStyle = "#0c0b09";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(10, 10, this.width - 20, this.height - 20);
  }

  drawPlayfield() {
    const pb = this.playBounds;
    const ctx = this.ctx;
    ctx.save();

    ctx.beginPath();
    ctx.rect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);
    ctx.clip();

    // Langit malam gurun
    const skyGrad = ctx.createLinearGradient(
      pb.left,
      pb.top,
      pb.left,
      pb.bottom,
    );
    skyGrad.addColorStop(0, "#0b0a1f");
    skyGrad.addColorStop(0.6, "#1f140a");
    skyGrad.addColorStop(1, "#2c1608");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);

    // Bulan sabit emas
    const moonX = pb.right - 90;
    const moonY = pb.top + 80;
    const moonGrad = ctx.createRadialGradient(
      moonX,
      moonY,
      12,
      moonX,
      moonY,
      55,
    );
    moonGrad.addColorStop(0, "rgba(255, 245, 210, 0.95)");
    moonGrad.addColorStop(0.3, "rgba(255, 200, 90, 0.55)");
    moonGrad.addColorStop(1, "rgba(255, 180, 60, 0)");
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 55, 0, Math.PI * 2);
    ctx.fill();
    // Sabit
    ctx.fillStyle = "#fff6d8";
    ctx.beginPath();
    ctx.arc(moonX, moonY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0a1f";
    ctx.beginPath();
    ctx.arc(moonX + 10, moonY - 4, 20, 0, Math.PI * 2);
    ctx.fill();

    // Glyph Arab melayang (edukasi ambient)
    this.backgroundGlyphs.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.font = `${p.size}px "Amiri", serif`;
      ctx.fillStyle = "#ffd700";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";
      ctx.fillText(p.glyph, 0, 0);
      ctx.restore();
    });

    // Boss
    this.boss.draw(ctx);
    // Items
    this.drawItems();
    // Player
    this.player.draw(ctx);
    // Bullets
    this.danmaku.draw(ctx);
    // Partikel & teks
    this.drawParticles();
    this.drawFloatingTexts();
    // Bar HP boss
    this.drawBossTopBar();

    ctx.restore();

    // Border lapangan: satu garis tipis, tanpa double-line & glow
    ctx.strokeStyle = "rgba(212, 175, 55, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);
  }

  drawBossTopBar() {
    if (!this.boss.alive || this.boss.defeated) return;

    const pb = this.playBounds;
    const barX = pb.left + 20;
    const barY = pb.top + 14;
    const barW = pb.right - pb.left - 40;
    const barH = 7;

    const remainingPhases = this.boss.phases.length - this.boss.currentPhaseIdx;
    for (let p = 0; p < remainingPhases; p++) {
      this.ctx.fillStyle = p === remainingPhases - 1 ? "#ff3366" : "#ffd700";
      this.ctx.beginPath();
      this.ctx.arc(barX + p * 14, barY - 6, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.fillStyle = this.boss.timeLeft <= 10 ? "#ff3344" : "#ffffff";
    this.ctx.textAlign = "right";
    this.ctx.fillText(`${this.boss.timeLeft}`, pb.right - 20, barY + 1);

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    this.ctx.fillRect(barX, barY, barW - 35, barH);

    const hpRatio = Math.max(0, this.boss.hp / this.boss.currentPhase.maxHp);
    this.ctx.fillStyle = this.boss.currentPhase.isSpell ? "#ff3366" : "#ffcc33";
    this.ctx.fillRect(barX, barY, (barW - 35) * hpRatio, barH);

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(barX, barY, barW - 35, barH);
  }

  drawItems() {
    this.items.forEach((it) => {
      this.ctx.save();
      this.ctx.translate(it.x, it.y);

      if (it.type === "word") {
        // Orb kata Arab hijau bercahaya
        this.ctx.shadowColor = "#00e676";
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = "#00c853";
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 11, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = 'bold 13px "Amiri", serif';
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.direction = "rtl";
        this.ctx.fillText(it.word ? it.word.ar.charAt(0) : "ء", 0, 1);
        this.ctx.direction = "ltr";
      } else {
        this.ctx.fillStyle = it.color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -9);
        this.ctx.lineTo(9, 0);
        this.ctx.lineTo(0, 9);
        this.ctx.lineTo(-9, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = "#ffffff";
        this.ctx.lineWidth = 1.2;
        this.ctx.stroke();
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "bold 9px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(it.label, 0, 1);
      }

      this.ctx.restore();
    });
  }

  drawParticles() {
    this.particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawFloatingTexts() {
    this.floatingTexts.forEach((ft) => {
      const alpha = ft.life / ft.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.font = 'bold 13px "Amiri", "Rajdhani", sans-serif';
      this.ctx.fillStyle = ft.color;
      this.ctx.shadowColor = "#000000";
      this.ctx.shadowBlur = 4;
      this.ctx.textAlign = "center";
      this.ctx.direction = "auto";
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    });
  }

  // =========================================================
  // HUD SAMPING
  // =========================================================
  drawSideHUD() {
    const hb = this.hudBounds;
    const ctx = this.ctx;
    const midX = (hb.left + hb.right) / 2;
    ctx.save();
    ctx.direction = "ltr";

    // Panel polos: latar gelap + garis tipis, tanpa glow
    ctx.fillStyle = "rgba(12, 11, 9, 0.94)";
    ctx.fillRect(hb.left, hb.top, hb.right - hb.left, hb.bottom - hb.top);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(hb.left, hb.top, hb.right - hb.left, hb.bottom - hb.top);

    const xLabel = hb.left + 18;
    const xVal = hb.right - 18;

    let y = hb.top + 34;
    ctx.textAlign = "center";
    ctx.font = 'bold 16px "Cinzel", Georgia, serif';
    ctx.fillStyle = "#f2efe8";
    ctx.fillText("TAJAWWUL", midX, y);

    y += 17;
    ctx.font = '12px "Amiri", Georgia, serif';
    ctx.fillStyle = "#a8a294";
    ctx.fillText("تجوال · Pertempuran Bahasa Arab", midX, y);

    y += 18;
    this.hudDivider(y, xLabel, xVal);
    y += 26;

    this.drawHudRow("HiScore", this.highScore.toLocaleString(), y, "#e6cf8f");
    y += 29;

    this.drawHudRow("Score", this.player.score.toLocaleString(), y, "#ffffff");
    y += 34;

    // Nyawa
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#a8a294";
    ctx.textAlign = "left";
    ctx.fillText("Player", xLabel, y);
    let lives = "";
    for (let i = 0; i < this.player.lives; i++) lives += "★ ";
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = "#ff6b8a";
    ctx.textAlign = "right";
    ctx.fillText(lives.trim() || "—", xVal, y);
    y += 29;

    // Bomb
    ctx.font = "13px sans-serif";
    ctx.fillStyle = "#a8a294";
    ctx.textAlign = "left";
    ctx.fillText("Bomb", xLabel, y);
    let bombs = "";
    for (let i = 0; i < this.player.bombs; i++) bombs += "★ ";
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillStyle = "#5fe0a0";
    ctx.textAlign = "right";
    ctx.fillText(bombs.trim() || "—", xVal, y);
    y += 34;

    this.drawHudRow(
      "Power",
      `${this.player.power.toFixed(2)} / 4.00`,
      y,
      "#f2efe8",
    );
    y += 29;

    this.drawHudRow("Graze", this.player.graze.toString(), y, "#f2efe8");
    y += 29;

    this.drawHudRow(
      "Kuis",
      `${this.quizCorrect}/${this.quizAsked} ✔`,
      y,
      "#f2efe8",
    );
    y += 29;

    this.drawHudRow("Kata hafal", `${this.wordsCollected} 📚`, y, "#f2efe8");
    y += 29;

    // Rank — label pendek biar tetap terbaca jelas di lebar panel
    const rankLabel =
      this.diffShort[this.difficulty] || this.difficulty.toUpperCase();
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = "#a8a294";
    ctx.textAlign = "left";
    ctx.fillText("Rank", xLabel, y);
    ctx.fillStyle = this.difficulty === "lunatic" ? "#ff4d6d" : "#e6cf8f";
    ctx.textAlign = "right";
    ctx.fillText(rankLabel, xVal, y);
    y += 26;

    // Pemisah blok
    y += 6;
    this.hudDivider(y, xLabel, xVal);
    y += 30;

    // Kotak info boss — garis tipis, tanpa glow
    const boxH = 92;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.strokeRect(xLabel, y, xVal - xLabel, boxH);

    ctx.textAlign = "center";
    ctx.font = 'bold 12px "Amiri", Georgia, serif';
    ctx.fillStyle = "#f2efe8";
    ctx.fillText("BOSS · الأستاذ (Al-Ustaz)", midX, y + 20);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#a8a294";
    ctx.fillText(
      `Phase ${this.boss.currentPhaseIdx + 1} / ${this.boss.phases.length}`,
      midX,
      y + 42,
    );

    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = this.boss.currentPhase.isSpell ? "#e6cf8f" : "#8b857a";
    ctx.fillText(
      this.boss.currentPhase.isSpell ? "KARTU ILMU AKTIF" : "LATIHAN",
      midX,
      y + 62,
    );

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#8b857a";
    ctx.fillText(`Kartu ditaklukkan: ${this.spellCardsCaptured}`, midX, y + 80);

    y += boxH + 14;
    this.hudDivider(y, xLabel, xVal);
    y += 24;

    // Info ringkas — dipadatkan biar HUD tidak ramai
    ctx.textAlign = "left";
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#8b857a";
    ctx.fillText("🎵 BGM: Qawlu Qawlu Sawarim", xLabel, y);
    y += 15;
    ctx.fillText(
      `Mode: ${this.audio.bgmMode.toUpperCase()} (N = ganti)`,
      xLabel,
      y,
    );
    y += 15;
    ctx.fillText("Mute: M · Pause: P", xLabel, y);
    y += 26;

    ctx.font = "bold 11px sans-serif";
    ctx.fillStyle = "#a8a294";
    ctx.fillText("KONTROL", xLabel, y);
    y += 15;
    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#8b857a";
    this.wrapText(
      ctx,
      "Arrow / WASD gerak · Z tembak · Shift fokus · X bomb · Esc jeda",
      xLabel,
      y,
      xVal - xLabel,
      15,
    );

    ctx.restore();
  }

  // Garis pemisah tipis antar blok HUD
  hudDivider(y, x1, x2) {
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y + 0.5);
    this.ctx.lineTo(x2, y + 0.5);
    this.ctx.stroke();
  }

  drawHudRow(label, value, y, valColor = "#ffffff") {
    const hb = this.hudBounds;
    this.ctx.font = "13px sans-serif";
    this.ctx.fillStyle = "#a8a294";
    this.ctx.textAlign = "left";
    this.ctx.fillText(label, hb.left + 18, y);

    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.fillStyle = valColor;
    this.ctx.textAlign = "right";
    this.ctx.fillText(value, hb.right - 18, y);
  }

  // =========================================================
  // LAYAR OVERLAY
  // =========================================================
  drawTitleScreen() {
    const pb = this.playBounds;
    const cx = (pb.left + pb.right) / 2;
    const cy = (pb.top + pb.bottom) / 2;
    const ctx = this.ctx;

    ctx.save();
    ctx.fillStyle = "rgba(10, 9, 8, 0.92)";
    ctx.fillRect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);

    ctx.textAlign = "center";
    ctx.font = 'bold 32px "Cinzel", Georgia, serif';
    ctx.fillStyle = "#ffffff";
    ctx.fillText("TAJAWWUL", cx, cy - 130);

    ctx.font = 'bold 20px "Amiri", Georgia, serif';
    ctx.fillStyle = "#e6cf8f";
    ctx.fillText("تجوال — BULLET HELL ARAB", cx, cy - 96);

    ctx.font = '14px "Rajdhani", sans-serif';
    ctx.fillStyle = "#a8a294";
    ctx.fillText(
      "Tugas Bahasa Arab — elak peluru huruf hijaiyah!",
      cx,
      cy - 66,
    );

    // Dekorasi cincin — garis tipis tanpa glow
    ctx.strokeStyle = "rgba(212, 175, 55, 0.40)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '28px "Amiri", Georgia, serif';
    ctx.fillStyle = "#e6cf8f";
    ctx.direction = "rtl";
    ctx.fillText("الْحُرُوف", cx, cy + 8);
    ctx.direction = "ltr";

    const blink = Math.floor(Date.now() / 450) % 2 === 0;
    ctx.font = 'bold 16px "Rajdhani", sans-serif';
    ctx.fillStyle = blink ? "#ffffff" : "#e6cf8f";
    ctx.fillText("TEKAN [ Z ] ATAU KLIK UNTUK MULAI", cx, cy + 92);

    ctx.font = '12px "Rajdhani", sans-serif';
    ctx.fillStyle = "#8b857a";
    ctx.fillText(
      "BGM: Qawlu Qawlu Sawarim (drop mp3 ke assets/)",
      cx,
      cy + 130,
    );
    const titleRank =
      this.diffLabels[this.difficulty] || this.difficulty.toUpperCase();
    // Label rank kini panjang-panjang → font kecil biar muat
    const rankTitleFont =
      titleRank.length > 36 ? 9 : titleRank.length > 20 ? 11 : 13;
    ctx.font = `${rankTitleFont}px "Rajdhani", sans-serif`;
    ctx.fillStyle = "#a8a294";
    ctx.fillText(
      `Rank: ${titleRank}  |  Lives: ${this.player.lives}  |  Bombs: ${this.player.bombs}`,
      cx,
      cy + 154,
    );

    ctx.restore();
  }

  drawPauseScreen() {
    const pb = this.playBounds;
    const cx = (pb.left + pb.right) / 2;
    const cy = (pb.top + pb.bottom) / 2;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.70)";
    this.ctx.fillRect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);

    this.ctx.textAlign = "center";
    this.ctx.font = 'bold 28px "Amiri", Georgia, serif';
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillText("توقّف PAUSED", cx, cy - 16);

    this.ctx.font = '14px "Rajdhani", sans-serif';
    this.ctx.fillStyle = "#e6cf8f";
    this.ctx.fillText("Tekan [ P ] atau [ Esc ] untuk lanjut", cx, cy + 20);
    this.ctx.restore();
  }

  drawQuizScreen() {
    const box = this.getQuizBox();
    const ctx = this.ctx;
    const q = this.quiz;
    if (!q) return;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(
      this.playBounds.left,
      this.playBounds.top,
      this.playBounds.right - this.playBounds.left,
      this.playBounds.bottom - this.playBounds.top,
    );

    // Panel kuis — permukaan polos, garis tipis
    ctx.fillStyle = "rgba(14, 13, 11, 0.97)";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    ctx.textAlign = "left";
    ctx.font = 'bold 16px "Rajdhani", sans-serif';
    ctx.fillStyle = "#f2efe8";
    ctx.fillText("KUIS MENDADAK", box.x + 18, box.y + 32);

    ctx.font = '14px "Rajdhani", sans-serif';
    ctx.fillStyle = "#a8a294";
    ctx.textAlign = "right";
    const remain = Math.ceil(this.quizTimer / 60);
    ctx.fillText(
      `⏱ ${remain}s  •  Streak: ${this.streak}`,
      box.x + box.w - 18,
      box.y + 32,
    );

    // Pertanyaan (tag HTML dibuang — canvas render teks polos)
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.font = 'bold 22px "Amiri", "Rajdhani", sans-serif';
    ctx.fillStyle = "#f2efe8";
    const plainQ = String(q.q).replace(/<[^>]+>/g, "");
    this.wrapText(ctx, plainQ, box.x + 18, box.y + 72, box.w - 36, 28);

    // Opsi 4 — posisi sama persis dengan deteksi klik (getQuizOptionRect)
    for (let i = 0; i < 4; i++) {
      const r = this.getQuizOptionRect(i);
      const selected = i === this.quizIndex;
      ctx.fillStyle = selected
        ? "rgba(212, 175, 55, 0.18)"
        : "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = selected ? "#d4af37" : "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.fillStyle = "#e6cf8f";
      ctx.font = 'bold 16px "Rajdhani", sans-serif';
      ctx.textAlign = "left";
      ctx.fillText(`${i + 1}.`, r.x + 12, r.y + 33);

      ctx.fillStyle = "#f2efe8";
      ctx.font = '20px "Amiri", "Rajdhani", sans-serif';
      ctx.direction = "auto";
      ctx.fillText(q.options[i], r.x + 44, r.y + 34);
      ctx.direction = "ltr";
    }

    ctx.font = '13px "Rajdhani", sans-serif';
    ctx.fillStyle = "#8b857a";
    ctx.textAlign = "center";
    ctx.fillText(
      "↑↓ pilih • [Z] jawab • [X] lewat • atau klik opsi",
      box.x + box.w / 2,
      box.y + box.h - 18,
    );

    ctx.restore();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, yy);
        line = words[n] + " ";
        yy += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, yy);
  }

  drawGameOverScreen() {
    const pb = this.playBounds;
    const cx = (pb.left + pb.right) / 2;
    const cy = (pb.top + pb.bottom) / 2;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(24, 8, 9, 0.92)";
    this.ctx.fillRect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);

    this.ctx.textAlign = "center";
    this.ctx.font = 'bold 30px "Cinzel", Georgia, serif';
    this.ctx.fillStyle = "#ff5c72";
    this.ctx.fillText("GAME OVER", cx, cy - 80);

    this.ctx.font = 'bold 18px "Amiri", Georgia, serif';
    this.ctx.fillStyle = "#f2efe8";
    this.ctx.fillText("أَسْتَغْفِرُ اللَّهَ — Astaghfirullah!", cx, cy - 50);

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = "#f2efe8";
    this.ctx.fillText(
      `Final Score: ${this.player.score.toLocaleString()}`,
      cx,
      cy,
    );
    this.ctx.fillText(`Graze: ${this.player.graze}`, cx, cy + 26);
    this.ctx.fillText(
      `Kuis benar: ${this.quizCorrect}/${this.quizAsked}`,
      cx,
      cy + 52,
    );
    this.ctx.fillText(`Kata hafal: ${this.wordsCollected}`, cx, cy + 78);

    const blink = Math.floor(Date.now() / 450) % 2 === 0;
    this.ctx.font = 'bold 16px "Rajdhani", sans-serif';
    this.ctx.fillStyle = blink ? "#ffffff" : "#e6cf8f";
    this.ctx.fillText("TEKAN [ Z ] UNTUK COBA LAGI", cx, cy + 130);

    this.ctx.restore();
  }

  drawVictoryScreen() {
    const pb = this.playBounds;
    const cx = (pb.left + pb.right) / 2;
    const cy = (pb.top + pb.bottom) / 2;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(9, 20, 14, 0.93)";
    this.ctx.fillRect(pb.left, pb.top, pb.right - pb.left, pb.bottom - pb.top);

    this.ctx.textAlign = "center";
    this.ctx.font = 'bold 28px "Cinzel", Georgia, serif';
    this.ctx.fillStyle = "#e6cf8f";
    this.ctx.fillText("SEMUA FASE SELESAI!", cx, cy - 100);

    this.ctx.font = 'bold 20px "Amiri", Georgia, serif';
    this.ctx.fillStyle = "#f2efe8";
    this.ctx.fillText("MASHA ALLAH — KAMU MENANG!", cx, cy - 65);

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = "#f2efe8";
    this.ctx.fillText(
      `Final Score: ${this.player.score.toLocaleString()}`,
      cx,
      cy - 20,
    );
    this.ctx.fillText(`Graze Total: ${this.player.graze}`, cx, cy + 8);
    this.ctx.fillText(
      `Kuis Benar: ${this.quizCorrect} / ${this.quizAsked}`,
      cx,
      cy + 36,
    );
    this.ctx.fillText(`Kata Hafal: ${this.wordsCollected} 📚`, cx, cy + 64);
    this.ctx.fillText(
      `Kartu Ditaklukkan: ${this.spellCardsCaptured} / 3`,
      cx,
      cy + 92,
    );

    const acc = this.quizAsked > 0 ? this.quizCorrect / this.quizAsked : 0;
    const rank =
      acc >= 0.9
        ? "NILAI A+ — MASTER ARAB"
        : acc >= 0.6
          ? "LULUS BAHASA ARAB"
          : "SURVIVOR";
    this.ctx.font = 'bold 15px "Rajdhani", sans-serif';
    this.ctx.fillStyle = "#5ad1e6";
    this.ctx.fillText(`Rank: ${rank}`, cx, cy + 124);

    const blink = Math.floor(Date.now() / 450) % 2 === 0;
    this.ctx.fillStyle = blink ? "#ffffff" : "#e6cf8f";
    this.ctx.fillText("TEKAN [ Z ] UNTUK MAIN LAGI", cx, cy + 165);

    this.ctx.restore();
  }
}

// Instantiate game when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  window.game = new Game();
});
