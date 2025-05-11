import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import RegistrationPage from './pages/RegistrationPage/RegistrationPage';
import RestaurantsPage from './pages/RestaurantsPage/RestaurantsPage';
import ReviewsPage from './pages/ReviewsPage/ReviewsPage';
import DishesPage from './pages/DishesPage/DishesPage';
import MainPage from './pages/MainPage/MainPage';
import AboutPage from './pages/AboutPage/AboutPage'; // Импортируем новый компонент
import RestaurantDetailsPage from './pages/RestaurantDetailsPage/RestaurantDetailsPage';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import VerificationPage from './pages/VerificationPage/VerificationPage.jsx';
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <MainPage />,
      },
      {
        path: "restaurants",
        element: <RestaurantsPage />,
      },
      {
        path: "restaurants/:id", // Добавляем динамический маршрут для деталей ресторана
        element: <RestaurantDetailsPage />,
      },
      {
        path: "reviews",
        element: <ReviewsPage />,
      },
      {
        path: "dishes",
        element: <DishesPage />,
      },
      {
        path: "about", // Добавляем новый маршрут
        element: <AboutPage />,
      },
      
    ]
  },
  {
    path: "/register",
    element: <RegistrationPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/verify",
    element: <VerificationPage />,
  },
  
  
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);