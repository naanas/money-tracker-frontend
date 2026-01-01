import React, { useState } from 'react';
import TransactionForm from './TransactionForm';
import CategoryForm from './CategoryForm';

const EditTransactionModal = ({ isOpen, onClose, transaction, categories, accounts, onSuccess, onRefetchCategories }) => {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  if (!isOpen || !transaction) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
          
          <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Edit Transaksi</h2>

          <TransactionForm
            categories={categories}
            accounts={accounts}
            onTransactionAdded={onSuccess} // Akan dipanggil setelah update berhasil
            onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
            isRefetching={false}
            initialData={transaction} // [PENTING] Kirim data transaksi untuk diedit
          />

          <button type="button" className="btn-secondary" onClick={onClose} style={{marginTop: '1rem', width: '100%'}}>
            Batal
          </button>
        </div>
      </div>

      {/* Modal Kategori (jika user ingin tambah kategori saat edit) */}
      {isCategoryModalOpen && (
        <CategoryForm 
          existingCategories={categories}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={async () => {
            if(onRefetchCategories) await onRefetchCategories();
            setIsCategoryModalOpen(false);
          }} 
        />
      )}
    </>
  );
};

export default EditTransactionModal;