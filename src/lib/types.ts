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
  crm: {
    ver: boolean;
    chat: boolean;
    embudos: boolean;
    campanas: boolean;
    contactos: boolean;
    reportes: boolean;
    configuracion: boolean;
  };
  facturacion: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
  };
};

export type ChatMessage = {
  id: string;
  chatId: string;
  from: string;
  to: string;
  body: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio' | 'location' | 'template';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  mediaUrl?: string;
  caption?: string;
  isIncoming: boolean;
  waId?: string; // WhatsApp Message ID
};

export type ChatThread = {
  id: string;
  waId: string; // WhatsApp ID (phone number) or other channel ID
  name: string;
  countryCode?: string; // e.g. "EC", "MX"
  lastMessage?: string;
  lastTimestamp?: Date;
  status: 'open' | 'pending' | 'closed';
  unreadCount: number;
  assignedTo?: string; // User ID
  photoUrl?: string;
  funnelStage?: 'leads' | 'contacted' | 'quoted' | 'closed';
  channel?: 'whatsapp' | 'instagram' | 'facebook';
};

export type CRMContact = {
  id: string;
  waId: string;
  name: string;
  tags: string[];
  notes?: string;
  funnelId?: string;
  stageId?: string;
  lastInteraction?: Date;
  email?: string;
};

export type CRMStage = {
  id: string;
  name: string;
  color: string;
  order: number;
};

export type UserDocument = {
  id: string;
  userId: string;
  category: 'certificate' | 'invoice' | 'other';
  title: string;
  url: string; // Base64 or true URL
  fileType: string;
  size?: number;
  uploadedAt: Date;
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
  resume?: {
    address?: string;
    phone?: string;
    birthDate?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    hireDate?: string;
    bloodType?: string;
    allergies?: string;
    observations?: string;
  };
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
    loginPhoto?: string;
}

// CRM Chatbot Typings
export type FlowNodeData = {
    label: string;
    text?: string;
    mediaUrl?: string;
    options?: string[];
    [key: string]: any;
};

export type ChatbotConfig = {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    aiFallback: boolean; // Enable ChatGPT/Genkit integration
    triggerKeywords: string[];
    assignedWaId?: string; // WhatsApp line to use
    nodes?: any[]; // React Flow nodes
    edges?: any[]; // React Flow edges
    createdAt?: Date;
    updatedAt?: Date;
};

// IA Assistant Training Typings
export type TrainingSource = {
    id: string;
    type: 'file' | 'text' | 'url';
    content: string; // URL, pure text, or gs:// path
    size?: number; // File size in bytes
    name?: string; // Filename or website title
    status: 'syncing' | 'ready' | 'error';
    updatedAt: Date;
};

export type AIAssistantConfig = {
    id: string;
    name: string;
    active: boolean;
    model: 'gpt-4o' | 'gpt-4o-mini' | 'gemini-1.5-pro' | 'gemini-1.5-flash';
    systemPrompt: string;
    temperature: number;
    maxTokens?: number;
    assignedWaId?: string; // Specific WhatsApp line
    sources: TrainingSource[];
    // Kommo-style training fields
    tone?: 'amistoso' | 'profesional' | 'casual' | 'persuasivo' | 'empatico';
    responseLength?: 'corta' | 'media' | 'larga';
    language?: 'es' | 'en' | 'pt';
    responseDelay?: number; // seconds to wait before responding
    guidelines?: string[]; // individual rule strings (Pautas)
    createdAt?: Date;
    updatedAt?: Date;
};

// WhatsApp Channel Typings (Meta Cloud API)
export type WhatsAppChannelType = 'migrated' | 'new_cloud';

export type WhatsAppChannel = {
    id: string; // The physical phone number id
    name: string; // Business name linked to line
    phoneNumber: string;
    type: WhatsAppChannelType;
    healthScore: 'GREEN' | 'YELLOW' | 'RED';
    qualityRating: string;
    messagingLimit: string; // "250", "1K", "10K", "UNLIMITED"
    status: 'CONNECTED' | 'DISCONNECTED' | 'PENDING';
    verified: boolean;
    createdAt?: Date;
    updatedAt?: Date;
};
