import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px' // Cambia el tamaño según tus necesidades
};

const center = {
  lat: -27.4471835, // Reemplaza con la latitud obtenida
  lng: -58.9906808  // Reemplaza con la longitud obtenida
};

const GoogleMapComponent = () => {
  const [isMapVisible, setIsMapVisible] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyCJr2mzH3PgnD5dQK9ATi54AXBdr5TU5aU"
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    setMap(map);

    // Verifica si AdvancedMarkerElement está disponible y agrega el marcador
    if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
      new google.maps.marker.AdvancedMarkerElement({
        map: map,
        position: center,
        title: "Hello World!"
      });
    } else {
      new google.maps.Marker({
        map: map,
        position: center,
        title: "Hello World!"
      });
    }
  }, []);

  const onUnmount = React.useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setIsMapVisible(true);
          observer.disconnect();
        }
      });
    });

    if (mapRef.current) {
      observer.observe(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        observer.unobserve(mapRef.current);
      }
    };
  }, []);

  return (
    <div ref={mapRef} style={containerStyle}>
      {isLoaded && isMapVisible && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={15}    
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          { /* Child components, such as markers, info windows, etc. */ }
          <></>
        </GoogleMap>
      )}
    </div>
  );
}

export default React.memo(GoogleMapComponent);
