class Player {
  constructor(playBounds) {
    this.playBounds = playBounds;
    this.reset();
  }

  reset() {
    this.x = (this.playBounds.left + this.playBounds.right) / 2;
    this.y = this.playBounds.bottom - 70;

    this.normalSpeed = 4.8;
    this.focusSpeed = 2.2;
    this.hitboxRadius = 2.8;
    this.grazeRadius = 26;

    this.lives = 3;
    this.maxLives = 8;
    this.bombs = 3;
    this.maxBombs = 8;
    this.baseBombs = 3; // di-set sesuai difficulty waktu startGame

    this.power = 1.0;
    this.maxPower = 4.0;
    this.score = 0;
    this.graze = 0;

    this.focused = false;
    this.shooting = false;
    this.shootTimer = 0;

    this.invulnerableTimer = 180;
    this.bombActive = false;
    this.bombTimer = 0;
    this.bombRadius = 0;

    this.alive = true;
    this.animFrame = 0;
  }

  respawn() {
    this.x = (this.playBounds.left + this.playBounds.right) / 2;
    this.y = this.playBounds.bottom - 70;
    this.invulnerableTimer = 180;
    this.bombs = Math.max(this.baseBombs || 3, this.bombs); // sesuai difficulty
    this.alive = true;
  }

  update(keys, danmakuEngine, audioManager, createParticles) {
    if (!this.alive) return;
    this.animFrame++;

    this.focused = keys["Shift"] || keys["ShiftLeft"] || keys["ShiftRight"];
    const speed = this.focused ? this.focusSpeed : this.normalSpeed;

    let dx = 0;
    let dy = 0;
    if (keys["ArrowLeft"] || keys["KeyA"] || keys["a"]) dx -= 1;
    if (keys["ArrowRight"] || keys["KeyD"] || keys["d"]) dx += 1;
    if (keys["ArrowUp"] || keys["KeyW"] || keys["w"]) dy -= 1;
    if (keys["ArrowDown"] || keys["KeyS"] || keys["s"]) dy += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.x += dx * speed;
    this.y += dy * speed;

    const pad = 12;
    this.x = Math.max(
      this.playBounds.left + pad,
      Math.min(this.playBounds.right - pad, this.x),
    );
    this.y = Math.max(
      this.playBounds.top + pad,
      Math.min(this.playBounds.bottom - pad, this.y),
    );

    if (this.invulnerableTimer > 0) this.invulnerableTimer--;

    if (this.bombActive) {
      this.bombTimer--;
      this.bombRadius += 14;
      danmakuEngine.clearEnemyBullets(createParticles);
      if (this.bombTimer <= 0) this.bombActive = false;
    }

    this.shooting = keys["KeyZ"] || keys["z"] || keys["Space"] || keys[" "];
    this.shootTimer++;
    if (this.shooting && this.shootTimer >= 4) {
      this.shootTimer = 0;
      this.fireWeapons(danmakuEngine, audioManager);
    }

    if ((keys["KeyX"] || keys["x"]) && !this.bombActive && this.bombs > 0) {
      keys["KeyX"] = false;
      keys["x"] = false;
      this.triggerBomb(danmakuEngine, audioManager, createParticles);
    }
  }

  fireWeapons(danmakuEngine, audioManager) {
    audioManager.playShoot();
    const p = this.power;

    if (this.focused) {
      danmakuEngine.addPlayerBullet(
        this.x - 7,
        this.y - 12,
        0,
        -14,
        "#ffffff",
        false,
      );
      danmakuEngine.addPlayerBullet(
        this.x + 7,
        this.y - 12,
        0,
        -14,
        "#ffffff",
        false,
      );
      if (p >= 2.0) {
        danmakuEngine.addPlayerBullet(
          this.x - 14,
          this.y - 8,
          -0.6,
          -13,
          "#ffcc33",
          false,
        );
        danmakuEngine.addPlayerBullet(
          this.x + 14,
          this.y - 8,
          0.6,
          -13,
          "#ffcc33",
          false,
        );
      }
      if (p >= 3.0) {
        danmakuEngine.addPlayerBullet(
          this.x - 22,
          this.y - 4,
          -2,
          -9,
          "#ff66aa",
          true,
        );
        danmakuEngine.addPlayerBullet(
          this.x + 22,
          this.y - 4,
          2,
          -9,
          "#ff66aa",
          true,
        );
      }
    } else {
      danmakuEngine.addPlayerBullet(
        this.x - 6,
        this.y - 12,
        -0.4,
        -13,
        "#ffffff",
        false,
      );
      danmakuEngine.addPlayerBullet(
        this.x + 6,
        this.y - 12,
        0.4,
        -13,
        "#ffffff",
        false,
      );
      if (p >= 2.0) {
        danmakuEngine.addPlayerBullet(
          this.x - 12,
          this.y - 8,
          -2.2,
          -12,
          "#ffcc33",
          false,
        );
        danmakuEngine.addPlayerBullet(
          this.x + 12,
          this.y - 8,
          2.2,
          -12,
          "#ffcc33",
          false,
        );
      }
      if (p >= 3.0) {
        danmakuEngine.addPlayerBullet(
          this.x - 18,
          this.y - 4,
          -4.5,
          -11,
          "#ff66aa",
          false,
        );
        danmakuEngine.addPlayerBullet(
          this.x + 18,
          this.y - 4,
          4.5,
          -11,
          "#ff66aa",
          false,
        );
      }
      if (p >= 4.0) {
        danmakuEngine.addPlayerBullet(
          this.x - 24,
          this.y,
          -6.0,
          -10,
          "#ff99bb",
          false,
        );
        danmakuEngine.addPlayerBullet(
          this.x + 24,
          this.y,
          6.0,
          -10,
          "#ff99bb",
          false,
        );
      }
    }
  }

  // ===== BOMB: SHAWARMA HABIBI =====
  triggerBomb(danmakuEngine, audioManager, createParticles) {
    this.bombs--;
    this.bombActive = true;
    this.bombTimer = 220;
    this.bombRadius = 10;
    this.invulnerableTimer = 240;
    audioManager.playBomb();
    danmakuEngine.clearEnemyBullets(createParticles);
  }

  hit(audioManager, createParticles) {
    if (this.invulnerableTimer > 0 || this.bombActive) return false;

    this.lives--;
    audioManager.playPichuun();

    if (createParticles) {
      createParticles(this.x, this.y, "#ffffff", 40);
      createParticles(this.x, this.y, "#ff3366", 30);
    }

    if (this.lives > 0) {
      this.respawn();
    } else {
      this.alive = false;
    }
    return true;
  }

  draw(ctx) {
    if (!this.alive) return;

    if (this.invulnerableTimer > 0 && Math.floor(this.animFrame / 4) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);

    this.drawCharacter(ctx);
    this.drawSupportOrbs(ctx);
    if (this.focused) this.drawFocusHitbox(ctx);

    ctx.restore();

    if (this.bombActive) this.drawBombEffect(ctx);
  }

  // ===== Karakter: Wibu Al-Arabi (keffiyeh + thawb) =====
  drawCharacter(ctx) {
    const sway = Math.sin(this.animFrame * 0.1) * 1.5;

    // Thawb / jubah putih
    ctx.fillStyle = "#f7f3e8";
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.lineTo(7, -2);
    ctx.lineTo(11 + sway * 0.5, 18);
    ctx.lineTo(-11 + sway * 0.5, 18);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d9cfae";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Belt emas
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(-8, 4, 16, 3);

    // Wajah
    ctx.fillStyle = "#ffdcb8";
    ctx.beginPath();
    ctx.arc(0, -8, 7, 0, Math.PI * 2);
    ctx.fill();

    // Mata
    ctx.fillStyle = "#2b1b10";
    ctx.fillRect(-3.5, -9, 2, 2.5);
    ctx.fillRect(1.5, -9, 2, 2.5);

    // Keffiyeh (sorban khas arab) — kain merah-putih
    ctx.fillStyle = "#d94f4f";
    ctx.beginPath();
    ctx.moveTo(-9, -11);
    ctx.quadraticCurveTo(0, -20, 9, -11);
    ctx.lineTo(9, -6);
    ctx.lineTo(-9, -6);
    ctx.closePath();
    ctx.fill();
    // Agal (tali hitam)
    ctx.strokeStyle = "#141414";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-9, -10.5);
    ctx.quadraticCurveTo(0, -16, 9, -10.5);
    ctx.stroke();
    // Kain jatuh di samping
    ctx.fillStyle = "#c44545";
    ctx.beginPath();
    ctx.moveTo(7, -9);
    ctx.lineTo(13, 4);
    ctx.lineTo(8, 6);
    ctx.closePath();
    ctx.fill();

    // Jubbah/rok bagian bawah terbang
    ctx.fillStyle = "#efe7d4";
    ctx.beginPath();
    ctx.moveTo(-9, 14);
    ctx.lineTo(9, 14);
    ctx.lineTo(6 + sway, 24);
    ctx.lineTo(-6 + sway, 24);
    ctx.closePath();
    ctx.fill();
  }

  // Orb pendukung: kurma & koin emas mengorbit
  drawSupportOrbs(ctx) {
    const orbit = this.focused ? 15 : 26;
    const speed = this.focused ? 0.04 : 0.08;
    const angle1 = this.animFrame * speed;
    const angle2 = angle1 + Math.PI;

    [angle1, angle2].forEach((ang, idx) => {
      const ox = Math.cos(ang) * orbit;
      const oy = Math.sin(ang) * (orbit * 0.45) - 4;

      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(ang * 2);

      ctx.shadowColor = "#ffaa00";
      ctx.shadowBlur = 6;

      if (idx === 0) {
        // Koin emas
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffcc33";
        ctx.fill();
        ctx.strokeStyle = "#7a5a00";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = "#7a5a00";
        ctx.font = "bold 6px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("◆", 0, 0.5);
      } else {
        // Kurma (date)
        ctx.beginPath();
        ctx.ellipse(0, 0, 3.4, 5, 0.3, 0, Math.PI * 2);
        ctx.fillStyle = "#8a4b25";
        ctx.fill();
        ctx.strokeStyle = "#5d3016";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  drawFocusHitbox(ctx) {
    const rot = this.animFrame * 0.05;

    ctx.save();
    ctx.rotate(rot);
    ctx.strokeStyle = "rgba(255, 60, 90, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-rot * 1.5);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(0, 0, this.hitboxRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff1133";
    ctx.shadowColor = "#ff0033";
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  // ===== BOMB: SHAWARMA HABIBI =====
  drawBombEffect(ctx) {
    ctx.save();
    // Gelombang shawarma (coklat keemasan)
    ctx.strokeStyle = "rgba(255, 170, 60, 0.7)";
    ctx.lineWidth = 6;
    ctx.shadowColor = "#ffaa33";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.bombRadius % 450, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.animFrame * 0.02);
    // Cincin arabesque
    ctx.strokeStyle = "rgba(255, 230, 160, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();

    // Rub' El Hizb (۞) — bintang Islam 8 sisi dari DUA PERSEGI
    // (bukan bintang Daud / segi enam)
    const drawSquare = (offset) => {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = offset + (i * Math.PI) / 2;
        const x = Math.cos(a) * 62;
        const y = Math.sin(a) * 62;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    };
    drawSquare(-Math.PI / 4); // persegi miring 45°
    drawSquare(0); // persegi tegak
    // Titik pusat kecil khas Rub' El Hizb
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.stroke();

    // Teks "HABIBI" mengorbit
    ctx.font = 'bold 12px "Cinzel", serif';
    ctx.fillStyle = "rgba(255, 220, 120, 0.8)";
    ctx.textAlign = "center";
    const txt = "SHAWARMA HABIBI ✦ SHAWARMA HABIBI ✦";
    ctx.fillText(txt, 0, -70);
    ctx.restore();

    ctx.restore();
  }
}

window.Player = Player;
