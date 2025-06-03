import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import RegistrationPage from './pages/RegistrationPage/RegistrationPage.jsx';
import RestaurantsPage from './pages/RestaurantsPage/RestaurantsPage.jsx';
import ReviewsPage from './pages/ReviewsPage/ReviewsPage.jsx';
import DishesPage from './pages/DishesPage/DishesPage.jsx';
import MainPage from './pages/MainPage/MainPage.jsx';
import AboutPage from './pages/AboutPage/AboutPage.jsx'; // Импортируем новый компонент
import RestaurantDetailsPage from './pages/RestaurantDetailsPage/RestaurantDetailsPage.jsx';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import VerificationPage from './pages/VerificationPage/VerificationPage.jsx';
import AddRestaurantPage from './pages/AddRestaurantPage/AddRestaurantPage.jsx';
import ProfilePage from './pages/ProfilePage/ProfilePage.jsx';
import AdminReviewsPage from './pages/AdminReviewsPage/AdminReviewsPage.jsx';

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
      {
        path: "restaurants/add",
        element: <AddRestaurantPage />,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/admin/reviews',
        element: <AdminReviewsPage />,
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