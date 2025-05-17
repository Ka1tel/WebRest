import './TypeFilter.css';

const TypeFilter = ({ value, onChange }) => {
  return (
    <div className="filter-container">
      <select 
        className="type-filter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Фильтр по типу заведения"
      >
        <option value="all">Все типы</option>
        <option value="ресторан">🍽️ Рестораны</option>
        <option value="кафе">☕ Кафе</option>
        <option value="бар">🍸 Бары</option>
        <option value="фастфуд">🍔 Фастфуд</option>
        <option value="кофейня">🧋 Кофейни</option>
        <option value="пиццерия">🍕 Пиццерии</option>
      </select>
      <span className="filter-arrow"></span>
    </div>
  );
};

export default TypeFilter;