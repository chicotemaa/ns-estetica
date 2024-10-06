import { useEffect, useState } from 'react';
import Image from 'next/image';

const images = [
  '/images/LOGO-1.png', 
];

const About = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="about" className="min-h-screen p-8 bg-white dark:bg-gray-800 flex flex-col lg:flex-row items-center">
      <div className="relative w-full h-64 md:h-96 lg:w-1/2">
        {images.map((src, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${currentImageIndex === index ? 'opacity-100' : 'opacity-0'}`}
            data-aos="fade-up"
         >
            <Image
              src={src}
              alt={`Descripción de la imagen ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{ objectFit: 'cover', objectPosition: 'top 10%' }} 
              className="rounded-lg"
            />
          </div>
        ))}
      </div>
      <div className="w-full lg:w-1/2 lg:pl-8 mt-8 lg:mt-0" data-aos="fade-up">
        <h2 className="text-3xl font-bold mb-4 text-black dark:text-white">Sobre mi</h2>
        <p className="text-lg text-gray-800 dark:text-gray-300 mb-4">
          Bienvenidos a Natalia Sanchez Estética, donde nos especializamos en ofrecer tratamientos personalizados para el cuidado de tu piel y bienestar general.
        </p>
        <p className="text-lg text-gray-800 dark:text-gray-300">
          Nuestro compromiso es brindarte una experiencia única que resalte tu belleza natural. Contamos con un equipo profesional dedicado a ofrecer los mejores tratamientos estéticos, desde limpieza facial hasta tratamientos avanzados para mejorar tu piel y tu bienestar. En Natalia Sanchez Estética, tu satisfacción es nuestra prioridad.
        </p>
      </div>
    </section>
  );
};

export default About;