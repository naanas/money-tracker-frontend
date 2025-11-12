import React from 'react';
import { Link } from 'react-router-dom';

const EmptyState = ({ title, message, actionText, actionLink, onActionClick }) => {
  
  const renderAction = () => {
    if (actionLink) {
      return (
        <Link to={actionLink} className="btn-primary-empty-state">
          {actionText}
        </Link>
      );
    }
    if (onActionClick) {
      return (
        <button onClick={onActionClick} className="btn-primary-empty-state">
          {actionText}
        </button>
      );
    }
    return null;
  };

  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">
        {title.includes('🎉') ? '🎉' : '🤔'}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      <div className="empty-state-action">
        {renderAction()}
      </div>
    </div>
  );
};

export default EmptyState;