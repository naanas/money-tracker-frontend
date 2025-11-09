// naanas/money-tracker-frontend/src/utils/format.jsx

// Fungsi ini untuk MENAMPILKAN mata uang (dengan "Rp")
export const formatCurrency = (amount, currency = 'IDR') => {
  if (isNaN(parseFloat(amount))) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Untuk memformat angka di DALAM input field
// Mengubah 1000000 -> "1.000.000"
export const formatNumberInput = (value) => {
  if (!value) return '';
  const numberValue = typeof value === 'string' ? parseNumberInput(value) : value;
  if (isNaN(numberValue) || numberValue === 0) return '';
  return new Intl.NumberFormat('id-ID').format(numberValue);
};

// Untuk membersihkan format input kembali menjadi angka
// Mengubah "Rp 1.000.000" -> "1000000" (sebagai string)
export const parseNumberInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^0-9]/g, '');
};

// Untuk menampilkan nama bulan dan tahun (e.g., "Oktober 2025")
export const formatMonthYear = (date) => {
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
};

// === [FUNGSI PARSER BARU YANG LEBIH CANGGIH] ===

/**
 * Membersihkan string agar hanya menyisakan angka dan titik desimal standar.
 * Mengubah 'O'/'o' menjadi '0', 'l'/'I' menjadi '1' untuk koreksi OCR dasar.
 */
const normalizeAmount = (str) => {
  if (!str) return 0;
  // 1. Ganti karakter yang sering salah dibaca OCR sebagai angka
  let cleaned = str.replace(/[Oo]/g, '0').replace(/[ilIj]/g, '1');
  // 2. Hapus semua karakter KECUALI angka, koma, dan titik
  cleaned = cleaned.replace(/[^0-9,.]/g, '');
  // 3. Hapus semua titik dan koma (asumsi struk IDR bulat tanpa desimal sen)
  cleaned = cleaned.replace(/[.,]/g, '');
  
  return parseFloat(cleaned) || 0;
};

/**
 * Mencoba mengekstrak tanggal dari teks dengan regex berbagai format umum di Indonesia.
 */
const extractDate = (text) => {
    // Regex untuk format DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const dateRegex = /(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})|(\d{4}[./-]\d{1,2}[./-]\d{1,2})/;
    const match = text.match(dateRegex);
    if (match) {
        try {
            let dateStr = match[0].replace(/[./]/g, '-');
            const parts = dateStr.split('-');
            // Jika format DD-MM-YYYY (tahun di belakang), ubah ke YYYY-MM-DD
            if (parts[0].length <= 2 && parts[2].length === 4) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
             // Jika sudah YYYY-MM-DD atau format lain yang bisa diparse langsung
            return new Date(dateStr).toISOString().split('T')[0];
        } catch (e) {
            return null; // Gagal parse tanggal
        }
    }
    return null;
};

/**
 * Fungsi utama untuk membaca teks struk.
 * Strategi: Cari tanggal, cari nama toko di atas, dan cari TOTAL dari bawah ke atas.
 */
export const parseReceiptText = (text) => {
  let amount = 0;
  let description = 'Belanja';
  let date = null;

  try {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // --- 1. CARI TANGGAL ---
    date = extractDate(text);

    // --- 2. CARI DESKRIPSI (Nama Toko) ---
    // Biasanya ada di 5 baris pertama. Hindari baris yang terlihat seperti no telp/tanggal.
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const line = lines[i];
        if (line.length < 3 || line.match(/\d{4}/) || line.match(/Telp|Fax/i)) continue;
        // Bersihkan kata-kata umum di header struk
        description = line.replace(/Selamat Datang|Welcome|To|Di/gi, '').trim();
        if (description) break;
    }

    // --- 3. CARI TOTAL (STRATEGI: BACA DARI BAWAH) ---
    const grandTotalKeywords = /(TOTAL|JUMLAH|TAGIHAN|AMOUNT|NET|GRAND|HARGA JUAL)/i;
    // Kata kunci penjebak yang bukan total belanja
    const excludeKeywords = /(TUNAI|CASH|KEMBALI|CHANGE|DISKON|DISC|HEMAT|VOUCHER|CARD|DEBIT|KREDIT|BCA|MANDIRI|BRI|BNI)/i;
    const taxKeywords = /(PAJAK|TAX|PPN|PB1)/i;

    let potentialTotals = [];

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!/\d/.test(line)) continue; // Skip jika tidak ada angka
        if (excludeKeywords.test(line)) continue; // Skip jika ada kata terlarang

        if (grandTotalKeywords.test(line) && !taxKeywords.test(line)) {
            // Prioritas TINGGI (2): Ada kata "TOTAL"
            // Ambil angka paling kanan di baris ini
            const words = line.split(/\s+/);
            for (let j = words.length - 1; j >= 0; j--) {
                 const val = normalizeAmount(words[j]);
                 if (val >= 500) { // Minimal Rp 500 agar tidak salah ambil angka kecil/qty
                     potentialTotals.push({ val, priority: 2 });
                     break; 
                 }
            }
        }
        else if (i > lines.length / 2) { 
             // Prioritas RENDAH (1): Tidak ada kata "TOTAL", tapi ada angka besar di paruh bawah struk
             const val = normalizeAmount(line);
             // Filter angka yang masuk akal untuk total belanja
             if (val >= 1000 && val < 100000000 && line.length < 30) {
                 potentialTotals.push({ val, priority: 1 });
             }
        }
    }

    // Urutkan: Prioritas tertinggi dulu, jika sama ambil nilai terbesar (asumsi total adalah angka terbesar yang valid)
    potentialTotals.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.val - a.val;
    });

    if (potentialTotals.length > 0) {
        amount = potentialTotals[0].val;
    }

  } catch (error) {
    console.error("Parsing error:", error);
  }

  return {
    amount,
    description: description.substring(0, 30), // Batasi panjang deskripsi
    date
  };
};