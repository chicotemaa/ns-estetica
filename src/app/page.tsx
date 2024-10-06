"use client"
import { useEffect } from 'react';
import ThemeToggle from '../components/common/ThemeToggle';
import Navbar from '../components/common/Navbar';
import Home from '../components/home/Home';
import Services from '../components/services/Services';
import ContactForm from '../components/contact/ContactForm';
import Footer from '../components/common/Footer';
import About from '../components/about/About';
import WorkInfo from '../components/info/WorkInfo';
import SEO from '../components/common/SEO';
import WhatsAppButton from '../components/common/WhatsAppButton';
import CustomModal from '../components/pop-up/Modal';
import AOS from 'aos';
import 'aos/dist/aos.css';
import ScrollToTopButton from '../components/common/ScrollToTopButton';
import Telegramas from '../components/telegrama/Telegramas';

export default function Page() {
  const { theme, toggleTheme } = ThemeToggle();

  useEffect(() => {
    AOS.init({
      duration: 500, 
    });
  }, []);

  return (
    <>
      <SEO />
       {/* <CustomModal /> */}
      <div className="min-h-screen flex flex-col">
        <Navbar toggleTheme={toggleTheme} theme={theme} />
        <Home />
        <Services />
         <About /> 
         {/* <Telegramas /> */}
        <WorkInfo />
        <ContactForm />
        <Footer />
        <WhatsAppButton /> 
        <ScrollToTopButton />
      </div>
    </>
  );
}
