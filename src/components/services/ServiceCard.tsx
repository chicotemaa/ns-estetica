import { useState, FC } from 'react';
import Image from 'next/image';
import { FaCheckCircle } from 'react-icons/fa';

interface ServiceCardProps {
  title: string;
  imageSrc: string;
  description: string;
  additionalInfo: string[];
  link: string;
}

const ServiceCard: FC<ServiceCardProps> = ({ title, imageSrc, description, additionalInfo, link }) => {
  const [showMore, setShowMore] = useState(false);

  const toggleShowMore = () => {
    setShowMore(!showMore);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden relative" data-aos="fade-up">
      <div className="relative w-full h-48">
        <Image 
          src={imageSrc} 
          alt={title} 
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4 pb-16"> {/* Espacio adicional para el botón */}
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{title}</h3>
        <p className="text-md text-gray-600 dark:text-gray-300">{description}</p>
        {showMore && (
          <div className="mt-4 text-gray-600 dark:text-gray-300">
            {additionalInfo.map((info, index) => (
              <p key={index} className="mb-2 text-sm flex items-center">
                <FaCheckCircle className="mr-2 text-blue-500" size={15} /> {info}
              </p>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={toggleShowMore}
        className="absolute bottom-4 left-4 text-blue-500 hover:underline"
      >
        {showMore ? 'Ver menos' : 'Ver más'}
      </button>
    </div>
  );
};

export default ServiceCard;
