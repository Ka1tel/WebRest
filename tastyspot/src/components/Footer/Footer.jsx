import React from 'react';
import './Footer.css';
import { FaInstagram, FaFacebook, FaTwitter } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Блок с копирайтом */}
        <div className="footer-section">
          <p className="copyright">© TastySpot 2025</p>
          <p>Все права защищены</p>
          <p className="privacy-link">Политика конфиденциальности</p>
        </div>

        {/* Блок с адресом */}
        <div className="footer-section">
          <h4>Адрес и время работы</h4>
          <p>г. Минск, ул. Пушкина д. 2</p>
          <p>пн-сб 10:00 - 18:00</p>
          <p>воскресенье выходной</p>
        </div>

        {/* Карта сайта */}
        <div className="footer-section">
          <h4>Карта сайта</h4>
          <ul className="site-map">
            <li><a href="/">Главная</a></li>
            <li><a href="/restaurants">Наши рестораны</a></li>
            <li><a href="/about">О нас</a></li>
            <li><a href="/contacts">Контакты</a></li>
          </ul>
        </div>

        {/* Соцсети */}
        <div className="footer-section social-links">
          <h4>Соцсети</h4>
          <div className="social-icons">
            <a href="https://instagram.com" aria-label="Instagram">
              <FaInstagram className="social-icon" />
            </a>
            <a href="https://facebook.com" aria-label="Facebook">
              <FaFacebook className="social-icon" />
            </a>
            <a href="https://twitter.com" aria-label="Twitter">
              <FaTwitter className="social-icon" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;