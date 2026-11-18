const Arabic = {
  letters: [
    { char: "ا", name: "Alif", sound: "a" },
    { char: "ب", name: "Ba", sound: "ba" },
    { char: "ت", name: "Ta", sound: "ta" },
    { char: "ث", name: "Tsa", sound: "tsa" },
    { char: "ج", name: "Jim", sound: "ja" },
    { char: "ح", name: "Ha", sound: "ha" },
    { char: "خ", name: "Kha", sound: "kha" },
    { char: "د", name: "Dal", sound: "da" },
    { char: "ذ", name: "Dzal", sound: "dza" },
    { char: "ر", name: "Ra", sound: "ra" },
    { char: "ز", name: "Zai", sound: "za" },
    { char: "س", name: "Sin", sound: "sa" },
    { char: "ش", name: "Syin", sound: "sya" },
    { char: "ص", name: "Shad", sound: "sho" },
    { char: "ض", name: "Dhad", sound: "dho" },
    { char: "ط", name: "Tha", sound: "to" },
    { char: "ظ", name: "Zha", sound: "zho" },
    { char: "ع", name: "Ain", sound: "'a" },
    { char: "غ", name: "Ghain", sound: "gho" },
    { char: "ف", name: "Fa", sound: "fa" },
    { char: "ق", name: "Qaf", sound: "qo" },
    { char: "ك", name: "Kaf", sound: "ka" },
    { char: "ل", name: "Lam", sound: "la" },
    { char: "م", name: "Mim", sound: "ma" },
    { char: "ن", name: "Nun", sound: "na" },
    { char: "ه", name: "Ha", sound: "ha" },
    { char: "و", name: "Wau", sound: "wa" },
    { char: "ي", name: "Ya", sound: "ya" },
  ],

  randomLetter() {
    return this.letters[Math.floor(Math.random() * this.letters.length)];
  },

  words: [
    { ar: "قَهْوَة", id: "kopi", sound: "qahwa" },
    { ar: "شَاي", id: "teh", sound: "syay" },
    { ar: "خُبْز", id: "roti", sound: "khubz" },
    { ar: "مَاء", id: "air", sound: "maa’" },
    { ar: "شَوَارْمَة", id: "shawarma (daging gulung)", sound: "syawarma" },
    { ar: "فَلَافِل", id: "falafel (bola kacang)", sound: "falafil" },
    { ar: "تَمْر", id: "kurma", sound: "tamr" },
    { ar: "جَمَل", id: "unta", sound: "jamal" },
    { ar: "مِفْتَاح", id: "kunci", sound: "miftah" },
    { ar: "كِتَاب", id: "buku", sound: "kitaab" },
    { ar: "بَاب", id: "pintu", sound: "baab" },
    { ar: "بَيْت", id: "rumah", sound: "bait" },
    { ar: "سَيَّارَة", id: "mobil", sound: "sayyaara" },
    { ar: "وَجْه", id: "wajah", sound: "wajh" },
    { ar: "عَيْن", id: "mata", sound: "ain" },
    { ar: "يَد", id: "tangan", sound: "yad" },
    { ar: "قَلْب", id: "hati", sound: "qalb" },
    { ar: "رَأْس", id: "kepala", sound: "ra’s" },
    { ar: "سَمَاء", id: "langit", sound: "samaa’" },
    { ar: "أَرْض", id: "bumi / tanah", sound: "ardh" },
    { ar: "شَمْس", id: "matahari", sound: "syams" },
    { ar: "قَمَر", id: "bulan", sound: "qamar" },
    { ar: "نَجْمَة", id: "bintang", sound: "najma" },
    { ar: "وَحْش", id: "monster / binatang buas", sound: "wahsy" },
    { ar: "حَرِيق", id: "kebakaran", sound: "hariiq" },
    { ar: "صَوَارِم", id: "pedang-pedang (bentuk jamak)", sound: "shawaarim" },
    { ar: "مُعَلِّم", id: "guru (laki-laki)", sound: "mu’allim" },
    { ar: "طَالِب", id: "murid (laki-laki)", sound: "thaalib" },
    { ar: "مَدْرَسَة", id: "sekolah", sound: "madrasa" },
    { ar: "حَلَال", id: "halal", sound: "halaal" },
    { ar: "حَبِيبِي", id: "kekasihku / sayangku", sound: "habiibii" },
    { ar: "يَلَّا", id: "ayo! (yalla)", sound: "yalla" },
    { ar: "كَلْب", id: "anjing", sound: "kalb" },
    { ar: "بِطَّة", id: "bebek", sound: "bittah" },
    { ar: "وَزِير", id: "menteri", sound: "waziir" },
    { ar: "غَزَال", id: "rusa / kekasih", sound: "ghazaal" },
    { ar: "سَحَابَة", id: "awan", sound: "sahaaba" },
    { ar: "مِفْتَاح الذِّهْن", id: "kunci kecerdasan", sound: "miftah adz-dzihn" },
    { ar: "زَيْتُونَة", id: "zaitun (olive)", sound: "zaituuna" },
    { ar: "حِصَان", id: "kuda", sound: "hisaan" },
  ],

  randomWord() {
    return this.words[Math.floor(Math.random() * this.words.length)];
  },

  // --------------------------------------------------------
  // 3. BANK KUIS — pindah ke js/quizzes.js supaya gampang
  //    ditambah / dihapus / dimodifikasi tanpa menyentuh file ini.
  //    Diisi otomatis oleh js/quizzes.js saat halaman dimuat.
  // --------------------------------------------------------
  quizzes: [],

  // --------------------------------------------------------
  // 4. KARTU ILMU GRAMMAR — penjelasan singkat tiap fase
  // --------------------------------------------------------
  grammar: {
    harakat: {
      title: "الْحَرَكَات (Al-Harakat)",
      body: "Fathah (ـَ) = a · Kasrah (ـِ) = i · Dammah (ـُ) = u. Tanpa harakat, huruf dibaca sukun (mati).",
    },
    dual: {
      title: "الْمُثَنَّى (Al-Mutsanna)",
      body: "Bentuk DUA: tambah -āni (مُعَلِّمَانِ) atau -ayni (مَدْرَسَتَيْنِ). Contoh: باب → بَابَانِ (dua pintu).",
    },
    taarof: {
      title: "التَّعَرُّفْ وَالتَّنْكِيرْ",
      body: "Kata DENGAN الْ = ma’rifat (spesifik). Tanpa الْ = nakarah (umum). مُعَلِّمٌ vs الْمُعَلِّمُ.",
    },
    idhafah: {
      title: "الْإِضَافَة (Al-Idhafah)",
      body: 'Rangkaian 2 kata bermakna "milik": بَابُ الْمَدْرَسَةِ = pintu SEKOLAH. Kata kedua selalu membaca kasrah (tanwin hilang).',
    },
    lamTaalil: {
      title: "لَامُ التَّعْلِيل (Lam Ta’lil)",
      body: 'Lam bermakna KARENA/SUPAYA: جِئْتُ لِأَتَعَلَّمَ = "aku datang SUPAYA belajar". Inilah senjata pamungkas sang Ustaz!',
    },
  },

  // --------------------------------------------------------
  // 5. PEKIKAN SHITPOST (dicebut boss / player)
  // --------------------------------------------------------
  bossTaunts: [
    "Hafalkan dulu kosakatamu, wibu!",
    "Kosakatamu KOSONG!",
    "إعراب-nya salah semua!",
    "Grammar-mu berantakan!",
    "ASTAGHFIRULLAH…",
    "Duduk! Kuis mendadak!",
    "Jangan lari, perbaiki tajwidmu!",
    "Hurufnya saja belum hafal!",
  ],

  deathQuotes: [
    "ASTAGHFIRULLAHAL’AZHIIM!",
    "YALLA, LAGI!",
    "Tangan gemetar…",
    "Ku… ku belum hafal…",
  ],

  victoryQuotes: [
    "MASHA ALLAH, LULUS!",
    "Nilai A+ untukmu!",
    "Sang Ustaz tumbang!",
    "ALHAMDULILLAH, KAMU MENANG!",
  ],

  randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
};

// Eksport global
window.Arabic = Arabic;
