import Image from 'next/image';
import { FaCheckCircle, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock, FaCreditCard } from 'react-icons/fa';
import { TbUrgent } from 'react-icons/tb';

const WorkInfo = () => (
  <section id='workinfo'>
    {/* Sección Blanca */}
    <div className="bg-white dark:bg-gray-800 text-black dark:text-white p-8 flex flex-col md:flex-row items-center">
      <div className="relative w-full h-64 md:w-1/2 md:order-2" data-aos="zoom-in">
        <Image
          src="/images/cavitacion-2.jpg" // Reemplaza con la ruta correcta
          alt="Nuestra forma de trabajo"
          fill
          className="object-cover rounded-lg"
        />
      </div>
      <div className="md:w-1/2 md:order-1 mt-8 md:mt-0" data-aos="zoom-in">
        <h2 className="text-3xl font-bold mb-4">Nuestra forma de trabajo</h2>
        <p className="text-md mb-4 pr-4">
          En NS Estética, nos enfocamos en brindar un ambiente cómodo y relajante para todos nuestros clientes. Ofrecemos un servicio personalizado para asegurar que cada experiencia sea única y satisfactoria. Estamos comprometidos con la excelencia y con realzar tu belleza natural.
        </p>
        <ul className="list-none p-0 m-0">
          <li className="flex items-center mb-2">
            <FaCheckCircle className="mr-2 text-green-500" size={15} />
            SERVICIO PERSONALIZADO
          </li>
          <li className="flex items-center mb-2">
            <FaCheckCircle className="mr-2 text-green-500" size={15} />
            PROFESIONALES CALIFICADOS
          </li>
          <li className="flex items-center mb-2">
            <FaCheckCircle className="mr-2 text-green-500" size={15} />
            AMBIENTE RELAJANTE
          </li>        
        </ul>
      </div>
    </div>

    {/* Sección Negra */}
    <div className="bg-gray-900 dark:bg-gray-700 text-white dark:text-gray-300 p-8 flex flex-col items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div data-aos="zoom-in">
          <h3 className="text-xl font-bold mb-2 flex items-center">
            <FaMapMarkerAlt className="mr-2" /> DIRECCIÓN
          </h3>
          <p className="hover:text-gray-400 transition-colors duration-200">Av. wilde 12</p>
          <p className="hover:text-gray-400 transition-colors duration-200">Resistencia, Chaco, Argentina</p>
        </div>
        <div data-aos="zoom-in">
          <h3 className="text-xl font-bold mb-2 flex items-center">
            <FaPhoneAlt className="mr-2" /> CONTACTO
          </h3>
          <p className="hover:text-gray-400 transition-colors duration-200"><a href="tel:03624445566">3624-654117</a></p>
          <p className="hover:text-gray-400 transition-colors duration-200"><a href="mailto:contacto@nsestetica.com">contacto@nsestetica.com</a></p>
        </div>
        <div data-aos="zoom-in">
          <h3 className="text-xl font-bold mb-2 flex items-center">
            <FaClock className="mr-2" /> HORARIOS
          </h3>
          <p className="hover:text-gray-400 transition-colors duration-200">Lunes a viernes de 9:00 a 19:00 hs.</p>
          <p className="hover:text-gray-400 transition-colors duration-200">Sábados de 9:00 a 13:00 hs.</p>
        </div>
        <div data-aos="zoom-in">
          <h3 className="text-xl font-bold mb-2 flex items-center">
            <TbUrgent  className="mr-2" /> URGENCIAS
          </h3>
          <p className="hover:text-gray-400 transition-colors duration-200">Medios de comunicación disponibles para consultas urgentes.</p>
        </div>
      </div>
    </div>
  </section>
);

export default WorkInfo;