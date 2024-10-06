import { db } from "@/lib/firebaseConfig";
import { getDoc, doc } from "firebase/firestore";

export const checkFirestoreConnection = async () => {
  try {
    // Intentar obtener un documento de prueba
    const docRef = doc(db, "testCollection", "testDocument");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Conexión exitosa con Firestore!");
      return true;
    } else {
      console.log("No se encontró el documento de prueba.");
      return false;
    }
  } catch (error) {
    console.error("Error al conectar con Firestore: ", error);
    return false;
  }
};
