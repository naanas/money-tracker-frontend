// naanas/money-tracker-frontend/money-tracker-frontend-93f64fc0bdf098eeeda4e51adbfa651c35390e0c/src/pages/Reports.jsx

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
  RadialLinearScale,
  Filler
} from 'chart.js';
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
  RadialLinearScale,
  Filler
);

// --- OPSI CHART DIPINDAHKAN KE LUAR KOMPONEN ---

// Opsi untuk Line Chart (Kontras)
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: 'var(--color-text)',
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
      ticks: { color: 'var(--color-text)' },
      grid: { color: 'var(--color-border)' }
    },
    y: {
      ticks: { 
        color: 'var(--color-text)',
        callback: (value) => formatNumberInput(value)
      },
      grid: { color: 'var(--color-border)' }
    }
  }
};

// Opsi untuk Doughnut Chart (Kontras)
const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'right',
             labels: {
                color: 'var(--color-text)',
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

// Opsi untuk Radar Chart
const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.r !== null) {
            label += formatCurrency(context.parsed.r);
          }
          return label;
        }
      }
    }
  },
  scales: {
    r: {
      // [PERBAIKAN] Warna diubah dari merah (error) ke warna border standar
      angleLines: {
        color: 'var(--color-border)' 
      },
      grid: {
        color: 'var(--color-border)' 
      },
      pointLabels: {
        color: 'var(--color-text)',
        font: {
          size: 12
        }
      },
      ticks: {
        display: false,
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
            borderColor: '#4ade80', // Hijau
            backgroundColor: '#4ade80',
            tension: 0.1
          },
          {
            label: 'Pengeluaran',
            data: trendData.map(d => d.expense),
            borderColor: '#f87171', // Merah
            backgroundColor: '#f87171',
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
          borderColor: 'var(--color-border)', 
          borderWidth: 2
        }]
      });

      // 3. Data untuk Radar Chart
      setRadarChartData({
        labels: chartLabels, 
        datasets: [{
          label: 'Pengeluaran 6 Bulan',
          data: chartData, 
          backgroundColor: 'rgba(0, 224, 198, 0.2)', // Area Teal (transparan)
          borderColor: '#00e0c6', // Garis Teal
          borderWidth: 2,
          pointBackgroundColor: '#00e0c6',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#00e0c6'
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
        <div className="reports-grid">
          
          {/* Chart 1: Line Chart (Full Width) */}
          {/* [MODIFIKASI] Inline style dihapus */}
          <div className="card chart-container"> 
            <h3>Pemasukan vs Pengeluaran (6 Bulan)</h3>
            {lineChartData ? 
                (<Line options={chartOptions} data={lineChartData} />) : 
                (<p>Data tidak cukup.</p>)
            }
          </div>
          
          {/* Chart 2: Doughnut Chart */}
          {/* [MODIFIKASI] Inline style dihapus */}
          <div className="card chart-container">
            <h3>Top Pengeluaran (6 Bulan)</h3>
            {pieChartData && pieChartData.datasets[0].data.length > 0 ? 
                (<Doughnut options={pieOptions} data={pieChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>)
            }
          </div>

          {/* Chart 3: Radar Chart */}
          {/* [MODIFIKASI] Inline style dihapus */}
          <div className="card chart-container">
            <h3>Sebaran Pengeluaran (6 Bulan)</h3>
            {radarChartData && radarChartData.datasets[0].data.length > 0 ? 
                (<Radar options={radarOptions} data={radarChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>)
            }
          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;