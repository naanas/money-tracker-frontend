import React, { useState } from 'react';
import TransactionForm from './TransactionForm';
import TransferForm from './TransferForm';
import CategoryForm from './CategoryForm';

const AddTransactionModal = ({ isOpen, onClose, categories, accounts, onSuccess, onRefetchCategories }) => {
  const [activeTab, setActiveTab] = useState('transaction');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  if (!isOpen) return null;

  // Handler sukses terpusat
  const handleSuccess = () => {
    onSuccess(); // Ini akan menutup modal & trigger animasi
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          
          {/* [BARU] Tab di dalam Modal */}
          <div className="dashboard-tabs" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
            <button
              className={activeTab === 'transaction' ? 'active' : ''}
              onClick={() => setActiveTab('transaction')}
            >
              Transaksi
            </button>
            <button
              className={activeTab === 'transfer' ? 'active' : ''}
              onClick={() => setActiveTab('transfer')}
            >
              Transfer
            </button>
          </div>

          {/* Render form berdasarkan tab */}
          {activeTab === 'transaction' ? (
            <TransactionForm
              categories={categories}
              accounts={accounts}
              onTransactionAdded={handleSuccess}
              onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
              selectedDate={new Date()} // Selalu gunakan tanggal hari ini untuk FAB
              isRefetching={false}
            />
          ) : (
            <TransferForm
              accounts={accounts}
              onTransferAdded={handleSuccess}
              isRefetching={false}
              selectedDate={new Date()} // Selalu gunakan tanggal hari ini untuk FAB
            />
          )}

          <button type="button" className="btn-secondary" onClick={onClose} style={{marginTop: '1rem'}}>
            Tutup
          </button>
        </div>
      </div>

      {/* Modal Kategori (di atas modal transaksi) */}
      {isCategoryModalOpen && (
        <CategoryForm 
          existingCategories={categories}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={async () => {
            await onRefetchCategories();
            setIsCategoryModalOpen(false);
          }} 
        />
      )}
    </>
  );
};

export default AddTransactionModal;
