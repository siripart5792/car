import { Vehicle, InspectionRecord, ChecklistTemplatesState, AdminUser } from '../types/vehicle';
import { INITIAL_VEHICLES, INITIAL_INSPECTIONS, INITIAL_CHECKLIST_TEMPLATES } from '../data/checklistTemplates';

const VEHICLES_KEY = 'fleet_inspection_vehicles_v3';
const INSPECTIONS_KEY = 'fleet_inspection_records_v3';
const TEMPLATES_KEY = 'fleet_inspection_templates_v3';
const ADMIN_SESSION_KEY = 'fleet_admin_session_v3';
const ADMIN_USERS_KEY = 'fleet_admin_users_v1';
const CURRENT_ADMIN_USER_KEY = 'fleet_current_admin_user_v1';

export const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'admin-root',
    username: 'admin',
    password: 'Pea*123456',
    displayName: 'ผู้ดูแลระบบหลัก (Super Admin)',
    role: 'super_admin',
    email: 'computerpea2564@gmail.com',
    phone: '081-234-5678',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-07T00:00:00Z',
  },
  {
    id: 'admin-supervisor',
    username: 'supervisor',
    password: 'Pea*123456',
    displayName: 'หัวหน้างานตรวจสภาพยานพาหนะ (Fleet Supervisor)',
    role: 'supervisor',
    email: 'fleet.supervisor@pea.co.th',
    phone: '089-999-8888',
    status: 'active',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-10-07T00:00:00Z',
  },
];

export const loadAdminUsers = (): AdminUser[] => {
  try {
    const raw = localStorage.getItem(ADMIN_USERS_KEY);
    if (!raw) {
      localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(INITIAL_ADMIN_USERS));
      return INITIAL_ADMIN_USERS;
    }
    const parsed: AdminUser[] = JSON.parse(raw);
    // Ensure the default admin user with username 'admin' and password 'Pea*123456' always exists
    const hasAdmin = parsed.some((u) => u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      const updated = [INITIAL_ADMIN_USERS[0], ...parsed];
      localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(updated));
      return updated;
    }
    return parsed;
  } catch (e) {
    console.error('Error loading admin users from storage:', e);
    return INITIAL_ADMIN_USERS;
  }
};

export const saveAdminUsers = (users: AdminUser[]): void => {
  try {
    localStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving admin users to storage:', e);
  }
};

export const getCurrentAdminUser = (): AdminUser | null => {
  try {
    const raw = sessionStorage.getItem(CURRENT_ADMIN_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
};

export const setCurrentAdminUser = (user: AdminUser | null): void => {
  if (user) {
    sessionStorage.setItem(CURRENT_ADMIN_USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(CURRENT_ADMIN_USER_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
};

export const loadVehicles = (): Vehicle[] => {
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    if (!raw) {
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(INITIAL_VEHICLES));
      return INITIAL_VEHICLES;
    }
    const parsed: Vehicle[] = JSON.parse(raw);
    return parsed.map((v) => ({
      ...v,
      category: v.category || (v.vehicleType === 'bucket_truck' || v.vehicleType === 'bucket_truck_class_c' ? 'bucket_truck_class_c' : v.vehicleType === 'crane_truck' ? 'crane_truck' : 'general'),
    }));
  } catch (e) {
    console.error('Error loading vehicles from storage:', e);
    return INITIAL_VEHICLES;
  }
};

export const saveVehicles = (vehicles: Vehicle[]): void => {
  try {
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.error('Error saving vehicles to storage:', e);
  }
};

export const loadInspections = (): InspectionRecord[] => {
  try {
    const raw = localStorage.getItem(INSPECTIONS_KEY);
    if (!raw) {
      localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(INITIAL_INSPECTIONS));
      return INITIAL_INSPECTIONS;
    }
    const parsed: InspectionRecord[] = JSON.parse(raw);
    return parsed.map((r) => ({
      ...r,
      vehicleCategory: r.vehicleCategory || (r.vehicleType === 'bucket_truck' || r.vehicleType === 'bucket_truck_class_c' ? 'bucket_truck_class_c' : r.vehicleType === 'crane_truck' ? 'crane_truck' : 'general'),
    }));
  } catch (e) {
    console.error('Error loading inspections from storage:', e);
    return INITIAL_INSPECTIONS;
  }
};

export const saveInspections = (records: InspectionRecord[]): void => {
  try {
    localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving inspections to storage:', e);
  }
};

export const loadChecklistTemplates = (): ChecklistTemplatesState => {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(INITIAL_CHECKLIST_TEMPLATES));
      return INITIAL_CHECKLIST_TEMPLATES;
    }
    const parsed: Partial<ChecklistTemplatesState> = JSON.parse(raw);
    // Ensure all 3 categories exist
    const merged: ChecklistTemplatesState = {
      general: parsed.general || INITIAL_CHECKLIST_TEMPLATES.general,
      crane_truck: parsed.crane_truck || INITIAL_CHECKLIST_TEMPLATES.crane_truck,
      bucket_truck_class_c: parsed.bucket_truck_class_c || INITIAL_CHECKLIST_TEMPLATES.bucket_truck_class_c,
    };
    return merged;
  } catch (e) {
    console.error('Error loading templates from storage:', e);
    return INITIAL_CHECKLIST_TEMPLATES;
  }
};

export const saveChecklistTemplates = (templates: ChecklistTemplatesState): void => {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error('Error saving templates to storage:', e);
  }
};

export const resetChecklistTemplatesToDefault = (): ChecklistTemplatesState => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(INITIAL_CHECKLIST_TEMPLATES));
  return INITIAL_CHECKLIST_TEMPLATES;
};

// Admin authentication session helper
export const isStoredAdminAuth = (): boolean => {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
};

export const setStoredAdminAuth = (isAuth: boolean): void => {
  if (isAuth) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
  } else {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(CURRENT_ADMIN_USER_KEY);
  }
};
