export interface Project {
  id: string;
  name: string;
  clusterName?: string;
  providerName?: string;
  sharepointPath?: string;
  createdAt: string;
  updatedAt: string;
  totalCustomers?: number;
  matchedCustomers?: number;
}

export interface CustomerItem {
  id: number;
  customerName: string;
  street: string;
  city: string;
  segment?: string;
  cableId?: string;
  fiberNumber: number;
  fiberType?: string;
  colorCode?: string;
  orderId?: string;
  notes?: string;
  
  status: 'pending' | 'matched' | 'exported';
  sorFileName?: string;
  sorFilePath?: string;
  sorData?: any;
  secondarySorData?: any;
  macrobendWarning?: string;
  measuredAt?: string;
  technicianName?: string;
  
  customOverrides?: {
    customerName?: string;
    street?: string;
    city?: string;
    technicianName?: string;
    date?: string;
    time?: string;
    segment?: string;
    cableId?: string;
    fiberNumber?: number;
  };
}

export interface ExcelColumnMapping {
  id: string;
  customerName: string;
  firstName: string;
  lastName: string;
  street: string;
  zip: string;
  city: string;
  segment: string;
  cableId: string;
  fiberNumber: string;
  orderId: string;
}

export interface AppSettings {
  companyName: string;
  companyDept: string;
  companyContact: string;
  defaultTechnician: string;
  providerName: string;
  projectCluster: string;
  launchFiber: string;
  receiveFiber: string;
  normTitle: string;
  maxLossSplice: number;
  maxLossConnector: number;
  minOrl: number;
  otdrDeviceModel: string;
  logoBase64?: string;
  signatureBase64?: string;
  accentColor: string;
  themeMode: 'dark' | 'light';
  hideProvider?: boolean;
  hideContractor?: boolean;
  hideOrderId?: boolean;
  launchFiberOnly?: boolean;
  columnMapping?: Partial<ExcelColumnMapping>;
}
