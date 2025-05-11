import Hero from '../../components/Hero/Hero';
import CardAbout from '../../components/CardAbout/CardAbout';
import RestaurantCards from '../../components/RestaurantCards/RestaurantCards';


const MainPage = () => {
  return (
    <div className="main-page">
      <Hero />
      <CardAbout />
      <RestaurantCards />
      
    </div>
  );
};

export default MainPage;