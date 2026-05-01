import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Cargar credenciales
const serviceAccount = JSON.parse(fs.readFileSync('./studio.json', 'utf8'));

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

const db = getFirestore();

const defaultPermissions = {
  calendario: { ver: true, crear: true, editar: true, cancelar: true, eliminar: false, importar: false, exportar: false },
  clientes: { ver: true, crear: true, editar: true, eliminar: false, importar: false, exportar: false },
  inventario: { ver: true, crear: false, editar: false, eliminar: false, abrir_terminar: true, estadisticas: false, configuracion: false, entregas_ver: true, entregas_crear: false },
  servicios: { ver: true, crear: false, editar: false, eliminar: false, importar: false, exportar: false },
  usuarios: { ver: false, crear: false, editar: false, desactivar: false, ver_actividad: false },
  bitacora: { ver: false, foto_login: true },
  reportes: { ver: false },
  finanzas: { ver: false, exportar: false },
  crm: { ver: false, chat: false, embudos: false, campanas: false, contactos: false, reportes: false, configuracion: false },
  facturacion: { ver: false, crear: false, editar: false, eliminar: false },
};

const adminPermissions = {
  calendario: { ver: true, crear: true, editar: true, cancelar: true, eliminar: true, importar: true, exportar: true },
  clientes: { ver: true, crear: true, editar: true, eliminar: true, importar: true, exportar: true },
  inventario: { ver: true, crear: true, editar: true, eliminar: true, abrir_terminar: true, estadisticas: true, configuracion: true, entregas_ver: true, entregas_crear: true },
  servicios: { ver: true, crear: true, editar: true, eliminar: true, importar: true, exportar: true },
  usuarios: { ver: true, crear: true, editar: true, desactivar: true, ver_actividad: true },
  bitacora: { ver: true, foto_login: true },
  reportes: { ver: true },
  finanzas: { ver: true, exportar: true },
  crm: { ver: true, chat: true, embudos: true, campanas: true, contactos: true, reportes: true, configuracion: true },
  facturacion: { ver: true, crear: true, editar: true, eliminar: true },
};

const sucursalPermissions = { 
    ...defaultPermissions, 
    bitacora: { ver: true, foto_login: true }, 
    reportes: { ver: true }, 
    finanzas: { ver: true, exportar: false },
    crm: { ver: true, chat: true, embudos: true, campanas: false, contactos: true, reportes: true, configuracion: false },
    facturacion: { ver: true, crear: true, editar: false, eliminar: false }
};

async function migrateUsers() {
    console.log("Migrando permisos de usuarios...");
    const usersSnap = await db.collection('users').get();
    
    let updated = 0;
    for (const doc of usersSnap.docs) {
        const data = doc.data();
        let newPerms = data.permissions || {};
        const role = data.role;
        
        let targetPerms;
        if (role === 'administrador') {
            targetPerms = adminPermissions;
        } else if (role === 'administrador_sucursal') {
            targetPerms = sucursalPermissions;
        } else {
            targetPerms = defaultPermissions;
        }
        
        let needsUpdate = false;
        
        // Merge missing keys
        for (const [key, value] of Object.entries(targetPerms)) {
            if (!newPerms[key]) {
                newPerms[key] = value;
                needsUpdate = true;
            } else {
                // Check inner keys
                for (const [innerKey, innerValue] of Object.entries(value)) {
                    if (newPerms[key][innerKey] === undefined) {
                        newPerms[key][innerKey] = innerValue;
                        needsUpdate = true;
                    }
                }
            }
        }
        
        if (needsUpdate || !data.permissions) {
            await doc.ref.update({ permissions: newPerms });
            console.log(`Usuario actualizado: ${data.name} (${role})`);
            updated++;
        }
    }
    console.log(`Migración completada. ${updated} usuarios actualizados.`);
}

migrateUsers().catch(console.error);
