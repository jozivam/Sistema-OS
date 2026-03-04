
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
  zipCode?: string; // CEP (Novo para NF-e)
  address: string; // Logradouro
  number?: string; // Número (Novo para NF-e)
  complement?: string; // Complemento (Novo para NF-e)
  neighborhood?: string; // Bairro (Novo para NF-e)
  city: string; // Município
  state?: string; // UF (Novo para NF-e)
  plan: CompanyPlan;
  period: CompanyPeriod;
  monthlyFee: number;
  status: 'ACTIVE' | 'BLOCKED';
  ativo?: boolean; // ERP V4 Soft Delete
  refundedAmount?: number;
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
  ativo?: boolean; // ERP V4 Soft Delete
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  corporateName?: string; // Razão Social (Novo para NF-e)
  document?: string; // CNPJ/CPF
  customerType?: 'COMPLETO' | 'BALCAO';
  email?: string; // E-mail (Novo para NF-e)
  phone: string;
  zipCode?: string; // CEP (Novo para NF-e)
  address: string; // Logradouro
  number?: string; // Número
  complement?: string; // Complemento (Novo para NF-e)
  neighborhood?: string; // Bairro (Novo para NF-e)
  city: string; // Município
  estado?: string; // ERP V4 - UF
  sector?: string;
  notes: string;
  ativo?: boolean; // ERP V4 Soft Delete
  createdAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string; // Nome Fantasia ou Apelido
  corporateName?: string; // Razão Social (Novo para NF-e)
  document?: string; // CPF/CNPJ
  phone?: string;
  email?: string;
  zipCode?: string; // CEP (Novo para NF-e)
  address?: string; // Logradouro (Novo para NF-e)
  number?: string; // Número (Novo para NF-e)
  complement?: string; // Complemento (Novo para NF-e)
  neighborhood?: string; // Bairro (Novo para NF-e)
  city?: string; // Município
  state?: string; // UF (Novo para NF-e)
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export enum TransactionType {
  INCOME = 'RECEITA',
  EXPENSE = 'DESPESA'
}

export enum TransactionCategory {
  SALE = 'VENDA_PDV',
  SUPPLY = 'COMPRA_SUPRIMENTO',
  SERVICE = 'SERVICO_OS',
  OTHER = 'OUTROS'
}

export interface FinancialTransaction {
  id: string;
  companyId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  date: string;
  orderId?: string;
  supplierId?: string;
  customerId?: string;
  status: 'PAID' | 'PENDING' | 'CANCELLED';
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
  observacoes?: string; // ERP V4
  dailyHistory?: string;
  aiReport: string;
  status: OrderStatus;
  ativo?: boolean; // ERP V4 Soft Delete
  createdAt: string;
  scheduledDate?: string;
  prazo?: string; // ERP V4
  finishedAt?: string;
  cancellationReason?: string;
  posts: OrderPost[];
  attachments?: OrderAttachment[];
}

export interface Product {
  id: string;
  companyId: string;
  nome: string;
  descricao?: string;
  imagens?: string[]; // Array de URLs das fotos
  precoVenda: number;
  sku: string;
  peso?: number;
  altura?: number;
  largura?: number;
  comprimento?: number;
  quantidadeEstoque: number;
  ean?: string;
  ncm?: string;
  variacoes?: any; // JSON para variações
  categoria?: string;
  marca?: string;
  seoTitle?: string;
  seoDescription?: string;
  fornecedorId?: string;
  valorCompra?: number;
  margemLucro?: number; // Porcentagem para venda
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface StorageLocation {
  id: string;
  companyId: string;
  nome: string;
  localizacao?: string;
  ativo: boolean;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  companyId: string;
  produtoId: string;
  tipo: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';
  quantidade: number;
  origemId?: string;
  destinoId?: string;
  fornecedorId?: string;
  documentRef?: string;
  userId: string;
  userName: string;
  observacoes?: string;
  createdAt: string;
}

// ==========================================
// VENDAS (PDV) - ERP V4
// ==========================================
export interface VendaItem {
  id: string;
  vendaId: string;
  produtoId: string;
  descricaoPersonalizada?: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  total: number;
}

export interface Venda {
  id: string;
  companyId: string;
  clienteId?: string;
  ordemServicoId?: string;
  subtotal: number;
  descontoTotal: number;
  total: number;
  status: 'rascunho' | 'confirmada' | 'cancelada';
  userId?: string;
  createdAt: string;
  itens?: VendaItem[];
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