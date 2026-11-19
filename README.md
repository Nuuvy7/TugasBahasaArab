# TAJAWWUL (تجوال) — Bullet Hell Bahasa Arab

A **Touhou-style danmaku (bullet hell)** game built as an **Arabic language assignment**.
You dodge **Arabic hijaiyah letter bullets**, collect **vocabulary orbs**, answer **Arabic quizzes**
mid-battle, and defeat **الأستاذ (Al-Ustaz)** across 5 grammar "knowledge card" (kartu ilmu) phases.

> Full chaotic shitpost energy — camels, shawarma bombs, keffiyeh, ALHAMDULILLAH flashes —
> but every mechanic actually teaches Arabic (letters, vocabulary, grammar).

---

## How to Run

```bash
./start.sh 8080        # or
python3 -m http.server 8080
npm start
```

Then open **http://localhost:8080** (or open `index.html` directly).

---

## 🕹️ Controls

| Action           | Keyboard                                                                  | Touch / Mobile |
| :--------------- | :------------------------------------------------------------------------ | :------------- |
| **Move**         | <kbd>Arrow Keys</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Drag screen    |
| **Shoot**        | <kbd>Z</kbd> or <kbd>Space</kbd>                                          | `SHOT` button  |
| **Focus**        | <kbd>Shift</kbd> (hold)                                                   | `SLOW` button  |
| **Bomb**         | <kbd>X</kbd> — _Shawarma Habibi_                                          | `BOMB` button  |
| **Quiz answers** | <kbd>↑</kbd><kbd>↓</kbd> + <kbd>Z</kbd>                                   | Tap the option |
| **Pause**        | <kbd>P</kbd> / <kbd>Esc</kbd>                                             | —              |

### Difficulty / Rank

| Display name (short) | Full in-game label                         | Internal value | Bullet density                           | Lives | Bombs |
| :------------------- | :----------------------------------------- | :------------- | :--------------------------------------- | :---- | :---- |
| Easy                 | `Yalla yalla brother no problem very easy` | `easy`         | 0.4× (super santai, buat hafal kosakata) | 5     | 5     |
| Medium-easy          | `Ana this is good very nice`            | `hard`         | 0.7× (masih ramah)                       | 4     | 4     |
| Normal               | `Wallahi ana youre good brother`        | `normal`       | 1.0× (standar)                           | 3     | 3     |
| Hard                 | `ANA WELCOME TO JAHANNAM ANA`        | `lunatic`      | 1.4× (nyaris mustahil)                   | 2     | 2     |
| **Mute**             | <kbd>M</kbd>                               | —              |
| **BGM mode**         | <kbd>N</kbd> (MP3 / Synth)                 | Mode button    |

---

## Where's the Arabic?

| Feature                            | What you learn                                                                            |
| :--------------------------------- | :---------------------------------------------------------------------------------------- |
| **Letter bullets**                 | All 28 hijaiyah letters (name + sound shown)                                              |
| **Word orbs (green)**              | Daily vocabulary: قَهْوَة = kopi, جَمَل = unta, …                                              |
| **Quizzes (every ~18s)**           | 10 vocab questions (Arab↔Indonesia), with streak bonus                                    |
| **5 Knowledge Cards (Kartu Ilmu)** | Real grammar: Al-Harakat, المثنى (dual), التعريف والتنكير, الإضافة (idhafah), لام التعليل |
| **HUD**                            | Tracks your quiz score & words memorized 📚                                               |

### Boss phases (the "curriculum")

1. **الْحَرَكَات (Al-Harakat)** — latihan: harakat fathah/kasrah/dammah
2. **دَرْس الْمُثَنَّى "Bentuk Dua"** — kartu ilmu: dual form `-āni / -ayni`
3. **التَّعَرُّفْ وَالتَّنْكِيرْ** — latihan: definite (ال) vs indefinite
4. **دَرْس الْإِضَافَة "Idhafah"** — kartu ilmu: construct state / possession chain
5. **لَامُ التَّعْلِيل "Lam Ta'lil"** — kartu ilmu final: causal "because/so that" lam

> ℹ️ Nada game sengaja dibuat **ilmiah, bukan sihir** — fase disebut _kartu ilmu_ / _pelajaran_,
> cocok untuk tugas sekolah.

---

## BGM: "Qawlu Qawlu Sawarim" (قول قول صوارم)

Two sources, switchable with <kbd>N</kbd> or the **Mode** button:

1. **Drop-in MP3 slot** — put your file at
   `assets/qawlu-qawlu-sawarim.mp3` and it's auto-detected & played.
   (See `assets/BACA-DULU.txt`.)
2. **Built-in WebAudio synth** — a copyright-free **maqam Hijaz** chiptune with
   darbuka percussion, used automatically when the MP3 isn't there.

All sound effects (shoot, graze, bomb, pichuun death, quiz correct/wrong) are
procedurally generated via the Web Audio API — zero asset files needed.

---

## Project Architecture

```
TugasBArabHeheyy/
├── index.html            # HTML5 canvas + UI controls
├── style.css             # Dark desert-night gold/crimson theme
├── start.sh              # Quick launcher
├── package.json          # npm start
├── assets/
│   ├── BACA-DULU.txt             # How to drop in your BGM mp3
│   └── qawlu-qawlu-sawarim.mp3
└── js/
    ├── arabic.js    # Educational content: letters, vocab, grammar cards, memes
    ├── quizzes.js   # Quiz bank (10 soal) — edit this file to add/remove/edit questions
    ├── audio.js     # BGM manager (MP3 slot + maqam synth) + procedural SFX
    ├── danmaku.js   # Bullet physics (letter bullets, freeze, bounce, graze)
    ├── player.js    # Keffiyeh protagonist, focus hitbox, Shawarma Habibi bomb
    ├── boss.js      # Al-Ustaz AI, 5 grammar phases, kartu ilmu banners, taunts
    └── game.js      # Main loop, HUD, quiz system, items, overlays
```

### Editing quiz questions

Open **`js/quizzes.js`** — it contains all 10 questions with instructions at the top:

- **Add** — copy an existing `{ ... }` block and change the contents.
- **Delete** — remove a `{ ... }` block.
- **Modify** — edit the `q`, `options` (must be exactly 4, no duplicates), and `answer` (0–3) fields.

Invalid questions are reported in the browser console on page load.

---

## Notes for submission

- Pure **HTML5 Canvas + vanilla JavaScript** — no frameworks, no build step.
- Educational data is centralized in `js/arabic.js` (vocab & letters); quizzes live in `js/quizzes.js`.
- High score saved to `localStorage`.
