import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';
import {
  Chart as ChartJS,
  // ... (semua impor ChartJS tetap sama)
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement, RadialLinearScale, Filler
} from 'chart.js';
import { Line, Doughnut, Radar } from 'react-chartjs-2';
import { formatCurrency, formatNumberInput } from '../utils/format';
import EmptyState from '../components/EmptyState'; // [BARU]

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement, RadialLinearScale, Filler
);

// ... (Semua opsi chart: chartOptions, pieOptions, radarOptions tetap sama)
const chartOptions = { /* ... */ };
const pieOptions = { /* ... */ };
const radarOptions = { /* ... */ };

const Reports = () => {
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [lineChartData, setLineChartData] = useState(null);
  const [pieChartData, setPieChartData] = useState(null);
  const [radarChartData, setRadarChartData] = useState(null);
  const [hasData, setHasData] = useState(false); // [BARU]

  const fetchTrends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get('/api/analytics/trends');
      setTrendData(res.data.data);
      // [BARU] Cek apakah ada data
      const
       totalIncome = res.data.data.reduce((sum, d) => sum + d.income, 0);
      const totalExpense = res.data.data.reduce((sum, d) => sum + d.expense, 0);
      setHasData(totalIncome > 0 || totalExpense > 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat tren');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // ... (useEffect untuk memproses trendData tidak berubah)
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

      // 2. Data untuk Pie Chart & Radar Chart
      const categoryAgg = {};
      trendData.forEach(month => {
        Object.keys(month.categories).forEach(category => {
          categoryAgg[category] = (categoryAgg[category] || 0) + month.categories[category];
        });
      });
      
      const chartLabels = Object.keys(categoryAgg);
      const chartData = Object.values(categoryAgg);
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
          backgroundColor: 'rgba(0, 224, 198, 0.2)',
          borderColor: '#00e0c6',
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
      
      {!loading && !error && !hasData && (
        // [BARU] Empty state
        <EmptyState
          title="Data Laporan Belum Cukup"
          message="Mulai catat transaksi pemasukan dan pengeluaran Anda. Setelah itu, laporan tren keuangan Anda akan muncul di sini."
        />
      )}

      {!loading && !error && hasData && (
        <div className="reports-grid">
          
          <div className="card chart-container" style={{height: '400px', gridColumn: 'span 1 / -1'}}> 
            <h3>Pemasukan vs Pengeluaran (6 Bulan)</h3>
            {lineChartData ? 
                (<Line options={chartOptions} data={lineChartData} />) : 
                (<p>Data tidak cukup.</p>)
            }
          </div>
          
          <div className="card chart-container" style={{height: '400px'}}>
            <h3>Top Pengeluaran (6 Bulan)</h3>
            {pieChartData && pieChartData.datasets[0].data.length > 0 ? 
                (<Doughnut options={pieOptions} data={pieChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>) // [DIUBAH]
            }
          </div>

          <div className="card chart-container" style={{height: '400px'}}>
            <h3>Sebaran Pengeluaran (6 Bulan)</h3>
            {radarChartData && radarChartData.datasets[0].data.length > 0 ? 
                (<Radar options={radarOptions} data={radarChartData} />) : 
                (<p>Tidak ada data pengeluaran.</p>) // [DIUBAH]
            }
          </div>

        </div>
      )}
    </div>
  );
};

export default Reports;