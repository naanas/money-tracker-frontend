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
  ArcElement
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
// [MODIFIKASI] Impor formatNumberInput
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
  ArcElement
);

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
          // Tooltip tetap pakai formatCurrency lengkap
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
        // === [INI PERBAIKANNYA] ===
        // Menggunakan formatNumberInput (misal: 1.000.000)
        // Bukan formatCurrency(value, '')
        callback: (value) => formatNumberInput(value)
        // === [AKHIR PERBAIKAN] ===
      },
      grid: { color: '#3a3a3a' }
    }
  }
};

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
                        // Tooltip tetap pakai formatCurrency lengkap
                        label += formatCurrency(context.parsed);
                    }
                    return label;
                }
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
            borderColor: '#4ade80',
            backgroundColor: '#4ade80',
            tension: 0.1
          },
          {
            label: 'Pengeluaran',
            data: trendData.map(d => d.expense),
            borderColor: '#f87171',
            backgroundColor: '#f87171',
            tension: 0.1
          }
        ]
      });

      // 2. Data untuk Pie Chart (Agregat 6 bulan)
      const categoryAgg = {};
      trendData.forEach(month => {
        Object.keys(month.categories).forEach(category => {
          categoryAgg[category] = (categoryAgg[category] || 0) + month.categories[category];
        });
      });
      
      const pieLabels = Object.keys(categoryAgg);
      const pieData = Object.values(categoryAgg);
      
      // Hasilkan warna acak untuk pie chart
      const pieColors = pieLabels.map(() => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`);

      setPieChartData({
        labels: pieLabels,
        datasets: [{
          data: pieData,
          backgroundColor: pieColors,
          borderColor: '#1e1e1e',
          borderWidth: 2
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
          <div className="card chart-container" style={{height: '400px'}}>
            <h3>Pemasukan vs Pengeluaran</h3>
            {lineChartData ? 
                (<Line options={chartOptions} data={lineChartData} />) : 
                (<p>Data tidak cukup.</p>)
            }
          </div>
          
          <div className="card chart-container" style={{height: '400px'}}>
            <h3>Top Pengeluaran (6 Bulan)</h3>
            {pieChartData && pieChartData.datasets[0].data.length > 0 ? 
                (<Doughnut options={pieOptions} data={pieChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>)
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;