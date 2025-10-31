import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axiosClient from '../api/axiosClient';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        // Panggil API backend Anda yang dilindungi
        const { data } = await axiosClient.get('/api/transactions?limit=5');
        setTransactions(data.data.transactions);
      } catch (err) {
        setError('Gagal mengambil transaksi');
      }
      setLoading(false);
    };

    fetchTransactions();
  }, []);

  return (
    <div className="dashboard-container">
      <header>
        <h2>Dashboard</h2>
        <div>
          <span>Halo, {user?.email}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <h3>5 Transaksi Terakhir</h3>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      <ul>
        {transactions.length > 0 ? (
          transactions.map((t) => (
            <li key={t.id}>
              {t.date.split('T')[0]}: {t.description || t.category} -{' '}
              <span className={t.type}>
                {t.type === 'expense' ? '-' : '+'}
                {t.amount}
              </span>
            </li>
          ))
        ) : (
          !loading && <p>Belum ada transaksi.</p>
        )}
      </ul>
    </div>
  );
};

export default Dashboard;