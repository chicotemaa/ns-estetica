import { useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import Image from 'next/image';

const WhatsAppButton = () => {
  const [showChat, setShowChat] = useState(false);

  const handleButtonClick = () => {
    setShowChat(!showChat);
  };

  const handleCloseChat = () => {
    setShowChat(false);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleButtonClick}
          className="bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-transform transform hover:scale-110"
          aria-label="Contact us on WhatsApp"
        >
          <FaWhatsapp size={35} />
        </button>
      </div>

      {showChat && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg z-50 md:right-4 md:w-96 w-[90%] ">
          <div className="bg-[#25D366] text-white rounded-t-lg p-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Image src="/images/LOGO-1.png" alt="Profile" width={32} height={32} className="rounded-full" />
              <div className="flex flex-col">
                <span className="text-sm font-bold"> Natalia Sanches</span>
                <span className="text-xs text-gray-200">online</span>
              </div>
            </div>
            <button onClick={handleCloseChat} className="text-white bg-black bg-opacity-40 hover:bg-opacity-65 rounded-full p-1">
              <AiOutlineClose size={15} />
            </button>
          </div>
          <div className="p-4">
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <p className="text-gray-800 text-sm">Hola 👋 <br /> ¿En qué puedo ayudarte?</p>
            </div>
            <a
              href="https://wa.me/+5403624594954"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] text-white p-3 rounded-lg flex items-center justify-center hover:bg-green-600 transition-colors text-sm"
            >
              Abrir chat <FaTelegramPlane className="ml-2" />
            </a>
          </div>
        </div>
      )}
    </>
  );
};

export default WhatsAppButton;
