import React from 'react';
import { formatCurrency } from '../utils/format';
import { Link } from 'react-router-dom';

const AccountSummary = ({ accounts }) => {
  return (
    <section className="card card-list">
      <h3>Saldo Akun</h3>
      <ul>
        {accounts.length > 0 ? (
          accounts.map((acc) => (
            <li key={acc.id} className="list-item">
              <div className="list-item-details">
                <strong>{acc.name}</strong>
                <span>{acc.type}</span>
              </div>
              <span className={acc.current_balance >= 0 ? 'income' : 'expense'}>
                {formatCurrency(acc.current_balance)}
              </span>
            </li>
          ))
        ) : (
          <p>Anda belum memiliki akun.</p>
        )}
      </ul>
      <Link to="/accounts" className="btn-link-full">
        Kelola Akun
      </Link>
    </section>
  );
};

export default AccountSummary;