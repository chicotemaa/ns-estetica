import { FC, useEffect, useState } from 'react';
import { FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi';

interface NavbarProps {
  toggleTheme: () => void;
  theme: string;
}

const Navbar: FC<NavbarProps> = ({ toggleTheme, theme }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'py-2' : 'py-4'} ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} shadow-md`}>
      <div className="container mx-auto flex justify-between items-center px-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-10 h-10 rounded-full border-2 border-gray-800 dark:border-white flex items-center justify-center text-gray-800 dark:text-white font-bold">
              NS
            </div>
            <div className="border-l-2 border-gray-800 dark:border-white h-10"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Natalia Sanchez</span>
            <span className="text-sm tracking-widest text-gray-600 dark:text-gray-300">ESTETICA</span>
          </div>
        </div>
        <div className="hidden md:flex space-x-8">
          <a href="#services" className="nav-link font-normal text-lg text-gray-800 dark:text-white">SERVICIOS</a>
          <a href="#workinfo" className="nav-link font-normal text-lg text-gray-800 dark:text-white">TRABAJOS</a>
          <a href="#contact" className="nav-link font-normal text-lg text-gray-800 dark:text-white">CONTACTO</a>
        </div>
        <button onClick={toggleTheme} className="text-2xl text-gray-800 dark:text-white hidden md:block">
          {theme === 'dark' ? <FiSun /> : <FiMoon />}
        </button>
        <div className="md:hidden flex items-center">
          <button onClick={toggleMenu} className="text-2xl text-gray-800 dark:text-white">
            {isMenuOpen ? <FiX /> : <FiMenu />}
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 shadow-md">
          <a href="#services" className="block font-normal text-lg text-gray-800 dark:text-white px-4 py-2">SERVICIOS</a>
          <a href="#telegramas" className="block font-normal text-lg text-gray-800 dark:text-white px-4 py-2">TELEGRAMAS</a>
          <a href="#workinfo" className="block font-normal text-lg text-gray-800 dark:text-white px-4 py-2">TRABAJOS</a>
          <a href="#contact" className="block font-normal text-lg text-gray-800 dark:text-white px-4 py-2">CONTACTO</a>
          <button onClick={toggleTheme} className="w-full text-lg text-gray-800 dark:text-white px-4 py-2 flex justify-start items-center">
            {theme === 'dark' ? <FiSun className="mr-2" /> : <FiMoon className="mr-2" />} Tema
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
