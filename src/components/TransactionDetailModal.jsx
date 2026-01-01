import React from 'react';
import { formatCurrency } from '../utils/format';

// [MODIFIKASI] Tambahkan props onEdit
const TransactionDetailModal = ({ transaction, onClose, onEdit }) => {
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const isTransfer = transaction.category === 'Transfer';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content transaction-detail-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Detail Transaksi</h2>
        
        <h3 className="detail-description">
          {transaction.description || <i>Tidak ada deskripsi</i>}
        </h3>
        
        <h2 className={`detail-amount ${transaction.type}`}>
          {transaction.type === 'expense' ? '-' : '+'}
          {formatCurrency(transaction.amount)}
        </h2>
        
        <ul className="detail-list">
          <li><span>Kategori</span><strong>{transaction.category}</strong></li>
          <li><span>Tanggal</span><strong>{formatDate(transaction.date)}</strong></li>
          <li><span>Akun</span><strong>{transaction.accounts ? transaction.accounts.name : <i>Tidak diketahui</i>}</strong></li>
          {isTransfer && transaction.destination_accounts && (
            <li>
              <span>{transaction.type === 'expense' ? 'Ke Akun' : 'Dari Akun'}</span>
              <strong>{transaction.destination_accounts.name}</strong>
            </li>
          )}
        </ul>

        {transaction.receipt_url && (
          <div className="receipt-container">
            <h3>Foto Struk</h3>
            <a href={transaction.receipt_url} target="_blank" rel="noopener noreferrer">
              <img src={transaction.receipt_url} alt="Struk Transaksi" className="receipt-image" />
            </a>
          </div>
        )}

        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '1.5rem', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
          
          {/* [BARU] Tombol Edit - Disembunyikan untuk Transfer karena logic update transfer kompleks */}
          {!isTransfer && (
            <button 
                type="button" 
                className="btn-primary" 
                style={{ backgroundColor: '#f39c12', color: 'white', border: 'none' }}
                onClick={() => {
                    onEdit(transaction); // Panggil fungsi parent
                }}
            >
                Edit ✏️
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailModal;