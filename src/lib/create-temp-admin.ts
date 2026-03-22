import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase'; // Asegúrate que la ruta a tu configuración de firebase sea correcta

const users = [
    { name: 'Martin', role: 'administrador', password: '12345*', employeeId: '1001', branch: 'Matriz' },
    { name: 'Estefy', role: 'administrador', password: '12345*', employeeId: '1002', branch: 'Matriz' },
    { name: 'Celine', role: 'administrador_sucursal', password: '12345*', employeeId: '2001', branch: 'Valle' },
    { name: 'Veronica', role: 'administrador_sucursal', password: '12345*', employeeId: '2002', branch: 'Valle' },
    { name: 'Erika', role: 'operaria', password: '12345*', employeeId: '3001', branch: 'Matriz' },
    { name: 'Anahi', role: 'operaria', password: '12345*', employeeId: '3002', branch: 'Valle' },
    { name: 'Paulina', role: 'operaria', password: '12345*', employeeId: '3003', branch: 'Matriz' },
    { name: 'Diana', role: 'operaria', password: '12345*', employeeId: '3004', branch: 'Valle' },
];

export const createInitialUsers = async () => {
  const usersCollection = collection(db, 'users');

  for (const user of users) {
    const email = `${user.name.toLowerCase()}@example.com`;
    const username = user.name.toLowerCase();
    
    const q = query(usersCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      try {
        await addDoc(usersCollection, {
          name: user.name,
          username: username,
          email: email,
          role: user.role,
          password: user.password,
          employeeId: user.employeeId,
          branch: user.branch,
        });
        console.log(`Usuario ${user.name} creado.`);
      } catch (e) {
        console.error(`Error al crear el usuario ${user.name}: `, e);
      }
    } else {
      console.log(`Usuario ${user.name} ya existe.`);
    }
  }
};
