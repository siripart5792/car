export type VehicleCategory = 'general' | 'crane_truck' | 'bucket_truck_class_c';

export type VehicleType = 
  | 'pickup' 
  | 'truck' 
  | 'van' 
  | 'bucket_truck' 
  | 'bucket_truck_class_c'
  | 'crane_truck'
  | 'sedan' 
  | 'motorcycle' 
  | 'other';

export type VehicleStatus = 'ready' | 'needs_attention' | 'maintenance';

export type FuelType = 'diesel' | 'gasoline' | 'ev' | 'hybrid' | 'cng_lpg';

export interface Vehicle {
  id: string;
  licensePlate: string;
  province: string;
  peaBranch: string; // การไฟฟ้าที่สังกัด เช่น 'กฟจ.เชียงใหม่', 'กฟจ.นครราชสีมา', 'กฟภ. สำนักงานใหญ่'
  category: VehicleCategory; // 'general' = ยานพาหนะทั่วไป, 'crane_truck' = รถบรรทุกติดเครนไฮดรอลิค, 'bucket_truck_class_c' = รถกระเช้า Class C
  vehicleType: VehicleType;
  brand: string;
  model: string;
  department: string;
  lastOdometer: number;
  fuelType: FuelType;
  status: VehicleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CheckStatus = 'pass' | 'fail' | 'na';

export interface InspectionItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  status: CheckStatus;
  remark?: string;
}

export type OverallStatus = 'ready' | 'conditional' | 'not_ready';

export interface InspectionRecord {
  id: string;
  vehicleId: string;
  vehicleLicensePlate: string;
  peaBranch: string; // การไฟฟ้าที่สังกัด
  vehicleCategory: VehicleCategory;
  vehicleType: VehicleType;
  brand: string;
  model: string;
  department: string;
  inspectionDate: string; // ISO string
  odometer: number;
  inspectorName: string;
  inspectorPhone?: string;
  workDescription?: string;
  items: InspectionItem[];
  overallStatus: OverallStatus;
  summaryRemarks?: string;
  syncedToSheets?: boolean;
  createdAt: string;
}

export interface InspectionCategoryTemplate {
  category: string;
  items: {
    id: string;
    title: string;
    description?: string;
  }[];
}

export interface ChecklistTemplatesState {
  general: InspectionCategoryTemplate[];
  crane_truck: InspectionCategoryTemplate[];
  bucket_truck_class_c: InspectionCategoryTemplate[];
}

export type AdminRole = 'super_admin' | 'admin' | 'supervisor';

export interface AdminUser {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: AdminRole;
  peaBranch?: string; // การไฟฟ้าที่สังกัด
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
