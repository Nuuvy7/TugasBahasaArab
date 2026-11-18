const LetterSpriteCache = {};

function getLetterSprite(char, size, color) {
  const key = char + "|" + size + "|" + color;
  if (LetterSpriteCache[key]) return LetterSpriteCache[key];

  const pad = Math.ceil(size * 0.7);
  const dim = size + pad * 2;
  const c = document.createElement("canvas");
  c.width = dim;
  c.height = dim;
  const g = c.getContext("2d");

  // Glow bulat di belakang huruf
  g.fillStyle = color;
  g.globalAlpha = 0.35;
  g.beginPath();
  g.arc(dim / 2, dim / 2, size * 0.62, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;

  // Huruf (browsers render bentuk isolasi utk 1 char)
  g.font = `bold ${size}px "Amiri", "Scheherazade New", "Traditional Arabic", serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.direction = "rtl";
  g.lineWidth = Math.max(2, size * 0.14);
  g.strokeStyle = color;
  g.strokeText(char, dim / 2, dim / 2 + size * 0.04);
  g.fillStyle = "#ffffff";
  g.fillText(char, dim / 2, dim / 2 + size * 0.04);

  LetterSpriteCache[key] = c;
  return c;
}

class Bullet {
  constructor(options = {}) {
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.speed = options.speed || 3;
    this.angle = options.angle || 0;
    // Tipe visual: 'letter' | 'rune' | 'coin' | 'star' | 'ball' | 'orb' | 'slash'
    this.type = options.type || "ball";
    this.color = options.color || "#ffcc33";

    // Data huruf (edukasi) — kalau tipe letter
    this.letter = options.letter || null;
    this.letterSize = options.letterSize || 26;

    this.radius = options.radius || 8;
    this.hitboxRadius = options.hitboxRadius || 5;

    this.accel = options.accel || 0;
    this.maxSpeed = options.maxSpeed || 22;
    this.minSpeed = options.minSpeed !== undefined ? options.minSpeed : 0.1;
    this.angularVel = options.angularVel || 0;

    // Jeda / beku peluru (efek khatam)
    this.delay = options.delay || 0;
    this.postDelayAngle =
      options.postDelayAngle !== undefined ? options.postDelayAngle : null;
    this.postDelaySpeed =
      options.postDelaySpeed !== undefined ? options.postDelaySpeed : null;
    this.aimAtPlayerOnRelease = options.aimAtPlayerOnRelease || false;

    this.bounces = options.bounces || 0;
    this.grazed = false;
    this.alive = true;
    this.age = 0;
  }

  update(playBounds, player) {
    this.age++;

    if (this.delay > 0) {
      this.delay--;
      if (this.delay === 0) {
        if (this.aimAtPlayerOnRelease && player) {
          this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        } else if (this.postDelayAngle !== null) {
          this.angle = this.postDelayAngle;
        }
        if (this.postDelaySpeed !== null) this.speed = this.postDelaySpeed;
      }
      return;
    }

    this.speed += this.accel;
    if (this.accel > 0 && this.speed > this.maxSpeed)
      this.speed = this.maxSpeed;
    if (this.accel < 0 && this.speed < this.minSpeed)
      this.speed = this.minSpeed;
    this.angle += this.angularVel;

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.bounces > 0) {
      let bounced = false;
      if (this.x <= playBounds.left + 8 && Math.cos(this.angle) < 0) {
        this.angle = Math.PI - this.angle;
        bounced = true;
      } else if (this.x >= playBounds.right - 8 && Math.cos(this.angle) > 0) {
        this.angle = Math.PI - this.angle;
        bounced = true;
      }
      if (this.y <= playBounds.top + 8 && Math.sin(this.angle) < 0) {
        this.angle = -this.angle;
        bounced = true;
      }
      if (bounced) {
        this.bounces--;
        this.speed *= 0.96;
      }
    }

    const pad = 50;
    if (
      this.x < playBounds.left - pad ||
      this.x > playBounds.right + pad ||
      this.y < playBounds.top - pad ||
      this.y > playBounds.bottom + pad
    ) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Efek beku
    if (this.delay > 0) {
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.85;
    }

    switch (this.type) {
      case "letter":
        this.drawLetter(ctx);
        break;
      case "rune":
        this.drawRune(ctx);
        break;
      case "coin":
        this.drawCoin(ctx);
        break;
      case "star":
        this.drawStar(ctx);
        break;
      case "orb":
        this.drawOrb(ctx);
        break;
      case "slash":
        this.drawSlash(ctx);
        break;
      case "ball":
      default:
        this.drawBall(ctx);
        break;
    }

    ctx.restore();
  }

  // Peluru huruf hijaiyah — inti edukasi game
  drawLetter(ctx) {
    const ch = this.letter ? this.letter.char : "ء";
    const sprite = getLetterSprite(ch, this.letterSize, this.color);
    const s = this.letterSize * 0.62;
    ctx.drawImage(sprite, -s, -s, s * 2, s * 2);
  }

  drawRune(ctx) {
    ctx.rotate(this.age * 0.05);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    // Rub' El Hizb (۞): dua persegi = bintang Islam 8 sisi
    for (let s = 0; s < 2; s++) {
      const offset = s * (Math.PI / 4);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = offset + (i * Math.PI) / 2;
        const x = Math.cos(a) * this.radius;
        const y = Math.sin(a) * this.radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawCoin(ctx) {
    ctx.rotate(Math.sin(this.age * 0.15) * 0.6);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff8dc";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#7a5a00";
    ctx.font = `bold ${this.radius}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("◆", 0, 1);
  }

  drawStar(ctx) {
    ctx.rotate(this.age * 0.08);
    const spikes = 5;
    const outer = this.radius * 1.3;
    const inner = this.radius * 0.6;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(0, -outer);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(Math.cos(rot) * outer, Math.sin(rot) * outer);
      rot += step;
      ctx.lineTo(Math.cos(rot) * inner, Math.sin(rot) * inner);
      rot += step;
    }
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, inner * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  drawOrb(ctx) {
    const grad = ctx.createRadialGradient(
      0,
      0,
      this.radius * 0.3,
      0,
      0,
      this.radius,
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.4, this.color);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }

  // Tebasan pisau / pedang (صوارم!)
  drawSlash(ctx) {
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius * 2.2);
    ctx.lineTo(this.radius * 0.55, 0);
    ctx.lineTo(0, this.radius * 2.2);
    ctx.lineTo(-this.radius * 0.55, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawBall(ctx) {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}

/**
 * Peluru pemain — kapsul "ofuda" (kertas mantra) gaya Touhou.
 */
class PlayerBullet {
  constructor(x, y, vx, vy, color = "#66ccff", homing = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.homing = homing;
    this.damage = 1.0;
    this.alive = true;
    this.radius = 4;
  }

  update(boss, playBounds) {
    if (this.homing && boss && boss.alive) {
      const angle = Math.atan2(boss.y - this.y, boss.x - this.x);
      const currentAngle = Math.atan2(this.vy, this.vx);
      let diff = angle - currentAngle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      const turnSpeed = 0.09;
      const newAngle =
        currentAngle + Math.max(-turnSpeed, Math.min(turnSpeed, diff));
      const speed = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(newAngle) * speed;
      this.vy = Math.sin(newAngle) * speed;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (
      this.x < playBounds.left - 20 ||
      this.x > playBounds.right + 20 ||
      this.y < playBounds.top - 20 ||
      this.y > playBounds.bottom + 20
    ) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle + Math.PI / 2);

    if (this.homing) {
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff66aa";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    } else {
      // Kertas mantra / ofuda
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-3, -9, 6, 18);
      ctx.fillStyle = this.color;
      ctx.fillRect(-2, -7, 4, 14);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 7px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.direction = "rtl";
      ctx.fillText("ن", 0, 0);
    }

    ctx.restore();
  }
}

/**
 * Manajer peluru: koleksi, pola, collision, graze.
 */
class DanmakuEngine {
  constructor() {
    this.bullets = [];
    this.playerBullets = [];
  }

  clear() {
    this.bullets = [];
    this.playerBullets = [];
  }

  addBullet(opts) {
    // Auto-isi huruf random bila tipe letter tapi tidak ada data
    if (opts.type === "letter" && !opts.letter) {
      opts.letter = window.Arabic
        ? window.Arabic.randomLetter()
        : { char: "ء", name: "?", sound: "?" };
    }
    this.bullets.push(new Bullet(opts));
  }

  addPlayerBullet(x, y, vx, vy, color, homing) {
    this.playerBullets.push(new PlayerBullet(x, y, vx, vy, color, homing));
  }

  // Ubah semua peluru jadi partikel (bomb / pindah fase)
  clearEnemyBullets(createParticlesCallback) {
    const cleared = this.bullets.length;
    if (createParticlesCallback) {
      this.bullets.forEach((b) =>
        createParticlesCallback(b.x, b.y, b.color, 3),
      );
    }
    this.bullets = [];
    return cleared;
  }

  update(playBounds, player, boss) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(playBounds, player);
      if (!b.alive) this.bullets.splice(i, 1);
    }
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const pb = this.playerBullets[i];
      pb.update(boss, playBounds);
      if (!pb.alive) this.playerBullets.splice(i, 1);
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.playerBullets.length; i++)
      this.playerBullets[i].draw(ctx);
    for (let i = 0; i < this.bullets.length; i++) this.bullets[i].draw(ctx);
  }

  // Cek tabrakan peluru musuh <-> pemain (+GRAZE)
  checkPlayerCollisions(player, onHit, onGraze) {
    const px = player.x;
    const py = player.y;
    const hitR = player.hitboxRadius;
    const grazeR = player.grazeRadius;

    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      if (b.delay > 0) continue; // peluru beku belum bisa kena

      const dx = b.x - px;
      const dy = b.y - py;
      const distSq = dx * dx + dy * dy;

      const combinedHit = hitR + b.hitboxRadius;
      if (distSq < combinedHit * combinedHit) {
        b.alive = false;
        onHit(b);
        return;
      }

      if (!b.grazed) {
        const combinedGraze = grazeR + b.hitboxRadius;
        if (distSq < combinedGraze * combinedGraze) {
          b.grazed = true;
          onGraze(b);
        }
      }
    }
  }

  // Cek peluru pemain <-> boss
  checkBossCollisions(boss, onHit) {
    if (!boss || !boss.alive) return;
    const bx = boss.x;
    const by = boss.y;
    const br = boss.radius;

    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const pb = this.playerBullets[i];
      const dx = pb.x - bx;
      const dy = pb.y - by;
      if (dx * dx + dy * dy < (br + pb.radius) * (br + pb.radius)) {
        pb.alive = false;
        boss.takeDamage(pb.damage);
        onHit(pb);
      }
    }
  }

  // =========================================================
  // HELPER POLA
  // =========================================================
  fireRing(x, y, count, speed, type, color, angleOffset = 0, extraOpts = {}) {
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      this.addBullet({
        x,
        y,
        speed,
        angle: angleOffset + i * step,
        type,
        color,
        ...extraOpts,
      });
    }
  }

  fireSpread(
    x,
    y,
    count,
    spreadAngle,
    centerAngle,
    speed,
    type,
    color,
    extraOpts = {},
  ) {
    if (count <= 1) {
      this.addBullet({
        x,
        y,
        speed,
        angle: centerAngle,
        type,
        color,
        ...extraOpts,
      });
      return;
    }
    const startAngle = centerAngle - spreadAngle / 2;
    const step = spreadAngle / (count - 1);
    for (let i = 0; i < count; i++) {
      this.addBullet({
        x,
        y,
        speed,
        angle: startAngle + i * step,
        type,
        color,
        ...extraOpts,
      });
    }
  }

  // Cincin huruf yang membeku lalu melesat ke pemain
  fireFrozenRing(x, y, count, delayFrames, color = "#00e5ff", speed = 4.5) {
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * step;
      this.addBullet({
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40,
        speed: 0.01,
        angle,
        type: "letter",
        color,
        hitboxRadius: 6,
        letterSize: 28,
        delay: delayFrames,
        aimAtPlayerOnRelease: true,
        postDelaySpeed: speed,
      });
    }
  }
}

window.DanmakuEngine = DanmakuEngine;
window.Bullet = Bullet;
window.PlayerBullet = PlayerBullet;
