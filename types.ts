
export enum UserRole {
  DEVELOPER = 'Desenvolvedor',
  ADMIN = 'Administrador',
  TECH = 'Técnico'
}

export enum OrderStatus {
  OPEN = 'Aberta',
  IN_PROGRESS = 'Em Andamento',
  PAUSED = 'Pausada',
  FINISHED = 'Finalizada',
  CANCELLED = 'Cancelada'
}

export enum CompanyPlan {
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  ANUAL = 'ANUAL',
  TESTE = 'TESTE',
  LIVRE = 'LIVRE'
}

export interface CompanyPayment {
  id: string;
  companyId: string;
  amount: number;
  paymentDate: string;
  planReference: CompanyPlan;
  expiresAtAfter: string; // Data de vencimento após este pagamento
}

export interface SystemSettings {
  enableAI: boolean;
  enableAttachments: boolean;
  enableChat: boolean;
  enableHistory: boolean;
  orderTypes: string[];
}

export interface Company {
  id: string;
  name: string; // Mantido para compatibilidade, será o Nome Fantasia
  corporateName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  document: string; // CNPJ
  email: string;
  phone: string;
  address: string;
  city: string;
  plan: CompanyPlan;
  monthlyFee: number;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  expiresAt?: string; // Data de expiração (ISO string), null para plano LIVRE
  settings: SystemSettings;
}

export interface User {
  id: string;
  companyId?: string; // Null para DEVELOPER
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  city?: string;
  isBlocked?: boolean;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  number?: string;
  sector?: string;
  notes: string;
  createdAt: string;
}

export interface OrderPost {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface OrderAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: string; // Base64
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  techId: string;
  techName: string;
  type: string;
  description: string;
  dailyHistory?: string;
  aiReport: string;
  status: OrderStatus;
  createdAt: string;
  scheduledDate?: string;
  finishedAt?: string;
  cancellationReason?: string;
  posts: OrderPost[];
  attachments?: OrderAttachment[];
}

export interface ChatMessage {
  id: string;
  companyId: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  channelId?: string;
  text: string;
  timestamp: string;
}

export enum NotificationType {
  PLAN_EXPIRING = 'PLAN_EXPIRING',
  NEW_MESSAGE = 'NEW_MESSAGE',
  SERVICE_UPDATE = 'SERVICE_UPDATE',
  SYSTEM = 'SYSTEM'
}

export interface AppNotification {
  id: string;
  companyId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AppState {
  companies: Company[];
  users: User[];
  customers: Customer[];
  orders: ServiceOrder[];
  currentUser: User | null;
  settings: SystemSettings; // Defaults globais
  messages: ChatMessage[];
  companyPayments: CompanyPayment[];
  notifications: AppNotification[];
}