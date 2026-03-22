
import type { User } from '@/lib/types';

export const localUsers: Omit<User, 'id'>[] = [
    { name: 'MARTIN', role: 'administrador', password: '12345*', employeeId: '1001', username: 'martin', email: 'martin@example.com', branch: 'Matriz' },
    { name: 'ESTEFY', role: 'administrador', password: '12345*', employeeId: '1002', username: 'estefy', email: 'estefy@example.com', branch: 'Matriz' },
    { name: 'CELINE', role: 'administrador_sucursal', password: '12345*', employeeId: '2001', username: 'celine', email: 'celine@example.com', branch: 'Valle' },
    { name: 'VERONICA', role: 'administrador_sucursal', password: '12345*', employeeId: '2002', username: 'veronica', email: 'veronica@example.com', branch: 'Valle' },
    { name: 'ERIKA', role: 'operaria', password: '12345*', employeeId: '3001', username: 'erika', email: 'erika@example.com', branch: 'Matriz' },
    { name: 'ANAHI', role: 'operaria', password: '12345*', employeeId: '3002', username: 'anahi', email: 'anahi@example.com', branch: 'Valle' },
    { name: 'PAULINA', role: 'operaria', password: '12345*', employeeId: '3003', username: 'paulina', email: 'paulina@example.com', branch: 'Matriz' },
    { name: 'DIANA', role: 'operaria', password: '12345*', employeeId: '3004', username: 'diana', email: 'diana@example.com', branch: 'Valle' },
    { name: 'JOSETH', role: 'operaria', password: '12345*', employeeId: '3005', username: 'joseth', email: 'joseth@example.com', branch: 'Matriz' },
];
