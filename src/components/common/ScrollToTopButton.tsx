import { useState, useEffect } from 'react';
import { FaArrowUp } from 'react-icons/fa';

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className="fixed bottom-24 right-6 z-50">
    {isVisible && (
      <button
        onClick={scrollToTop}
        className="p-3 rounded-full bg-blue-600 dark:bg-blue-400 text-white dark:text-white shadow-md hover:bg-blue-500 dark:hover:bg-blue-300 transition duration-300"
      >
        <FaArrowUp size={20} />
      </button>
    )}
  </div>
  );
};

export default ScrollToTopButton;
