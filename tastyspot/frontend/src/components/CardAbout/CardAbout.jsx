import React from 'react';

import { GiChefToque, GiMeal, GiSaucepan, GiHotSpices } from 'react-icons/gi';
import { FaHeart, FaFire, FaUserFriends } from 'react-icons/fa';
import './CardAbout.css';

export default function CardAbout() {
  return (
    <section className="about-section">
      <div className="about-container">
        <div className="about-header">
          <GiChefToque className="about-icon" />
          <h1 className="about-title">Наша философия</h1>
          <div className="divider"></div>
        </div>

        <div className="about-content">
          <div className="about-text">
            <h2 className="about-subtitle">
              TastySpot — <span className="highlight">гид</span> для настоящих гурманов
            </h2>
            <p className="about-description">
              Мы не просто пишем о еде — мы создаем гастрономические истории, которые вдохновляют
              на новые вкусовые открытия.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaHeart className="icon" />
              </div>
              <h3 className="feature-title">Детальные обзоры</h3>
              <p className="feature-text">
                От первого впечатления до послевкусия — мы расскажем все, что важно для истинных ценителей
              </p>
              <GiSaucepan className="decor-icon" />
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaFire className="icon" />
              </div>
              <h3 className="feature-title">Только важное</h3>
              <p className="feature-text">
                Никакой воды и рекламного мусора — только то, что действительно стоит попробовать
              </p>
              <GiHotSpices className="decor-icon" />
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <FaUserFriends className="icon" />
              </div>
              <h3 className="feature-title">Реальные мнения</h3>
              <p className="feature-text">
                100% честные отзывы от таких же гурманов, как и вы. Никаких фейков!
              </p>
              <GiMeal className="decor-icon" />
            </div>
          </div>

          <div className="mission-card">
            <div className="mission-content">
              <h3 className="mission-title">Наша миссия</h3>
              <p className="mission-text">
                Превратить каждый ваш поход в ресторан в незабываемое гастрономическое приключение,
                полное открытий и удовольствия.
              </p>
            </div>
            <div className="mission-image"></div>
          </div>
        </div>
      </div>
    </section>
  );
}