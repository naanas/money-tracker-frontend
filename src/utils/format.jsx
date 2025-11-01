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

// === [FUNGSI PARSER YANG DIPERBAIKI] ===

/**
 * Fungsi untuk mengekstrak data dari teks nota.
 * Versi ini lebih canggih untuk menghindari kesalahan baca.
 */
export const parseReceiptText = (text) => {
  let amount = 0;
  let description = 'Nota Terbaca'; // Default

  try {
    // 1. Coba cari kata "TOTAL", "JUMLAH", atau "TAGIHAN"
    // Regex ini mencari TOTAL, diikuti spasi/titikdua, diikuti Rp (opsional), lalu angka
    const totalRegex = /\b(TOTAL|JUMLAH|TAGIHAN)\b[\s:Rp.]*([\d\.,]+)/i;
    const match = text.match(totalRegex);

    if (match && match[2]) {
      // Ditemukan kata TOTAL. Ini prioritas utama.
      // "75,400" -> "75400" (menghapus titik ribuan)
      // "75.400" -> "75400"
      const amountString = match[2].replace(/\./g, '').replace(',', '.');
      amount = parseFloat(amountString);
      
    } else {
      // 2. [STRATEGI CADANGAN] Jika "TOTAL" tidak ditemukan.
      // Cari angka terbesar yang BUKAN nomor telepon atau ID.
      
      const amountRegex = /([\d\.,]+)/g;
      let allNumbers = text.match(amountRegex) || [];
      let maxAmount = 0;
      
      allNumbers.forEach(numStr => {
        // Bersihkan angka
        const cleanedNumStr = numStr.replace(/[.,]/g, '');

        // [PERBAIKAN] Jangan ambil angka yang terlalu panjang (kemungkinan no. telp)
        // atau terlalu kecil.
        if (cleanedNumStr.length > 9 || cleanedNumStr.length < 3) { 
          return; // Skip (contoh: "0811..." atau "44" atau "1")
        }

        const num = parseFloat(cleanedNumStr);
        
        // Cek apakah angka ini ada di baris "TUNAI" atau "KEMBALI"
        // Jika iya, JANGAN gunakan sebagai total.
        // Regex: (TUNAI|KEMBALI|DPP|PPN|HEMAT) [spasi/titikdua/Rp] [angka]
        const lineRegex = new RegExp(`(TUNAI|KEMBALI|DPP|PPN|HEMAT)[\s:Rp.]*${numStr.replace('.', '\\.')}`, "i");
        if (text.match(lineRegex)) {
          return; // Skip, ini bukan total belanja
        }
        
        if (num > maxAmount) {
          maxAmount = num;
        }
      });
      
      // 3. [CADANGAN KEDUA] Jika maxAmount masih 0, coba cari "HARGA JUAL"
      if (maxAmount === 0) {
         const hargaJualRegex = /\b(HARGA JUAL)\b[\s:Rp.]*([\d\.,]+)/i;
         const jualMatch = text.match(hargaJualRegex);
         if (jualMatch && jualMatch[2]) {
           // Hapus titik ribuan
           maxAmount = parseFloat(jualMatch[2].replace(/\./g, '').replace(',', '.'));
         }
      }
      
      amount = maxAmount;
    }

    // 4. Coba ambil baris pertama sebagai deskripsi/nama toko
    const lines = text.split('\n');
    if (lines.length > 0 && lines[0].trim() !== '') {
      const firstLine = lines[0].trim();
      
      // [PERBAIKAN] Hapus nomor telepon (10-13 digit) dari deskripsi
      description = firstLine.replace(/\b\d{10,13}\b/g, '').trim();
    }

    return {
      amount: amount || 0,
      description: description.substring(0, 50) // Batasi panjang deskripsi
    };

  } catch (error) {
    console.error("Error parsing receipt text:", error);
    return { amount: 0, description: 'Gagal parsing nota' };
  }
};