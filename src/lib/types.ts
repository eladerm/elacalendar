export type Event = {
  id: string;
  tempId?: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  clientId?: string;
  clientName: string;
  clientName_lowercase?: string;
  color: string;
  branch: 'Matriz' | 'Valle';
  createdBy?: {
    uid: string;
    name: string;
    initials: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
  status: 'confirmed' | 'cancelled';
  amountPaid: number;
  sessionNumber: number;
  reminderSent: boolean;
  serviceIds: string[];
  serviceNames: string[];
  lateMinutes: number;
  notifiedUsers: string[];
  colorModified?: boolean;
  isImported?: boolean;
  appointmentType?: 'nueva' | 'mantenimiento';
};

export type Client = {
  id: string;
  name: string;
  lastName: string;
  idNumber?: string;
  email?: string;
  branch?: 'ELAPIEL MATRIZ' | 'ELAPIEL SAN RAFAEL' | '';
  phone?: string;
  birthDate?: Date;
  gender?: string;
  address?: string;
  registrationDate?: Date;
  treatmentType?: string;
  totalPaid?: number;
  totalSessions?: number;
  totalLateArrivals?: number;
  totalMinutesLate?: number;
};

export type Service = {
  id: string;
  code: string;
  name: string;
  duration: number;
  type: string;
};

export type Product = {
  id: string;
  name: string;
  brand?: string;
  code?: string;
  category: string;
  sealedCount: number;
  inUseCount: number;
  finishedCount: number;
  issueCount?: number;
  minStock: number;
  unit: string;
  packageSize?: string;
  observations?: string;
  branch: 'Matriz' | 'Valle';
  location: 'BODEGA' | 'ESTABLECIMIENTO';
  type: 'TECNICO' | 'GENERAL';
  lastUpdated?: any;
  unitPrice?: number;
  subtotal?: number;
  totalWithIva?: number;
  commercialName?: string;
  distributorPhone?: string;
  secondaryPhone?: string;
  supplierAddress?: string;
  website?: string;
  imageUrl?: string;
};

export type Delivery = {
  id: string;
  date: Date;
  giverId: string;
  giverName: string;
  receiverId: string;
  receiverName: string;
  productId: string;
  productName: string;
  quantity: number;
  branch: 'Matriz' | 'Valle';
  notes?: string;
};

export type ModulePermissions = {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  importar?: boolean;
  exportar?: boolean;
  otros?: Record<string, boolean>;
};

export type UserPermissions = {
  calendario: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    cancelar: boolean;
    eliminar: boolean;
    importar: boolean;
    exportar: boolean;
  };
  clientes: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    importar: boolean;
    exportar: boolean;
  };
  inventario: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    abrir_terminar: boolean;
    estadisticas: boolean;
    configuracion: boolean;
    entregas_ver: boolean;
    entregas_crear: boolean;
  };
  servicios: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    importar: boolean;
    exportar: boolean;
  };
  usuarios: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    desactivar: boolean;
    ver_actividad: boolean;
  };
  bitacora: {
    ver: boolean;
    foto_login: boolean;
  };
  reportes: {
    ver: boolean;
  };
  finanzas: {
    ver: boolean;
    exportar: boolean;
  };
};

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  employeeId: string;
  role: 'administrador' | 'administrador_sucursal' | 'operaria';
  password?: string;
  branch?: 'Matriz' | 'Valle';
  photoUrl?: string;
  status?: 'active' | 'inactive';
  permissions?: UserPermissions;
};

export type ActivityLog = {
    id: string;
    userId: string;
    userName: string;
    action: string;
    timestamp: Date;
    eventId?: string;
    clientId?: string;
    productId?: string;
    deliveryId?: string;
    loginPhoto?: string;
}
