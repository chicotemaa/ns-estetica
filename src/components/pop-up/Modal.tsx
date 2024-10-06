import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';
import Image from 'next/image';
import { IoIosCloseCircleOutline } from 'react-icons/io';
import { IoArrowForwardCircle } from 'react-icons/io5';

const CustomModal = () => {
  const [modalIsOpen, setModalIsOpen] = useState(true);

  useEffect(() => {
    Modal.setAppElement('body');
  }, []);

  const closeModal = () => {
    setModalIsOpen(false);
  };

  const handleContactClick = () => {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
      setModalIsOpen(false);
    }
  };

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={closeModal}
      contentLabel="Promotional Modal"
      className="flex items-center justify-center h-screen"
      overlayClassName="fixed inset-0 bg-black bg-opacity-50 z-50"
    >
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
        <button onClick={closeModal} className="absolute top-2 right-2 text-black z-50">
          <span className="text-2xl text-white cursor-pointer">
            <IoIosCloseCircleOutline className="mr-2 mt-2 text-white hover:scale-110 transition-transform duration-300" size={20} />
          </span>
        </button>
        <div className="relative w-full h-96">
          <Image
            src="/images/penal.webp" // Ruta de la imagen cargada
            alt="Promotional Image"
            fill
            objectFit="cover"
            objectPosition="center"
            className="rounded-lg"
          />
          <div className="absolute inset-0 flex flex-col justify-center p-8 bg-black bg-opacity-50">
            <h1 className="text-3xl md:text-4xl lg:text-4xl text-white font-bold mb-0">DERECHO DE FAMILIA</h1>
            <h1 className="text-3xl md:text-4xl lg:text-4xl text-white font-bold mb-4">LABORAL, CIVIL Y PENAL</h1>
            <span className="text-2xl md:text-2xl lg:text-2xl text-white font-light mb-4 flex">
              <IoArrowForwardCircle className="mr-2 mt-2 text-yellow-500 hover:scale-110 transition-transform duration-300" size={20} />
              Asesoramiento las 24hs.
            </span>
            <button
              onClick={handleContactClick}
              className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 w-fit transition duration-300"
            >
              Contáctanos
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CustomModal;
