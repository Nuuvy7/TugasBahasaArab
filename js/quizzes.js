/**
 * ============================================================
 *  BANK SOAL KUIS — 10 soal kosakata bahasa Arab
 * ============================================================
 *
 *  CARA MENGUBAH SOAL (cukup edit file ini, lalu refresh halaman):
 *
 *  1) TAMBAH soal  → salin satu blok { ... } lalu tempel di bawah,
 *                    ubah isinya.
 *  2) HAPUS soal    → hapus satu blok { ... } beserta koma di akhirnya.
 *  3) MODIFIKASI    → ubah teks di dalam blok { ... } yang ada.
 *
 *  FORMAT SATU SOAL:
 *    {
 *      q:       "Pertanyaan yang tampil (boleh pakai <b>tebal</b>)",
 *      type:    "id" | "ar",   // "id" = arti Arab → Indonesia
 *                              // "ar" = arti Indonesia → Arab
 *      options: ["opsi1", "opsi2", "opsi3", "opsi4"],  // HARUS 4 opsi
 *      answer:  0,             // nomor opsi yang benar (0 sampai 3)
 *    },
 *
 *  ATURAN (dicek otomatis saat game dimuat — lihat console browser):
 *    - options harus tepat 4 dan TIDAK boleh ada yang sama.
 *    - answer harus angka 0–3.
 *    - q tidak boleh kosong.
 *
 *  Bisa juga ubah soal lewat console saat game berjalan:
 *    QuizBank.add({ q: "...", type: "id", options: ["a","b","c","d"], answer: 0 })
 *    QuizBank.remove(0)            // hapus soal nomor 0
 *    QuizBank.edit(1, { answer: 2 }) // ubah sebagian isi soal nomor 1
 *    QuizBank.list                  // lihat semua soal
 * ============================================================
 */
(function () {
  "use strict";

  const SOAL = [
    // ---------- Arab → Indonesia (pilih arti) ----------
    {
      q: "Apa arti kata <b>قَهْوَة</b>?",
      type: "id",
      options: ["kopi", "teh", "roti", "air"],
      answer: 0,
    },
    {
      q: "Apa arti kata <b>كِتَاب</b>?",
      type: "id",
      options: ["pensil", "meja", "buku", "kursi"],
      answer: 2,
    },
    {
      q: "Apa arti kata <b>قَمَر</b>?",
      type: "id",
      options: ["matahari", "bintang", "bulan", "awan"],
      answer: 2,
    },
    {
      q: "Apa arti kata <b>مَاء</b>?",
      type: "id",
      options: ["tanah", "angin", "api", "air"],
      answer: 3,
    },
    {
      q: "Apa arti kata <b>حَبِيبِي</b>?",
      type: "id",
      options: ["guruku", "musuhku", "sayangku", "saudaraku"],
      answer: 2,
    },

    // ---------- Indonesia → Arab (pilih kata Arab) ----------
    {
      q: "Bahasa Arab untuk <b>roti</b> adalah…",
      type: "ar",
      options: ["خُبْز", "لَحْم", "أُسْتَاذ", "سَمَاء"],
      answer: 0,
    },
    {
      q: "Bahasa Arab untuk <b>guru</b> adalah…",
      type: "ar",
      options: ["طَالِب", "وَزِير", "مُعَلِّم", "حَارِس"],
      answer: 2,
    },
    {
      q: "Bahasa Arab untuk <b>rumah</b> adalah…",
      type: "ar",
      options: ["بَاب", "جَدَار", "بَيْت", "نَافِذَة"],
      answer: 2,
    },
    {
      q: "Bahasa Arab untuk <b>sekolah</b> adalah…",
      type: "ar",
      options: ["مَسْجِد", "مَدْرَسَة", "سُوق", "مَطْعَم"],
      answer: 1,
    },
    {
      q: "Bahasa Arab untuk <b>matahari</b> adalah…",
      type: "ar",
      options: ["شَمْس", "قَمَر", "نَار", "رِيح"],
      answer: 0,
    },
  ];

  // ---------- Validasi (pesan jelas di console kalau ada yang salah) ----------
  function validate(q, i) {
    const nama = `soal[${i}]`;
    const masalah = [];

    if (!q || typeof q.q !== "string" || !q.q.trim())
      masalah.push('field "q" (pertanyaan) kosong');
    if (!Array.isArray(q.options) || q.options.length !== 4)
      masalah.push(`"options" harus tepat 4 (sekarang ${Array.isArray(q.options) ? q.options.length : "bukan array"})`);
    else if (new Set(q.options).size !== 4)
      masalah.push("ada opsi yang duplikat");
    if (typeof q.answer !== "number" || q.answer < 0 || q.answer > 3)
      masalah.push(`"answer" harus angka 0–3 (sekarang: ${q.answer})`);

    if (masalah.length) {
      console.error(`✘ ${nama} bermasalah →`, masalah.join(" | "), "\n   soal:", q);
      return false;
    }
    return true;
  }

  // ---------- API bantu: tambah / hapus / ubah soal ----------
  const QuizBank = {
    list: SOAL,

    /** Tambah soal baru. Otomatis divalidasi, dikembalikan index-nya (atau -1). */
    add(soal) {
      SOAL.push(soal);
      const ok = validate(soal, SOAL.length - 1);
      if (!ok) SOAL.pop();
      return ok ? SOAL.length - 1 : -1;
    },

    /** Hapus soal berdasarkan nomor urut. */
    remove(index) {
      if (index < 0 || index >= SOAL.length) {
        console.warn(`⚠ remove(${index}) — nomor tidak ada (0–${SOAL.length - 1})`);
        return null;
      }
      return SOAL.splice(index, 1)[0];
    },

    /** Ubah sebagian isi soal, contoh: edit(0, { answer: 2, q: "..." }). */
    edit(index, perubahan) {
      const soal = SOAL[index];
      if (!soal) {
        console.warn(`⚠ edit(${index}) — nomor tidak ada (0–${SOAL.length - 1})`);
        return null;
      }
      Object.assign(soal, perubahan);
      if (!validate(soal, index)) console.warn("⚠ perubahan dibatalkan (tidak valid) — kembalikan nilai lama.");
      return soal;
    },

    /** Validasi semua soal, dipanggil saat game dimuat. */
    validateAll() {
      let bad = 0;
      SOAL.forEach((q, i) => {
        if (!validate(q, i)) bad++;
      });
      if (bad === 0) console.log(`✔ bank soal valid — ${SOAL.length} soal siap dimainkan`);
      else console.error(`✘ ${bad} soal bermasalah (lihat pesan di atas)`);
      return bad === 0;
    },
  };

  // ---------- Pasang ke data Arab milik game ----------
  if (typeof window !== "undefined" && window.Arabic) {
    window.Arabic.quizzes = SOAL;
    QuizBank.validateAll();
  }

  if (typeof window !== "undefined") window.QuizBank = QuizBank;
})();
