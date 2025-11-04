import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  // [BARU] Impor elemen untuk Radar Chart
  RadialLinearScale,
  Filler
} from 'chart.js';
// [MODIFIKASI] Impor Radar
import { Line, Doughnut, Radar } from 'react-chartjs-2';
import { formatCurrency, formatNumberInput } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  // [BARU] Registrasi elemen Radar Chart
  RadialLinearScale,
  Filler
);

// Opsi untuk Line Chart (tidak berubah)
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#e1e1e1',
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += formatCurrency(context.parsed.y);
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      ticks: { color: '#e1e1e1' },
      grid: { color: '#3a3a3a' }
    },
    y: {
      ticks: { 
        color: '#e1e1e1',
        callback: (value) => formatNumberInput(value)
      },
      grid: { color: '#3a3a3a' }
    }
  }
};

// Opsi untuk Doughnut Chart (tidak berubah)
const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right',
             labels: {
                color: '#e1e1e1',
                font: { size: 12 },
                boxWidth: 20
            }
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.label || '';
                    if (label) { label += ': '; }
                    if (context.parsed !== null) {
                        label += formatCurrency(context.parsed);
                    }
                    return label;
                }
            }
        }
    }
};

// === [BARU] Opsi untuk Radar Chart ===
// Dibuat agar konsisten dengan tema gelap Anda
const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false, // Legenda di radar chart bisa terlalu ramai
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          // Di radar chart, nilainya adalah 'r' (radius)
          if (context.parsed.r !== null) {
            label += formatCurrency(context.parsed.r);
          }
          return label;
        }
      }
    }
  },
  scales: {
    r: { // 'r' untuk skala Radial
      angleLines: {
        color: 'var(--color-border)' // Garis dari pusat
      },
      grid: {
        color: 'var(--color-border)' // Grid melingkar
      },
      pointLabels: { // Label kategori (e.g., Grocery, Taxi)
        color: 'var(--color-text)',
        font: {
          size: 12
        }
      },
      ticks: {
        display: false, // Sembunyikan angka di skala (e.g., 100k, 200k)
        backdropColor: 'transparent'
      }
    }
  }
};

// Halaman Laporan
const Reports = () => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State untuk data chart
  const [lineChartData, setLineChartData] = useState(null);
  const [pieChartData, setPieChartData] = useState(null);
  
  // === [BARU] State untuk Radar Chart ===
  const [radarChartData, setRadarChartData] = useState(null);

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/api/analytics/trends');
      setTrendData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat tren');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Proses data untuk chart ketika trendData berubah
  useEffect(() => {
    if (trendData.length > 0) {
      // 1. Data untuk Line Chart
      const labels = trendData.map(d => d.label);
      setLineChartData({
        labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: trendData.map(d => d.income),
            borderColor: 'var(--color-accent-income)',
            backgroundColor: 'var(--color-accent-income)',
            tension: 0.1
          },
          {
            label: 'Pengeluaran',
            data: trendData.map(d => d.expense),
            borderColor: 'var(--color-accent-expense)',
            backgroundColor: 'var(--color-accent-expense)',
            tension: 0.1
          }
        ]
      });

      // 2. Data untuk Pie Chart & Radar Chart (Agregat 6 bulan)
      const categoryAgg = {};
      trendData.forEach(month => {
        Object.keys(month.categories).forEach(category => {
          categoryAgg[category] = (categoryAgg[category] || 0) + month.categories[category];
        });
      });
      
      const chartLabels = Object.keys(categoryAgg);
      const chartData = Object.values(categoryAgg);
      
      // Hasilkan warna acak untuk pie chart
      const pieColors = chartLabels.map(() => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`);

      setPieChartData({
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: pieColors,
          borderColor: 'var(--color-bg-medium)',
          borderWidth: 2
        }]
      });

      // === [BARU] 3. Data untuk Radar Chart ===
      setRadarChartData({
        labels: chartLabels, // Label yang sama
        datasets: [{
          label: 'Pengeluaran 6 Bulan',
          data: chartData, // Data yang sama
          backgroundColor: 'rgba(0, 224, 198, 0.2)', // Area dalam (transparan)
          borderColor: 'var(--color-primary)', // Garis luar (solid)
          borderWidth: 2,
          pointBackgroundColor: 'var(--color-primary)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'var(--color-primary)'
        }]
      });

    }
  }, [trendData]);

  return (
    <div className="reports-page">
      <h2>Laporan & Tren</h2>
      <p>Lihat tren keuangan Anda selama 6 bulan terakhir.</p>

      {loading && <p>Memuat laporan...</p>}
      {error && <p className="error">{error}</p>}
      
      {!loading && !error && (
        // [MODIFIKASI] Grid diubah untuk menampung 3 chart
        <div className="reports-grid">
          
          {/* Chart 1: Line Chart (Full Width) */}
          <div className="card chart-container" style={{height: '400px', gridColumn: 'span 1 / -1'}}> 
            <h3>Pemasukan vs Pengeluaran (6 Bulan)</h3>
            {lineChartData ? 
                (<Line options={chartOptions} data={lineChartData} />) : 
                (<p>Data tidak cukup.</p>)
            }
          </div>
          
          {/* Chart 2: Doughnut Chart */}
          <div className="card chart-container" style={{height: '400px'}}>
            <h3>Top Pengeluaran (6 Bulan)</h3>
            {pieChartData && pieChartData.datasets[0].data.length > 0 ? 
                (<Doughnut options={pieOptions} data={pieChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>)
            }
          </div>

          {/* === [BARU] Chart 3: Radar Chart === */}
          <div className="card chart-container" style={{height: '400px'}}>
            <h3>Sebaran Pengeluaran (6 Bulan)</h3>
            {radarChartData && radarChartData.datasets[0].data.length > 0 ? 
                (<Radar options={radarOptions} data={radarChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>)
            }
          </div>
          {/* === [AKHIR CHART BARU] === */}

        </div>
      )}
    </div>
  );
};

export default Reports;