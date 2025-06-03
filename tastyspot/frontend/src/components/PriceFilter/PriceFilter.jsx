import React from 'react';
import { FaWallet } from 'react-icons/fa';
import './PriceFilter.css';

const PriceFilter = ({ value, onChange }) => {
  const priceLevels = [
    { value: 'all', label: 'Все', icon: <FaWallet className="price-icon all" /> },
    { value: 'low', label: '💰', icon: 'До 500 ₽', className: 'low' },
    { value: 'medium', label: '💰💰', icon: '500-1500 ₽', className: 'medium' },
    { value: 'high', label: '💰💰💰', icon: 'От 1500 ₽', className: 'high' }
  ];

  return (
    <div className="price-filter-container">
      <h3 className="filter-title">
        <FaWallet className="title-icon" /> Ценовой диапазон
      </h3>
      <div className="price-bubbles">
        {priceLevels.map((level) => (
          <button
            key={level.value}
            className={`price-bubble ${level.className} ${value === level.value ? 'active' : ''}`}
            onClick={() => onChange(level.value)}
          >
            <span className="bubble-icon">{level.label}</span>
            <span className="bubble-text">{level.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default PriceFilter;