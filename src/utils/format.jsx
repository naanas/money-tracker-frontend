// Kita gunakan format yang sama dengan backend
export const formatCurrency = (amount, currency = 'IDR') => {
    // Jika amount bukan angka, kembalikan default
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