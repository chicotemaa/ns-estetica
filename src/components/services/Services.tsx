import ServiceCard from './ServiceCard';

const Services = () => (
  <>   
    <section id="services" className="min-h-screen p-8 bg-gray-200 dark:bg-gray-800 text-black dark:text-white flex flex-col justify-center">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-left" data-aos="fade-up">Servicios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <ServiceCard 
            data-aos="fade-left"
            title="Masajes Descontracturantes"
            imageSrc="/images/masajes.jpg"
            description="Alivia tensiones y contracturas musculares con nuestros masajes descontracturantes. Relájate y siente el bienestar en todo tu cuerpo."
            additionalInfo={[
              'Masajes personalizados según tus necesidades',
              'Duración de 30, 60 o 90 minutos',
              'Uso de aceites esenciales para mayor relajación'
            ]}
            link="#"
          />
          <ServiceCard 
            title="Tratamientos Faciales"
            imageSrc="/images/faciales.jpg"
            description="Mejora el aspecto y salud de tu piel con nuestros tratamientos faciales. Ideales para rejuvenecer y revitalizar tu rostro."
            additionalInfo={[
              'Limpieza facial profunda',
              'Tratamiento hidratante y rejuvenecedor',
              'Personalizados según tu tipo de piel'
            ]}
            link="#"
          />
          <ServiceCard             
            title="Manicura"
            imageSrc="/images/manicura.jpg"
            description="Cuida y embellece tus manos con nuestro servicio de manicura. Incluye limpieza, limado, esmaltado y tratamiento hidratante."
            additionalInfo={[
              'Manicura tradicional y semipermanente',
              'Decoración personalizada de uñas',
              'Tratamiento para el fortalecimiento de uñas'
            ]}
            link="#"
          />
        </div>
      </div>
    </section>
  </>
);

export default Services;