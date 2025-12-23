
export enum Shift {
  DIURNO = 'Diurno',
  NOTURNO = 'Noturno'
}

export enum ChecklistType {
  SAIDA = 'Saída',
  RETORNO = 'Retorno'
}

export enum ItemStatus {
  OK = 'OK',
  FALTA = 'FALTA',
  DEFEITUOSO = 'DEFEITUOSO'
}

export interface ChecklistItem {
  id: number;
  label: string;
  category: string;
}

export interface Vehicle {
  id: string;
  prefix: string;
  plate: string;
  currentKm: number;
  currentHorimetro: number;
  lastUpdated: number;
}

export interface Approval {
  userId: string;
  userName: string;
  timestamp: number;
  observation?: string;
}

export interface ChecklistEntry {
  id: string;
  date: string;
  shift: Shift;
  type: ChecklistType;
  driverName: string;
  driverId: string;
  prefix: string;
  vehicleId: string;
  km: number;
  horimetro: number;
  items: Record<number, {
    status: ItemStatus;
    vistoria: boolean;
    obs?: string;
  }>;
  generalObservations: string;
  createdAt: number;
  userId: string;
  operatorSignature?: string; // Base64 signature
  maintenanceApproval?: Approval;
  operationApproval?: Approval;
  hasIssues: boolean;
}

export interface User {
  id: string;
  name: string;
  role: 'ADMIN' | 'OPERADOR' | 'MANUTENCAO' | 'OPERACAO';
  username: string;
  matricula?: string;
}
