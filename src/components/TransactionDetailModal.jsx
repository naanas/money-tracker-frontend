// naanas/money-tracker-frontend/money-tracker-frontend-93f64fc0bdf098eeeda4e51adbfa651c35390e0c/src/components/TransactionDetailModal.jsx
import React from 'react';
import { formatCurrency } from '../utils/format';

const TransactionDetailModal = ({ transaction, onClose }) => {
  
  // Fungsi helper untuk memformat tanggal
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content transaction-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Detail Transaksi</h2>
        
        {/* Judul/Deskripsi Utama */}
        <h3 className="detail-description">
          {transaction.description || <i>Tidak ada deskripsi</i>}
        </h3>
        
        {/* Jumlah */}
        <h2 className={`detail-amount ${transaction.type}`}>
          {transaction.type === 'expense' ? '-' : '+'}
          {formatCurrency(transaction.amount)}
        </h2>
        
        {/* Daftar Detail */}
        <ul className="detail-list">
          <li>
            <span>Kategori</span>
            <strong>{transaction.category}</strong>
          </li>
          <li>
            <span>Tanggal</span>
            <strong>{formatDate(transaction.date)}</strong>
          </li>
          <li>
            <span>Akun</span>
            <strong>{transaction.accounts ? transaction.accounts.name : <i>Tidak diketahui</i>}</strong>
          </li>
          {/* Menampilkan akun tujuan jika ini adalah transfer */}
          {transaction.category === 'Transfer' && transaction.destination_accounts && (
            <li>
              <span>{transaction.type === 'expense' ? 'Ke Akun' : 'Dari Akun'}</span>
              <strong>{transaction.destination_accounts.name}</strong>
            </li>
          )}
        </ul>

        {/* Bagian Foto Struk */}
        {transaction.receipt_url && (
          <div className="receipt-container">
            <h3>Foto Struk</h3>
            {/* Tautkan gambar ke URL aslinya untuk zoom */}
            <a href={transaction.receipt_url} target="_blank" rel="noopener noreferrer">
              <img src={transaction.receipt_url} alt="Struk Transaksi" className="receipt-image" />
            </a>
          </div>
        )}

        {/* Tombol Tutup */}
        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;