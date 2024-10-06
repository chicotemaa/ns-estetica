import { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/swiper-bundle.css';
import SwiperCore from 'swiper';
import Image from 'next/image';
import Link from 'next/link';

const images = [
  '/images/tele1.jpg', 
  '/images/tele2.jpg', 
  '/images/tele4.jpg', 
];

const Telegramas = () => {
  const [swiperInstance, setSwiperInstance] = useState<SwiperCore | null>(null);

  useEffect(() => {
    if (swiperInstance) {
      const interval = setInterval(() => {
        if (swiperInstance.activeIndex === images.length - 1) {
          swiperInstance.slideTo(0);
        } else {
          swiperInstance.slideNext();
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [swiperInstance]);

  return (
    <section id="telegramas" className="min-h-screen p-8 bg-white dark:bg-gray-800 flex flex-col lg:flex-row items-center">
      <div className="relative w-full h-64 md:h-96 lg:w-1/2 mb-8 md:mb-0">
        <Swiper
          spaceBetween={30}
          centeredSlides={true}
          loop={true}
          onSwiper={setSwiperInstance}
        >
          {images.map((src, index) => (
            <SwiperSlide key={index}>
              <div className="relative w-full h-64 md:h-96">
                <Image
                  src={src}
                  alt={`Descripción de la imagen ${index + 1}`}
                  layout="fill"
                  objectFit="cover"
                  objectPosition="top"
                  className="rounded-lg"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="w-full lg:w-1/2 lg:pl-8 mt-4 lg:mt-0 px-4 md:px-0">
        <h2 className="text-3xl font-bold mb-4 text-black dark:text-white">¿Te llegó una carta documento o un telegrama laboral?</h2>
        <p className="text-lg text-gray-800 dark:text-gray-300 mb-4">
          Si contiene intimación o plazo para contestarla, ese plazo comenzó a correr desde que la recibiste. El tiempo corre y es crucial actuar rápido.
        </p>
        <p className="text-lg text-gray-800 dark:text-gray-300 mb-4">
          ¡Contacta con nosotros ahora y asegúrate de proteger tus derechos con una respuesta adecuada!
        </p>
        <div className="flex flex-col items-center space-y-4 mt-4 mb-20">
          <Link href="#contact" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 transition-all duration-300 ease-in-out transform hover:scale-105">
            Telegrama Laboral
          </Link>
          <Link href="#contact" className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 transition-all duration-300 ease-in-out transform hover:scale-105">
            Carta Documento
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Telegramas;
