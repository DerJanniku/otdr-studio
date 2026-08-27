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
}
