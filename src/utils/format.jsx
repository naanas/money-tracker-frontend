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