
export enum UserRole {
  DEVELOPER = 'Desenvolvedor',
  ADMIN = 'Administrador',
  TECH = 'Técnico',
  TRIAL = 'Trial'
}

export enum OrderStatus {
  OPEN = 'Aberta',
  IN_PROGRESS = 'Em Andamento',
  PAUSED = 'Pausada',
  FINISHED = 'Finalizada',
  CANCELLED = 'Cancelada'
}

// Tipo de plano contratado (tier)
export enum CompanyPlan {
  OURO = 'OURO',
  DIAMANTE = 'DIAMANTE',
  CUSTOM = 'CUSTOM',
  TESTE = 'TESTE',
  LIVRE = 'LIVRE'
}

// Período de cobrança do plano
export enum CompanyPeriod {
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL'
}

// Limites de admins por plano
export const ADMIN_LIMITS: Record<string, number | null> = {
  [CompanyPlan.OURO]: 2,
  [CompanyPlan.DIAMANTE]: 5,
  [CompanyPlan.CUSTOM]: null, // ilimitado
  [CompanyPlan.TESTE]: 1,
  [CompanyPlan.LIVRE]: null,
};

export interface PlanPricing {
  id: string;
  planType: string;
  period: CompanyPeriod;
  basePrice: number;
  discountPct: number;
  updatedAt: string;
}

export interface CompanyPayment {
  id: string;
  companyId: string;
  amount: number;
  paymentDate: string;
  planReference: string;
  expiresAtAfter: string;
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
  name: string;
  corporateName: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  plan: CompanyPlan;
  period: CompanyPeriod;
  monthlyFee: number;
  status: 'ACTIVE' | 'BLOCKED';
  createdAt: string;
  expiresAt?: string;
  settings: SystemSettings;
}

export interface User {
  id: string;
  companyId?: string;
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
  settings: SystemSettings;
  messages: ChatMessage[];
  companyPayments: CompanyPayment[];
  notifications: AppNotification[];
}