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

// === [FUNGSI PARSER YANG DIPERBAIKI TOTAL] ===

/**
 * Helper untuk membersihkan string angka.
 * Ini akan menghapus semua titik dan koma.
 * "75,400" -> "75400"
 * "100.500" -> "100500"
 */
const cleanNumberString = (numStr) => {
  if (!numStr) return '';
  return numStr.replace(/[.,]/g, '');
};

/**
 * Fungsi untuk mengekstrak data dari teks nota.
 * Versi ini jauh lebih canggih untuk menghindari kesalahan baca.
 */
export const parseReceiptText = (text) => {
  let amount = 0;
  let description = 'Nota Terbaca'; // Default
  const lines = text.split('\n');

  try {
    // 1. Dapatkan Deskripsi (baris pertama, bersihkan dari no telp)
    if (lines.length > 0 && lines[0].trim() !== '') {
      description = lines[0].trim()
        .replace(/\b\d{10,13}\b/g, '') // Hapus no telp 10-13 digit
        .trim();
    }

    // 2. Cari TOTAL (Prioritas 1)
    // Regex: (TOTAL|JUMLAH|TAGIHAN) [spasi/titikdua] [Rp opsional] [ANGKA]
    const totalRegex = /\b(TOTAL|JUMLAH|TAGIHAN)\b\s*[:\s]*\s*Rp?\s*([\d.,]+)/i;
    const totalMatch = text.match(totalRegex);
    if (totalMatch && totalMatch[2]) {
      const amountStr = cleanNumberString(totalMatch[2]); // "75,400" -> "75400"
      amount = parseFloat(amountStr);
      return { amount: amount, description: description.substring(0, 50) };
    }

    // 3. Cari HARGA JUAL (Prioritas 2)
    const hargaJualRegex = /\b(HARGA JUAL)\b\s*[:\s]*\s*Rp?\s*([\d.,]+)/i;
    const jualMatch = text.match(hargaJualRegex);
    if (jualMatch && jualMatch[2]) {
      const amountStr = cleanNumberString(jualMatch[2]); // "77,400" -> "77400"
      amount = parseFloat(amountStr);
      return { amount: amount, description: description.substring(0, 50) };
    }

    // 4. Fallback: Cari angka terbesar (Prioritas 3)
    let maxAmount = 0;
    const amountRegex = /([\d.,]+)/g;
    let allNumbers = text.match(amountRegex) || [];
    
    // Kata kunci di baris yang harus diabaikan
    const ignoreKeywords = /(TUNAI|KEMBALI|DPP|PPN|HEMAT|KCNG|AYAM|0811|811333)/i;

    allNumbers.forEach(numStr => {
      const cleanedNumStr = cleanNumberString(numStr); // "75,400" -> "75400", "0811..." -> "0811..."

      // Filter 1: Bukan nomor telepon (terlalu panjang)
      if (cleanedNumStr.length >= 10) { 
        return; // Skip
      }
      // Filter 2: Bukan angka item (terlalu kecil)
      if (cleanedNumStr.length < 4) { // Anggap total minimal 1.000
        return;
      }

      // Filter 3: Cek seluruh baris tempat angka ini ditemukan
      try {
        const lineRegex = new RegExp(`.*${numStr.replace('.', '\\.').replace(',', ',')}.*`, "i");
        const lineMatch = text.match(lineRegex);
        if (lineMatch && lineMatch[0].match(ignoreKeywords)) {
          return; // Skip baris yang mengandung TUNAI, KEMBALI, PPN, atau bagian dari no telp
        }
      } catch (e) {
        // Abaikan error regex jika numStr mengandung karakter aneh
      }

      const num = parseFloat(cleanedNumStr);
      if (num > maxAmount) {
        maxAmount = num;
      }
    });

    amount = maxAmount;

    return {
      amount: amount || 0,
      description: description.substring(0, 50) // Batasi panjang deskripsi
    };

  } catch (error) {
    console.error("Error parsing receipt text:", error);
    return { amount: 0, description: 'Gagal parsing nota' };
  }
};