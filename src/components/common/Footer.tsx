import { FaLinkedin, FaInstagram, FaFacebook, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';

const Footer = () => (
  <footer className="py-8 bg-gray-300 dark:bg-gray-900 text-black dark:text-white">
    <div className="container mx-auto flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0 ml-2">
      {/* Logo y descripción */}
      <div className="flex flex-col items-center md:items-start mb-8 md:mb-0 w-full md:w-1/3 text-center md:text-left gap-5">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-10 h-10 rounded-full border-2 border-gray-800 dark:border-white flex items-center justify-center text-gray-800 dark:text-white font-bold">
              NS
            </div>
            <div className="border-l-2 border-gray-800 dark:border-white h-10"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-serif font-bold text-gray-800 dark:text-white">Natalia Sanchez</span>
            <span className="text-sm tracking-widest text-gray-600 dark:text-gray-300">Estetica</span>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 max-w-xs text-sm">
          Somos especialistas en estética con una amplia experiencia en tratamientos de cuidado personal.
        </p>
        <div className="flex space-x-6 mt-4">
          <a href="https://instagram.com/natalias.estetica" target="_blank" rel="noopener noreferrer" className="text-2xl text-gray-800 dark:text-white hover:text-blue-700"><FaInstagram /></a>
         {/*  <a href="https://wa.me/01166959255" target="_blank" rel="noopener noreferrer" className="text-2xl text-gray-800 dark:text-white hover:text-blue-700"><FaFacebook /></a> */}
        </div>
      </div>

      {/* Links de interés */}
      <div className="w-full md:w-1/3 text-center md:text-left">
        <h3 className="text-lg font-bold mb-4">Links de interés</h3>
        <ul className="list-none p-0 m-0 flex flex-col items-center md:items-start space-y-2">
          <li className="w-full"><a href="#home" className="text-gray-800 dark:text-white hover:underline block text-sm">Inicio</a></li>
          <li className="w-full"><a href="#services" className="text-gray-800 dark:text-white hover:underline block text-sm">Servicios</a></li>
          <li className="w-full"><a href="#contact" className="text-gray-800 dark:text-white hover:underline block text-sm">Contacto</a></li>
        </ul>
      </div>

      {/* Información de contacto */}
      <div className="w-full md:w-1/3 text-center md:text-left hidden md:block">
        <h3 className="text-lg font-bold mb-4">Nuestra info</h3>
        <ul className="list-none p-0 m-0 flex flex-col items-center md:items-start space-y-2">
          <li className="w-full flex items-center">
            <FaPhone className="mr-2 text-yellow-500" />
            <a href="tel:+03624654117" className="text-gray-800 dark:text-white hover:underline block text-sm">+54 3624 654117</a>
          </li>
          <li className="w-full flex items-center">
            <FaEnvelope className="mr-2 text-yellow-500" />
            <a href="mailto:nabrizka@hotmail.com" className="text-gray-800 dark:text-white hover:underline block text-sm">nabrizka@hotmail.com</a>
          </li>
          <li className="w-full flex items-center">
            <FaMapMarkerAlt className="mr-2 text-yellow-500" />
            <span className="text-gray-800 dark:text-white block text-sm">Av Wilde 12, Resistencia - Chaco, Argentina</span>
          </li>
        </ul>
      </div>
    </div>

    <div className="container mx-auto mt-8 text-center text-xs text-gray-600 dark:text-gray-400 border-t-2 border-gray-400 dark:border-gray-400 pt-4 ">
      &copy; {new Date().getFullYear()}. Natalia Sanchez Estética | Todos los derechos reservados.       
      <div>Developed by <a target='_blank' href="https://wa.me/+543624594954" className='font-semibold text-xs'>MTD</a>. </div>
    </div>
  </footer>
);

export default Footer;