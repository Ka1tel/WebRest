import { Outlet } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';

import './App.css';

export default function App() {
  return (
    <div className="app">
      <Header />
      
      <main className="main-content">
        <Outlet /> {/* страницы */}
      </main>
      <Footer />
    </div>
  );
}