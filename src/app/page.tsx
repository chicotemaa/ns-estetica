import Navbar from '../components/common/Navbar';
import Home from '../components/home/Home';
import Services from '../components/services/Services';
import About from '../components/about/About';
import WorkInfo from '../components/info/WorkInfo';
import Booking from '../components/booking/Booking';
import ContactForm from '../components/contact/ContactForm';
import Footer from '../components/common/Footer';

export default function Page() {
  return (
    <>
      <Navbar />
      <main>
        <Home />
        <Services />
        <About />
        <WorkInfo />
        <Booking />
        <ContactForm />
      </main>
      <Footer />
    </>
  );
}
