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

// === [FUNGSI BARU] ===
// Untuk menampilkan nama bulan dan tahun (e.g., "Oktober 2025")
export const formatMonthYear = (date) => {
  return date.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
};

export const parseReceiptText = (text) => {
  let amount = 0;
  let description = 'Nota Terbaca'; // Default

  try {
    // 1. Coba cari kata "TOTAL" atau "JUMLAH" diikuti dengan angka
    // Contoh: TOTAL Rp125.000
    // Regex: \b(TOTAL|JUMLAH|TAGIHAN)\b[\s:Rp.]*([\d\.,]+)
    const totalRegex = /\b(TOTAL|JUMLAH|TAGIHAN)\b[\s:Rp.]*([\d\.,]+)/i;
    const match = text.match(totalRegex);

    if (match && match[2]) {
      // Bersihkan angka (hapus titik/koma pemisah ribuan, jaga koma desimal jika ada)
      const amountString = match[2].replace(/\./g, '').replace(',', '.');
      amount = parseFloat(amountString);
    } else {
      // 2. Jika tidak ketemu "TOTAL", cari angka terbesar (strategi cadangan)
      const amountRegex = /([\d\.,]+)/g;
      let allNumbers = text.match(amountRegex) || [];
      let maxAmount = 0;
      
      allNumbers.forEach(numStr => {
        // Hanya proses angka yang terlihat seperti mata uang (lebih dari 100)
        const num = parseFloat(numStr.replace(/\./g, '').replace(',', '.'));
        if (num > maxAmount && num > 100) {
          maxAmount = num;
        }
      });
      amount = maxAmount;
    }

    // 3. Coba ambil baris pertama sebagai deskripsi/nama toko
    const lines = text.split('\n');
    if (lines.length > 0 && lines[0].trim() !== '') {
      description = lines[0].trim();
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