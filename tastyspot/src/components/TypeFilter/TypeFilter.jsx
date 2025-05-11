import './TypeFilter.css';

const TypeFilter = ({ value, onChange }) => {
  return (
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
    </select>
  );
};

export default TypeFilter;