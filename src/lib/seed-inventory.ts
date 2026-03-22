import { db } from './firebase';
import { collection, writeBatch, doc, Timestamp, getDocs, query, where } from 'firebase/firestore';

export const OFFICIAL_CATALOG_NAMES = [
  "HOJAS DE PAPEL BOND",
  "MASCARILLAS DESECHABLES ROSADAS",
  "CAMBRELAS ROSADAS",
  "CAMBRELAS MORADAS",
  "CAMBRELAS SÁBANAS AZULES",
  "CREMA CORPORAL",
  "COTONETES",
  "ESPARADRAPOS GRUESO",
  "ESPARADRAPOS DELGADOS",
  "FUNDAS DE BASURA GRANDE",
  "FUNDAS DE BAÑO",
  "DISCOS DE ALGODÓN",
  "PAÑITOS HUMEDOS",
  "GORROS DESECHABLES ROSA",
  "GORROS DESECHABLES AZUL",
  "GUANTES XS",
  "JABON LIQUIDO ALMENDRAS",
  "JABON LIQUIDO BRISA MARINA",
  "JABON LIQUIDO FRUTOS ROJOS",
  "AGUA DESTILADA",
  "ALCOHOL",
  "PAPEL HIGIENICO",
  "PAPEL DEPILACIÓN",
  "TOALLAS DESECHABLES EN Z",
  "RASURADORAS",
  "PAÑO MICROFIBRA",
  "SABLÓN",
  "BAJA LENGUAS",
  "GEL CONDUCTOR",
  "ALGODON TORUNDAS",
  "ACEITE PARA BEBE",
  "TRAPEADOR AMARILLO",
  "AGUA OXIGENADA",
  "LAPIZ BLANCO PARA MARCACIÓN",
  "APOSITO OCULAR",
  "CLORO",
  "TIPS AMBIENTADOR MANZANA"
];

export const seedInventoryFromTables = async (currentUserId: string, currentUserName: string) => {
  const batch = writeBatch(db);
  
  const matrizProducts = [
    { name: "HOJAS DE PAPEL BOND", brand: "EMERAL", category: "PAPELERÍA Y OFICINA", sealedCount: 2, inUseCount: 1, minStock: 1, unit: "RESMAS", packageSize: "500 U" },
    { name: "MASCARILLAS DESECHABLES ROSADAS", brand: "DHISVE", category: "INSUMOS DESECHABLES", sealedCount: 5, inUseCount: 1, minStock: 2, unit: "CAJAS", packageSize: "50 U" },
    { name: "CAMBRELAS ROSADAS", brand: "BURZANTEX", category: "INSUMOS DESECHABLES", sealedCount: 10, inUseCount: 2, minStock: 5, unit: "PAQUETES", packageSize: "10 UNID" },
    { name: "CAMBRELAS MORADAS", brand: "BURZANTEX", category: "INSUMOS DESECHABLES", sealedCount: 8, inUseCount: 1, minStock: 5, unit: "PAQUETES", packageSize: "10 UNID" },
    { name: "CAMBRELAS SÁBANAS AZULES", brand: "MEDICALES", category: "INSUMOS DESECHABLES", sealedCount: 4, inUseCount: 2, minStock: 3, unit: "UNIDADES", packageSize: "10 UNIDADES" },
    { name: "CREMA CORPORAL", brand: "DOVE", category: "HUMECTACIÓN Y CREMAS", sealedCount: 3, inUseCount: 2, minStock: 2, unit: "FRASCOS", packageSize: "1 LITRO" },
    { name: "CREMA CORPORAL", brand: "NIVEA", category: "HUMECTACIÓN Y CREMAS", sealedCount: 5, inUseCount: 1, minStock: 2, unit: "FRASCO", packageSize: "1.000ML" },
    { name: "COTONETES", brand: "NATIVA", category: "HIGIENE Y ASEO", sealedCount: 10, inUseCount: 3, minStock: 5, unit: "CAJAS", packageSize: "500 UNIDADES" },
    { name: "ESPARADRAPOS GRUESO", brand: "GENÉRICO", category: "INSUMOS DESECHABLES", sealedCount: 12, inUseCount: 4, minStock: 5, unit: "UNIDAD", packageSize: "-" },
    { name: "ESPARADRAPOS DELGADOS", brand: "ANDINO", category: "INSUMOS DESECHABLES", sealedCount: 15, inUseCount: 5, minStock: 5, unit: "CAJA", packageSize: "3 ROLLOS" },
    { name: "FUNDAS DE BASURA GRANDE", brand: "ESTRELLA", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 20, inUseCount: 2, minStock: 10, unit: "PAQUETES", packageSize: "10 UNID X FUNDA" },
    { name: "FUNDAS DE BAÑO", brand: "AKI", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 15, inUseCount: 3, minStock: 5, unit: "PAQUETES", packageSize: "10 UNIDADES" },
    { name: "FUNDAS DE BAÑO", brand: "FLEXIPLAST", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 12, inUseCount: 2, minStock: 5, unit: "PAQUETES", packageSize: "10 UNIDADES" },
    { name: "DISCOS DE ALGODÓN", brand: "SANA", category: "HIGIENE Y ASEO", sealedCount: 25, inUseCount: 5, minStock: 10, unit: "PAQUETES", packageSize: "50 UNIDADES" },
    { name: "PAÑITOS HUMEDOS", brand: "WOOF WOOF PERRO", category: "HIGIENE Y ASEO", sealedCount: 30, inUseCount: 8, minStock: 15, unit: "PAQUETES", packageSize: "120 UNIDADES" },
    { name: "GORROS DESECHABLES ROSA", brand: "GENÉRICO", category: "INSUMOS DESECHABLES", sealedCount: 10, inUseCount: 2, minStock: 5, unit: "PAQUETES", packageSize: "100 UNIDADES" },
    { name: "GORROS DESECHABLES AZUL", brand: "GENÉRICO", category: "INSUMOS DESECHABLES", sealedCount: 8, inUseCount: 3, minStock: 5, unit: "PAQUETES", packageSize: "100 UNIDADES" },
    { name: "GUANTES XS", brand: "DISHVE", category: "INSUMOS DESECHABLES", sealedCount: 20, inUseCount: 5, minStock: 10, unit: "CAJAS GRANDES", packageSize: "100 POR CAJITA" },
    { name: "JABON LIQUIDO ALMENDRAS", brand: "DR. CLEAN", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 10, inUseCount: 2, minStock: 4, unit: "GALÓN", packageSize: "3.785 ML" },
    { name: "JABON LIQUIDO BRISA MARINA", brand: "SIN MARCA", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 5, inUseCount: 1, minStock: 2, unit: "BOTELLA", packageSize: "1LT" },
    { name: "JABON LIQUIDO FRUTOS ROJOS", brand: "GENÉRICO", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 6, inUseCount: 1, minStock: 2, unit: "BOTELLA", packageSize: "1LT" },
    { name: "AGUA DESTILADA", brand: "INDUSTRIA ECUATORIANA", category: "ACCESORIOS Y OTROS", sealedCount: 12, inUseCount: 4, minStock: 6, unit: "GALONES", packageSize: "1 G" },
    { name: "ALCOHOL", brand: "PRIMS", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 15, inUseCount: 3, minStock: 5, unit: "GALONES", packageSize: "1 GALON" },
    { name: "PAPEL HIGIENICO", brand: "MININOA", category: "HIGIENE Y ASEO", sealedCount: 50, inUseCount: 10, minStock: 20, unit: "ROLLO", packageSize: "XXL 200" },
    { name: "PAPEL DEPILACIÓN", brand: "GENÉRICO", category: "INSUMOS DEPILACIÓN", sealedCount: 20, inUseCount: 5, minStock: 10, unit: "ROLLOS", packageSize: "-" },
    { name: "TOALLAS DESECHABLES EN Z", brand: "BOUQUET", category: "HIGIENE Y ASEO", sealedCount: 15, inUseCount: 4, minStock: 8, unit: "PAQUETES", packageSize: "150 UNIDADES" },
    { name: "RASURADORAS", brand: "MAXTOP", category: "INSUMOS DESECHABLES", sealedCount: 100, inUseCount: 20, minStock: 30, unit: "PAQUETES", packageSize: "5 UNIDADES" },
    { name: "PAÑO MICROFIBRA", brand: "VILEDA", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 10, inUseCount: 5, minStock: 5, unit: "UNIDAD", packageSize: "1 UNIDAD" },
    { name: "SABLÓN", brand: "GENÉRICO", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 5, inUseCount: 1, minStock: 2, unit: "GALONES", packageSize: "1 G" },
    { name: "BAJA LENGUAS", brand: "CARICIA", category: "INSUMOS DESECHABLES", sealedCount: 10, inUseCount: 2, minStock: 4, unit: "PAQUETE", packageSize: "500 UNIDADES" },
    { name: "GEL CONDUCTOR", brand: "BIANCO", category: "GELES FACIALES", sealedCount: 8, inUseCount: 3, minStock: 4, unit: "GALONES", packageSize: "3785 ML" },
    { name: "ALGODON TORUNDAS", brand: "SANA", category: "HIGIENE Y ASEO", sealedCount: 15, inUseCount: 5, minStock: 5, unit: "UNIDADES", packageSize: "500" },
    { name: "ACEITE PARA BEBE", brand: "JOHNSON'S", category: "HIGIENE Y ASEO", sealedCount: 10, inUseCount: 2, minStock: 4, unit: "BOTELLAS", packageSize: "300 ML" },
    { name: "TRAPEADOR AMARILLO", brand: "CLEANFUL", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 5, inUseCount: 2, minStock: 2, unit: "UNIDAD", packageSize: "1 U" },
    { name: "AGUA OXIGENADA", brand: "PARACELSO", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 10, inUseCount: 3, minStock: 4, unit: "BOTELLAS", packageSize: "500ML" },
    { name: "LAPIZ BLANCO PARA MARCACIÓN", brand: "USHAS", category: "ACCESORIOS Y OTROS", sealedCount: 20, inUseCount: 5, minStock: 5, unit: "UNIDADES", packageSize: "1 U" },
    { name: "LAPIZ BLANCO PARA MARCACIÓN", brand: "ESSENCE", category: "ACCESORIOS Y OTROS", sealedCount: 15, inUseCount: 3, minStock: 5, unit: "UNIDADES", packageSize: "1 U" },
    { name: "APOSITO OCULAR", brand: "BEGUT", category: "INSUMOS DESECHABLES", sealedCount: 10, inUseCount: 2, minStock: 4, unit: "CAJAS", packageSize: "20 U" },
    { name: "CLORO", brand: "CLOROX", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 12, inUseCount: 4, minStock: 6, unit: "BOTELLA", packageSize: "1800 ML" },
    { name: "TIPS AMBIENTADOR MANZANA", brand: "TIPS", category: "LIMPIEZA Y DESINFECCIÓN", sealedCount: 15, inUseCount: 3, minStock: 5, unit: "CAJAS", packageSize: "95 G" }
  ];

  // 1. Obtener el contador de códigos actual
  const settingsRef = doc(db, 'inventory_config', 'settings');
  const settingsSnap = await getDocs(query(collection(db, 'inventory_config')));
  let lastCodeNumber = 0;
  let currentNames: string[] = [];
  let currentBrands: string[] = [];
  
  if (!settingsSnap.empty) {
    const settingsData = settingsSnap.docs.find(d => d.id === 'settings')?.data();
    lastCodeNumber = settingsData?.lastCodeNumber || 0;
    currentNames = settingsData?.productNames || [];
    currentBrands = settingsData?.brands || [];
  }

  // 2. Procesar productos para Matriz
  for (const p of matrizProducts) {
    const prodRef = doc(collection(db, 'inventory'));
    lastCodeNumber++;
    const code = `ST-${lastCodeNumber.toString().padStart(4, '0')}`;

    batch.set(prodRef, {
      ...p,
      code,
      branch: 'Matriz',
      location: 'BODEGA',
      finishedCount: 0,
      lastUpdated: Timestamp.now()
    });
  }

  // 3. Procesar productos para Valle (primeros 10)
  for (const p of matrizProducts.slice(0, 10)) {
    const prodRef = doc(collection(db, 'inventory'));
    lastCodeNumber++;
    const code = `ST-${lastCodeNumber.toString().padStart(4, '0')}`;

    batch.set(prodRef, {
      ...p,
      code,
      branch: 'Valle',
      location: 'BODEGA',
      finishedCount: 0,
      lastUpdated: Timestamp.now()
    });
  }

  // 4. Actualizar el catálogo de nombres y marcas combinando con lo que ya existe
  const newNames = Array.from(new Set([...currentNames, ...OFFICIAL_CATALOG_NAMES, ...matrizProducts.map(p => p.name.toUpperCase())]));
  const newBrands = Array.from(new Set([...currentBrands, ...matrizProducts.map(p => p.brand.toUpperCase())]));

  batch.update(settingsRef, { 
    lastCodeNumber,
    productNames: newNames,
    brands: newBrands
  });

  // 5. Registrar la actividad masiva
  const logRef = doc(collection(db, 'activity_log'));
  batch.set(logRef, {
    userId: currentUserId,
    userName: currentUserName,
    action: `Cargó el catálogo completo de productos y actualizó la configuración global.`,
    timestamp: Timestamp.now()
  });

  await batch.commit();
};
