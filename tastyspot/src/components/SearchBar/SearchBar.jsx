import { FiSearch, FiX } from 'react-icons/fi';
import './SearchBar.css';

const SearchBar = ({ value, onChange }) => {
  return (
    <div className="search-bar">
      <FiSearch className="search-icon" />
      <input
        type="text"
        placeholder="Поиск по названию или адресу..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
      {value && (
        <button 
          className="clear-btn"
          onClick={() => onChange('')}
          aria-label="Очистить поиск"
        >
          <FiX />
        </button>
      )}
    </div>
  );
};

export default SearchBar;