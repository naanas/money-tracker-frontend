// naanas/money-tracker-frontend/src/utils/format.jsx

// --- FUNGSI FORMATTING STANDAR (TIDAK BERUBAH) ---
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

export const formatNumberInput = (value) => {
  if (!value) return '';
  const numberValue = typeof value === 'string' ? parseNumberInput(value) : value;
  if (isNaN(numberValue) || numberValue === 0) return '';
  return new Intl.NumberFormat('id-ID').format(numberValue);
};

export const parseNumberInput = (value) => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^0-9]/g, '');
};

export const formatMonthYear = (date) => {
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

// === [LOGIKA PARSING BARU V2] ===

/**
 * Normalisasi string angka yang ruwet dari hasil OCR.
 * Contoh: "367.950,00" -> 367950
 * Contoh: "l0.00O" -> 10000
 */
const normalizeAmount = (str) => {
  if (!str) return 0;
  let cleaned = str.trim();
  
  // 1. Hapus suffix desimal umum IDR (,00 atau .00) di akhir string agar tidak dianggap 0 tambahan
  cleaned = cleaned.replace(/[,.]00$/g, ''); 

  // 2. Koreksi salah baca OCR umum (O->0, l/I->1, S->5)
  cleaned = cleaned.replace(/[Oo]/g, '0').replace(/[ilIj]/g, '1').replace(/[Ss]/g, '5');

  // 3. Filter: Jika diawali '08' dan panjang, kemungkinan besar nomor HP, abaikan!
  // Hapus simbol dulu untuk cek nomor HP murni
  const pureDigits = cleaned.replace(/[^0-9]/g, '');
  if (pureDigits.startsWith('08') && pureDigits.length >= 10) {
      return 0;
  }

  // 4. Ambil hanya angka
  cleaned = cleaned.replace(/[^0-9]/g, '');
  
  return parseFloat(cleaned) || 0;
};

const extractDate = (text) => {
    // Regex yang lebih fleksibel untuk berbagai format tanggal
    // DD/MM/YYYY, YYYY-MM-DD, DD Month YYYY
    const datePatterns = [
        /\d{4}[./-]\d{1,2}[./-]\d{1,2}/,           // YYYY-MM-DD
        /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/,         // DD-MM-YYYY
        /\d{1,2}\s+(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|SEP|OKT|NOV|DES)[a-z]*\s+\d{4}/i // 17 AGUSTUS 2025
    ];

    for (const regex of datePatterns) {
        const match = text.match(regex);
        if (match) {
            try {
                // Coba konversi ke objek Date. Hati-hati dengan format DD/MM/YYYY yang kadang dibaca MM/DD/YYYY oleh JS
                let dateStr = match[0].replace(/[./]/g, '-');
                
                // Jika format DD-MM-YYYY (tahun ada di belakang)
                const parts = dateStr.split(/[- ]+/);
                if (parts[0].length <= 2 && parts[2].length === 4) {
                     // Paksa ke format ISO YYYY-MM-DD agar aman
                     // Asumsi bulan ada di tengah jika pakai angka
                     const day = parts[0].padStart(2, '0');
                     let month = parts[1];
                     const year = parts[2];
                     
                     // Handle nama bulan jika ada
                     if (isNaN(month)) {
                         const months = {jan:1, feb:2, mar:3, apr:4, mei:5, may:5, jun:6, jul:7, agu:8, aug:8, sep:9, okt:10, oct:10, nov:11, des:12, dec:12};
                         month = months[month.substring(0,3).toLowerCase()] || month;
                     }
                     month = String(month).padStart(2, '0');
                     
                     return `${year}-${month}-${day}`;
                }
                return new Date(match[0]).toISOString().split('T')[0];
            } catch (e) {
                continue; // Coba regex berikutnya jika gagal
            }
        }
    }
    return null;
};

export const parseReceiptText = (text) => {
  let amount = 0;
  let description = 'Belanja';
  let date = null;

  try {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    date = extractDate(text);

    // --- CARI NAMA TOKO (3 baris teratas) ---
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
        // Abaikan baris yang terlihat seperti tanggal/jam/nomor struk
        if (lines[i].length > 3 && !/\d{2}:\d{2}/.test(lines[i]) && !/#\d+/.test(lines[i])) {
             description = lines[i].replace(/WELCOME|SELAMAT DATANG|TO|DI/gi, '').trim();
             if (description) break;
        }
    }

    // --- CARI TOTAL (BACA DARI BAWAH) ---
    const grandTotalKeywords = /(TOTAL|JUMLAH|TAGIHAN|AMOUNT|GRAND|NET)/i;
    const excludeKeywords = /(TUNAI|CASH|KEMBALI|CHANGE|CARD|KARTU|DEBIT|KREDIT|VOUCHER|DISKON|DISC|TAX|PAJAK|PPN)/i;

    let foundTotals = [];

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        // Harus ada angka di baris ini
        if (!/\d/.test(line)) continue;

        // 1. PRIORITAS UTAMA: Baris yang ada kata "TOTAL" tapi TIDAK ADA kata "CASH/TUNAI/PAJAK"
        if (grandTotalKeywords.test(line) && !excludeKeywords.test(line)) {
            // Ambil semua pola angka di baris ini
            const numberMatches = line.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?/g);
            if (numberMatches) {
                // Biasanya angka total adalah yang PALING KANAN (terakhir di baris)
                const lastNum = numberMatches[numberMatches.length - 1];
                const val = normalizeAmount(lastNum);
                // Validasi: minimal 500 perak, maksimal 50 juta (biar gak baca nomor seri aneh)
                if (val >= 500 && val <= 50000000) {
                    foundTotals.push({ val, priority: 10 }); // Prioritas tertinggi
                }
            }
        }
        // 2. PRIORITAS KEDUA: Angka besar di paruh bawah struk (tanpa keyword)
        else if (i > lines.length / 2 && !excludeKeywords.test(line)) {
             // Coba ambil angka terbesar di baris ini
             const numberMatches = line.match(/\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?/g);
             if (numberMatches) {
                 for (const numStr of numberMatches) {
                     const val = normalizeAmount(numStr);
                     // Asumsi total belanja biasanya > 5000 dan < 10 juta kalau tanpa keyword
                     if (val >= 5000 && val <= 10000000) {
                         foundTotals.push({ val, priority: 5 });
                     }
                 }
             }
        }
    }

    // Urutkan hasil temuan berdasarkan prioritas, lalu nilai tertinggi
    foundTotals.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        return b.val - a.val; // Jika prioritas sama, ambil yang nilainya lebih BESAR (biasanya total > subtotal)
    });

    if (foundTotals.length > 0) {
        amount = foundTotals[0].val;
    }

  } catch (error) {
    console.error("Parsing error:", error);
  }

  return {
    amount,
    description: description.substring(0, 30),
    date
  };
};