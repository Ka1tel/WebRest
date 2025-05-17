import React, { useState } from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import './RatingFilter.css';

const RatingFilter = ({ value, onChange }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="rating-filter-container">
      <h3 className="filter-title">
        <FaStar className="title-icon" /> Рейтинг
      </h3>
      <div className="stars-wrapper">
        <div className="stars-group">
          {stars.map((star) => (
            <div
              key={star}
              className="star-container"
              onClick={() => onChange(star === value ? 0 : star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
            >
              {(star <= (hoverRating || value)) ? (
                <FaStar className="star filled" />
              ) : (
                <FaRegStar className="star" />
              )}
            </div>
          ))}
        </div>
        <div className="rating-text">
          {value > 0 ? `${value}+` : 'Любой рейтинг'}
        </div>
      </div>
    </div>
  );
};

export default RatingFilter;