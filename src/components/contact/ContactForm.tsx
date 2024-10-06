import { useState } from 'react';
import GoogleMapComponent from './GoogleMapComponent ';
import Swal from 'sweetalert2';
import emailjs from 'emailjs-com';

interface FormValues {
  from_name: string;
  reply_to: string;
  message: string;
}

const ContactForm = () => {
  const [errors, setErrors] = useState<Partial<FormValues>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({
    from_name: '',
    reply_to: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });

    // Limpiar errores al cambiar el valor
    setErrors({
      ...errors,
      [name]: ''
    });
  };

  const validateForm = () => {
    let formErrors: Partial<FormValues> = {};
    if (!formValues.from_name) formErrors.from_name = 'El nombre es obligatorio';
    if (!formValues.reply_to) formErrors.reply_to = 'El correo electrónico es obligatorio';
    if (!formValues.message) formErrors.message = 'El mensaje es obligatorio';
    return formErrors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      emailjs.sendForm('service_lvilpoe', 'template_qh6nghr', event.target as HTMLFormElement, 'xSYdNx6M-wFz6YpKC')
        .then((result) => {
          setIsSubmitting(false);
          Swal.fire({
            title: '¡Gracias por ponerte en contacto!',
            html: 'Tu mensaje ha sido enviado con éxito en breve nos comunicaremos con vos.',
            confirmButtonColor: '#111827'
          });
          setFormValues({
            from_name: '',
            reply_to: '',
            message: ''
          });
        }, (error) => {
          setIsSubmitting(false);
          Swal.fire({
            title: 'Parece que hubo un Error',
            html: 'Hubo un problema al enviar el formulario. Por favor, inténtalo de nuevo.',
            confirmButtonColor: '#111827'
          });
        });
    } else {
      setErrors(formErrors);
    }
  };

  return (
    <section className="min-h-screen p-8 bg-gray-200 dark:bg-gray-800 text-black dark:text-white flex flex-col lg:flex-row items-center" id="contact">
      <div className="w-full h-64 lg:w-1/2 lg:h-full pr-0 lg:pr-8 mb-8 lg:mb-0">
        <GoogleMapComponent />
      </div>
      <div className="w-full lg:w-1/2 pl-0 lg:pl-8 pt-36 lg:pt-0">
        <h2 className="text-3xl font-bold mb-4">Contacto</h2>
        <p className="text-md text-gray-800 dark:text-gray-300">¡No dude en realizar su consulta! Estamos aquí para ayudarle y ofrecerle la mejor atención estética.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-lg text-gray-800 dark:text-white">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="from_name"
              className="w-full p-2 border rounded-lg text-gray-700"
              value={formValues.from_name}
              onChange={handleInputChange}
              required
            />
            {errors.from_name && <p className="text-red-500 text-sm">{errors.from_name}</p>}
          </div>
          <div>
            <label className="block text-lg text-gray-800 dark:text-white">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="reply_to"
              className="w-full p-2 border rounded-lg text-gray-700"
              value={formValues.reply_to}
              onChange={handleInputChange}
              required
            />
            {errors.reply_to && <p className="text-red-500 text-sm">{errors.reply_to}</p>}
          </div>
          <div>
            <label className="block text-lg text-gray-800 dark:text-white">
              Mensaje <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              className="w-full p-2 border rounded-lg text-gray-700"
              value={formValues.message}
              onChange={handleInputChange}
              required
            ></textarea>
            {errors.message && <p className="text-red-500 text-sm">{errors.message}</p>}
          </div>
          <button
            type="submit"
            className={`px-6 py-2 bg-gray-900 text-white rounded-lg ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-600'} focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50 transition-all duration-300 ease-in-out transform hover:scale-105`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;
