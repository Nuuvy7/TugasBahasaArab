class Boss {
  constructor(playBounds) {
    this.playBounds = playBounds;
    this.init();
  }

  init() {
    this.x = (this.playBounds.left + this.playBounds.right) / 2;
    this.y = this.playBounds.top + 100;
    this.targetX = this.x;
    this.targetY = this.y;
    this.radius = 28;

    this.alive = true;
    this.defeated = false;
    this.animFrame = 0;
    this.phaseTimer = 0;
    this.difficulty = "normal";

    this.phases = [
      {
        name: "الْحَرَكَات (Al-Harakat)",
        isSpell: false,
        maxHp: 800,
        timeLimit: 35,
        grammar: "harakat",
      },
      {
        name: 'دَرْس الْمُثَنَّى "Bentuk Dua"',
        isSpell: true,
        maxHp: 1000,
        timeLimit: 40,
        grammar: "dual",
      },
      {
        name: "التَّعَرُّفْ وَالتَّنْكِيرْ",
        isSpell: false,
        maxHp: 900,
        timeLimit: 35,
        grammar: "taarof",
      },
      {
        name: 'دَرْس الْإِضَافَة "Idhafah"',
        isSpell: true,
        maxHp: 1100,
        timeLimit: 45,
        grammar: "idhafah",
      },
      {
        name: 'لَامُ التَّعْلِيل "Lam Ta’lil"',
        isSpell: true,
        maxHp: 1400,
        timeLimit: 55,
        grammar: "lamTaalil",
      },
    ];

    this.currentPhaseIdx = 0;
    this.currentPhase = this.phases[0];
    this.hp = this.currentPhase.maxHp;
    this.timeLeft = this.currentPhase.timeLimit;
    this.spellCaptured = true;

    this.spellBannerTimer = 0;
    this.spellBannerName = "";
    this.tauntTimer = 0;
    this.tauntText = "";
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  // Kepadatan peluru per difficulty (dipakai executePattern tiap frame)
  getDiffMult() {
    const cfg =
      window.game && window.game.diffConfig
        ? window.game.diffConfig[this.difficulty]
        : null;
    if (cfg) return cfg.multiplier;
    // fallback kalau game belum siap
    return this.difficulty === "easy"
      ? 0.4
      : this.difficulty === "hard"
        ? 0.7
        : this.difficulty === "lunatic"
          ? 1.4
          : 1.0;
  }

  takeDamage(amount) {
    if (!this.alive || this.defeated) return;
    this.hp -= amount;
  }

  nextPhase(danmakuEngine, audioManager, createParticles, onPhaseComplete) {
    audioManager.playSpellCard();
    danmakuEngine.clearEnemyBullets(createParticles);

    if (createParticles) {
      createParticles(this.x, this.y, "#ffd700", 35);
      createParticles(this.x, this.y, "#ff8844", 25);
    }

    if (onPhaseComplete) onPhaseComplete(this.currentPhase, this.spellCaptured);

    this.currentPhaseIdx++;
    if (this.currentPhaseIdx >= this.phases.length) {
      this.alive = false;
      this.defeated = true;
      audioManager.playBossDefeat();
      return;
    }

    this.currentPhase = this.phases[this.currentPhaseIdx];
    this.hp = this.currentPhase.maxHp;
    this.timeLeft = this.currentPhase.timeLimit;
    this.phaseTimer = 0;
    this.spellCaptured = true;

    this.targetX = (this.playBounds.left + this.playBounds.right) / 2;
    this.targetY = this.playBounds.top + 100;

    if (this.currentPhase.isSpell) {
      this.spellBannerTimer = 170;
      this.spellBannerName = this.currentPhase.name;
    }
  }

  update(
    player,
    danmakuEngine,
    audioManager,
    createParticles,
    onPhaseComplete,
  ) {
    if (!this.alive || this.defeated) return;
    this.animFrame++;
    this.phaseTimer++;

    this.x += (this.targetX - this.x) * 0.05;
    this.y += (this.targetY - this.y) * 0.05;
    this.y += Math.sin(this.animFrame * 0.04) * 0.7;

    if (this.animFrame % 60 === 0 && this.timeLeft > 0) {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.spellCaptured = false;
        this.nextPhase(
          danmakuEngine,
          audioManager,
          createParticles,
          onPhaseComplete,
        );
        return;
      }
    }

    if (this.hp <= 0) {
      this.nextPhase(
        danmakuEngine,
        audioManager,
        createParticles,
        onPhaseComplete,
      );
      return;
    }

    if (this.spellBannerTimer > 0) this.spellBannerTimer--;
    if (this.tauntTimer > 0) this.tauntTimer--;

    // Peekan taunt tiap 8 detik
    if (this.animFrame % 480 === 0) {
      this.tauntText = window.Arabic.randomFrom(window.Arabic.bossTaunts);
      this.tauntTimer = 150;
      if (window.game && window.game.chat)
        window.game.chat("ustaz", this.tauntText, "bad");
    }

    this.executePattern(player, danmakuEngine, audioManager);
  }

  executePattern(player, danmakuEngine, audioManager) {
    const t = this.phaseTimer;
    const diffMult = this.getDiffMult();

    switch (this.currentPhaseIdx) {
      case 0:
        this.patternPhase1(t, player, danmakuEngine, diffMult);
        break;
      case 1:
        this.patternPhase2(t, player, danmakuEngine, audioManager, diffMult);
        break;
      case 2:
        this.patternPhase3(t, player, danmakuEngine, diffMult);
        break;
      case 3:
        this.patternPhase4(t, player, danmakuEngine, diffMult);
        break;
      case 4:
        this.patternPhase5(t, player, danmakuEngine, audioManager, diffMult);
        break;
    }
  }

  // =========================================================
  // FASE 1 — AL-HARAKAT (latihan / bukan kartu ilmu)
  // Cincin huruf berputar + semburan huruf berharakat
  // =========================================================
  patternPhase1(t, player, danmakuEngine, diffMult) {
    if (t % 240 === 0) {
      this.targetX =
        this.playBounds.left +
        70 +
        Math.random() * (this.playBounds.right - this.playBounds.left - 140);
      this.targetY = this.playBounds.top + 70 + Math.random() * 80;
    }

    // Cincin huruf spiral
    if (t % 10 === 0) {
      const angle = t * 0.08;
      const arms = Math.max(3, Math.round(5 * diffMult));
      for (let i = 0; i < arms; i++) {
        const a = angle + (i * Math.PI * 2) / arms;
        danmakuEngine.addBullet({
          x: this.x,
          y: this.y,
          speed: 2.3,
          angle: a,
          type: "letter",
          color: "#ffcc33",
          hitboxRadius: 7,
          letterSize: 30,
        });
      }
    }

    // Semburan terarah (huruf berharakat)
    if (t % 50 === 0) {
      const aim = Math.atan2(player.y - this.y, player.x - this.x);
      const count = Math.round(5 * diffMult);
      danmakuEngine.fireSpread(
        this.x,
        this.y,
        count,
        0.45,
        aim,
        4.2,
        "letter",
        "#ff6b6b",
        {
          hitboxRadius: 7,
          letterSize: 32,
        },
      );
    }
  }

  // =========================================================
  // FASE 2 — دَرْس الْمُثَنَّى "Bentuk Dua" (KARTU ILMU)
  // Huruf membeku jadi cincin lalu melesat ke pemain
  // =========================================================
  patternPhase2(t, player, danmakuEngine, audioManager, diffMult) {
    const cycle = t % 300;

    if (cycle === 1) {
      this.targetX = (this.playBounds.left + this.playBounds.right) / 2;
      this.targetY = this.playBounds.top + 130;
    }

    // Membekukan cincin huruf
    if (cycle >= 40 && cycle <= 160 && cycle % 20 === 0) {
      audioManager.playGraze();
      const ringRadius = 70 + (cycle - 40) * 1.8;
      const count = Math.round(14 * diffMult);
      const rot = cycle * 0.1;
      const delayLeft = 200 - cycle;

      for (let i = 0; i < count; i++) {
        const ang = rot + (i * Math.PI * 2) / count;
        const bx = this.x + Math.cos(ang) * ringRadius;
        const by = this.y + Math.sin(ang) * ringRadius;
        const color = i % 2 === 0 ? "#00e5ff" : "#ffcc33";

        danmakuEngine.addBullet({
          x: bx,
          y: by,
          speed: 0.01,
          angle: ang,
          type: "letter",
          color,
          hitboxRadius: 7,
          letterSize: 30,
          delay: delayLeft,
          aimAtPlayerOnRelease: true,
          postDelaySpeed: 3.8 + (i % 3) * 0.6,
        });
      }
    }

    // Detak sebelum meledak
    if (cycle >= 170 && cycle < 200 && cycle % 8 === 0)
      audioManager.playGraze();

    // Ledakan cincin saat waktu kembali
    if (cycle === 205) {
      audioManager.playSpellCard();
      danmakuEngine.fireRing(
        this.x,
        this.y,
        Math.round(22 * diffMult),
        2.8,
        "star",
        "#ff66cc",
      );
    }
  }

  // =========================================================
  // FASE 3 — التَّعَرُّفْ وَالتَّنْكِيرْ (latihan / bukan kartu ilmu)
  // Heliks ganda: huruf "ال" vs huruf tanpa alif-lam
  // =========================================================
  patternPhase3(t, player, danmakuEngine, diffMult) {
    if (t % 180 === 0) {
      this.targetX =
        this.playBounds.left +
        80 +
        Math.random() * (this.playBounds.right - this.playBounds.left - 160);
      this.targetY = this.playBounds.top + 80 + Math.random() * 60;
    }

    // Dua heliks berlawanan
    if (t % 6 === 0) {
      const a1 = t * 0.07;
      const a2 = -t * 0.07;
      const count = Math.round(3 * diffMult);
      for (let i = 0; i < count; i++) {
        const off = (i * Math.PI * 2) / count;
        danmakuEngine.addBullet({
          x: this.x,
          y: this.y,
          speed: 2.8,
          angle: a1 + off,
          type: "letter",
          color: "#4dd0e1",
          hitboxRadius: 7,
          letterSize: 26,
        });
        danmakuEngine.addBullet({
          x: this.x,
          y: this.y,
          speed: 2.8,
          angle: a2 + off,
          type: "letter",
          color: "#ffcc33",
          hitboxRadius: 7,
          letterSize: 26,
        });
      }
    }

    // Orb besar "ال" (alif-lam) — kata definit
    if (t % 75 === 0) {
      const aim = Math.atan2(player.y - this.y, player.x - this.x);
      danmakuEngine.fireSpread(
        this.x,
        this.y,
        Math.round(4 * diffMult),
        0.35,
        aim,
        3.2,
        "orb",
        "#ffee58",
        {
          radius: 9,
          hitboxRadius: 5,
        },
      );
    }
  }

  // =========================================================
  // FASE 4 — دَرْس الْإِضَافَة "Idhafah" (KARTU ILMU)
  // Peluru memantul dinding (rantai kata milik-milik)
  // =========================================================
  patternPhase4(t, player, danmakuEngine, diffMult) {
    this.targetX =
      (this.playBounds.left + this.playBounds.right) / 2 +
      Math.sin(t * 0.02) * 120;
    this.targetY = this.playBounds.top + 90;

    // Semburan memantul
    if (t % 14 === 0) {
      const side = Math.floor(t / 14) % 2 === 0 ? -1 : 1;
      const baseAngle = Math.PI / 2 + side * (0.6 + Math.sin(t * 0.05) * 0.4);
      const count = Math.round(4 * diffMult);

      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.12;
        danmakuEngine.addBullet({
          x: this.x,
          y: this.y,
          speed: 3.4 + i * 0.4,
          angle: baseAngle + spread,
          type: "letter",
          color: side === 1 ? "#00e676" : "#b388ff",
          hitboxRadius: 7,
          letterSize: 28,
          bounces: 2,
        });
      }
    }

    // Cincin koin idhafah
    if (t % 55 === 0) {
      danmakuEngine.fireRing(
        this.x,
        this.y,
        Math.round(16 * diffMult),
        2.0,
        "coin",
        "#ffd54f",
        t * 0.04,
      );
    }
  }

  // =========================================================
  // FASE 5 — لَامُ التَّعْلِيل "Lam Ta'lil" (KARTU ILMU FINAL)
  // Klimaks: mandala huruf + tebasan pedang (صوارm) + bintang
  // =========================================================
  patternPhase5(t, player, danmakuEngine, audioManager, diffMult) {
    const cycle = t % 360;

    this.targetX =
      (this.playBounds.left + this.playBounds.right) / 2 +
      Math.sin(t * 0.03) * 110;
    this.targetY = this.playBounds.top + 110 + Math.cos(t * 0.06) * 35;

    // 1. Mandala huruf mekar
    if (cycle % 45 === 0) {
      const petals = Math.round(12 * diffMult);
      const rot = cycle * 0.05;
      danmakuEngine.fireRing(
        this.x,
        this.y,
        petals,
        2.2,
        "letter",
        "#ff69b4",
        rot,
        {
          hitboxRadius: 7,
          letterSize: 30,
        },
      );
      danmakuEngine.fireRing(
        this.x,
        this.y,
        petals,
        1.8,
        "star",
        "#ffd700",
        rot + Math.PI / petals,
        {
          radius: 7,
          hitboxRadius: 4,
        },
      );
    }

    // 2. Kipas tebasan pedang (صوارم)
    if (cycle % 35 === 0) {
      const aim = Math.atan2(player.y - this.y, player.x - this.x);
      const knives = Math.round(7 * diffMult);
      danmakuEngine.fireSpread(
        this.x,
        this.y,
        knives,
        0.7,
        aim,
        4.4,
        "slash",
        "#ffffff",
        { hitboxRadius: 5, radius: 6 },
      );
      danmakuEngine.fireSpread(
        this.x,
        this.y,
        knives - 2,
        0.5,
        aim,
        3.7,
        "slash",
        "#66ffff",
        { hitboxRadius: 5, radius: 6 },
      );
    }

    // 3. Pusaran huruf melengkung
    if (t % 6 === 0) {
      const angle = t * 0.13;
      danmakuEngine.addBullet({
        x: this.x,
        y: this.y,
        speed: 2.4,
        angle,
        angularVel: 0.006,
        type: "letter",
        color: "#ff1493",
        hitboxRadius: 7,
        letterSize: 26,
      });
      danmakuEngine.addBullet({
        x: this.x,
        y: this.y,
        speed: 2.4,
        angle: angle + Math.PI,
        angularVel: -0.006,
        type: "letter",
        color: "#b388ff",
        hitboxRadius: 7,
        letterSize: 26,
      });
    }

    // 4. Orb besar ON THE BEAT
    if (cycle === 180 || cycle === 350) {
      audioManager.playSpellCard();
      danmakuEngine.fireRing(
        this.x,
        this.y,
        Math.round(8 * diffMult),
        1.5,
        "orb",
        "#ff0055",
        0,
        {
          radius: 12,
          hitboxRadius: 6,
        },
      );
    }
  }

  // =========================================================
  // GAMBAR BOSS — Ustaz Arab
  // =========================================================
  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    this.drawMagicCircle(ctx);
    this.drawUstaz(ctx);

    ctx.restore();

    if (this.spellBannerTimer > 0) this.drawSpellBanner(ctx);
    if (this.tauntTimer > 0) this.drawTaunt(ctx);
  }

  // Cincin ilmu berhuruf Arab berputar (bukan sihir — sekadar dekorasi kaligrafi)
  drawMagicCircle(ctx) {
    const rot = this.animFrame * 0.015;
    ctx.save();

    ctx.strokeStyle = this.currentPhase.isSpell
      ? "rgba(255, 60, 100, 0.55)"
      : "rgba(255, 200, 60, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.stroke();

    // Huruf mengorbit
    ctx.rotate(rot);
    const glyphs = ["ا", "ل", "ل", "ه", "م", "د", "ل", "ل", "ه"];
    ctx.font = 'bold 11px "Amiri", serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.currentPhase.isSpell
      ? "rgba(255,120,160,0.85)"
      : "rgba(255,220,120,0.85)";
    glyphs.forEach((g, i) => {
      const a = (i * Math.PI * 2) / glyphs.length;
      ctx.save();
      ctx.translate(Math.cos(a) * 51, Math.sin(a) * 51);
      ctx.rotate(-rot); // biarkan huruf tegak
      ctx.fillText(g, 0, 0);
      ctx.restore();
    });

    ctx.restore();
  }

  drawUstaz(ctx) {
    // Jubah hitam (jas dosen)
    ctx.fillStyle = "#1b1b22";
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(13, -2);
    ctx.lineTo(16, 30);
    ctx.lineTo(-16, 30);
    ctx.closePath();
    ctx.fill();

    // Kemeja putih
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(-4, -2, 8, 14);

    // Dasi merah
    ctx.fillStyle = "#c62828";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-2.5, 4);
    ctx.lineTo(0, 12);
    ctx.lineTo(2.5, 4);
    ctx.closePath();
    ctx.fill();

    // Wajah
    ctx.fillStyle = "#f0c8a0";
    ctx.beginPath();
    ctx.arc(0, -10, 8, 0, Math.PI * 2);
    ctx.fill();

    // Jenggot tebal (ustaz!)
    ctx.fillStyle = "#4e342e";
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.quadraticCurveTo(0, 8, 7, -6);
    ctx.quadraticCurveTo(0, 2, -7, -6);
    ctx.fill();

    // Kacamata
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-3.5, -11, 3, 0, Math.PI * 2);
    ctx.arc(3.5, -11, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.5, -11);
    ctx.lineTo(0.5, -11);
    ctx.stroke();

    // Sorban / peci putih di kepala
    ctx.fillStyle = "#fafafa";
    ctx.beginPath();
    ctx.ellipse(0, -17, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(-10, -19, 20, 3);

    // Alis tebal (marah)
    ctx.strokeStyle = "#3e2723";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(-1.5, -12.5);
    ctx.moveTo(6, -14);
    ctx.lineTo(1.5, -12.5);
    ctx.stroke();

    // Tangan memegang penggaris / tongue (alat pukul ustaz)
    this.drawRuler(ctx, -16, 12, -0.5);
    this.drawRuler(ctx, 16, 12, 0.5);
  }

  drawRuler(ctx, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-2, -18, 4, 20);
    ctx.fillStyle = "#8a6d1d";
    ctx.fillRect(-2, -18, 4, 3);
    ctx.restore();
  }

  drawSpellBanner(ctx) {
    const alpha = Math.min(1, this.spellBannerTimer / 25);
    ctx.save();
    ctx.globalAlpha = alpha;

    const bannerY = this.playBounds.top + 70;
    const bannerH = 34;

    ctx.fillStyle = "rgba(14, 13, 11, 0.93)";
    ctx.fillRect(
      this.playBounds.left,
      bannerY,
      this.playBounds.right - this.playBounds.left,
      bannerH,
    );

    ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.playBounds.left,
      bannerY,
      this.playBounds.right - this.playBounds.left,
      bannerH,
    );

    ctx.font = 'bold 15px "Amiri", Georgia, serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "right";
    ctx.direction = "rtl";
    ctx.fillText(
      this.spellBannerName,
      this.playBounds.right - 18,
      bannerY + 23,
    );

    ctx.direction = "ltr";
    ctx.fillStyle = "#e6cf8f";
    ctx.textAlign = "left";
    ctx.font = 'bold 13px "Rajdhani", sans-serif';
    ctx.fillText("KARTU ILMU", this.playBounds.left + 16, bannerY + 23);

    ctx.restore();
  }

  drawTaunt(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.tauntTimer / 40);
    ctx.font = 'bold 13px "Rajdhani", sans-serif';
    ctx.fillStyle = "#ff8a99";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    const y = this.playBounds.bottom - 30;
    ctx.fillText(
      `💬 ${this.tauntText}`,
      (this.playBounds.left + this.playBounds.right) / 2,
      y,
    );
    ctx.restore();
  }
}

window.Boss = Boss;
