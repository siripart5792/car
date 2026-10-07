import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Settings, 
  Plus, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  ListChecks, 
  FolderPlus, 
  Lock, 
  KeyRound, 
  LogOut, 
  Zap, 
  Wrench, 
  X, 
  AlertCircle, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  User, 
  Phone, 
  Mail,
  Eye,
  EyeOff
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  Vehicle, 
  VehicleCategory, 
  ChecklistTemplatesState, 
  InspectionCategoryTemplate,
  AdminUser,
  AdminRole
} from '../types/vehicle';
import { VehicleManager } from './VehicleManager';
import { ConfirmModal } from './ConfirmModal';
import { 
  loadAdminUsers, 
  saveAdminUsers, 
  getCurrentAdminUser, 
  setCurrentAdminUser, 
  isStoredAdminAuth, 
  setStoredAdminAuth 
} from '../services/storage';

interface AdminPanelProps {
  user: FirebaseUser | null;
  vehicles: Vehicle[];
  checklistTemplates: ChecklistTemplatesState;
  onGoogleLogin: () => Promise<void>;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onStartInspection: (vehicleId: string) => void;
  onUpdateTemplates: (newTemplates: ChecklistTemplatesState) => void;
  onResetTemplates: () => void;
}

type AdminSubTab = 'vehicles' | 'general_checklist' | 'crane_checklist' | 'bucket_checklist' | 'admin_users';

const ROLE_META: Record<AdminRole, { label: string; bg: string; text: string }> = {
  super_admin: { label: 'ผู้ดูแลระบบหลัก (Super Admin)', bg: 'bg-rose-50 border-rose-200 text-rose-700', text: 'text-rose-700' },
  admin: { label: 'ผู้ดูแลระบบ (Admin)', bg: 'bg-blue-50 border-blue-200 text-blue-700', text: 'text-blue-700' },
  supervisor: { label: 'หัวหน้างาน (Supervisor)', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', text: 'text-emerald-700' },
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  vehicles,
  checklistTemplates,
  onGoogleLogin,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onStartInspection,
  onUpdateTemplates,
  onResetTemplates,
}) => {
  // Admin users list state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => loadAdminUsers());
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => getCurrentAdminUser());

  // Admin Login Authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!user || !!getCurrentAdminUser() || isStoredAdminAuth();
  });

  // Login form inputs
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  // If user signs in via Google externally, authenticate
  useEffect(() => {
    if (user) {
      setIsAdminLoggedIn(true);
      setStoredAdminAuth(true);
    }
  }, [user]);

  // Username & Password Authentication
  const handleAdminCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = loginUsername.trim().toLowerCase();
    const matchedUser = adminUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === loginPassword
    );

    if (matchedUser) {
      if (matchedUser.status === 'inactive') {
        setLoginError('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน โปรดติดต่อผู้ดูแลระบบหลัก');
        return;
      }

      setIsAdminLoggedIn(true);
      setCurrentAdmin(matchedUser);
      setCurrentAdminUser(matchedUser);
      setLoginError('');
    } else {
      setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (User หลัก: admin / รหัสผ่าน: Pea*123456)');
    }
  };

  const handleGoogleAdminLogin = async () => {
    setIsLoggingInGoogle(true);
    try {
      await onGoogleLogin();
      setIsAdminLoggedIn(true);
      setStoredAdminAuth(true);
    } catch (err: any) {
      console.error('Google Admin Login failed:', err);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setCurrentAdmin(null);
    setCurrentAdminUser(null);
    setStoredAdminAuth(false);
  };

  // Sub-tabs inside Admin
  const [subTab, setSubTab] = useState<AdminSubTab>('vehicles');

  // --- Admin User Management Modal States ---
  const [adminUserModalOpen, setAdminUserModalOpen] = useState(false);
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [adminUserFormData, setAdminUserFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    role: 'admin' as AdminRole,
    email: '',
    phone: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [showAdminUserPassword, setShowAdminUserPassword] = useState(false);
  const [adminUserFormError, setAdminUserFormError] = useState('');
  const [deletingAdminUserId, setDeletingAdminUserId] = useState<string | null>(null);

  const handleOpenAddAdmin = () => {
    setEditingAdminUser(null);
    setAdminUserFormData({
      username: '',
      password: '',
      displayName: '',
      role: 'admin',
      email: '',
      phone: '',
      status: 'active',
    });
    setAdminUserFormError('');
    setShowAdminUserPassword(false);
    setAdminUserModalOpen(true);
  };

  const handleOpenEditAdmin = (admin: AdminUser) => {
    setEditingAdminUser(admin);
    setAdminUserFormData({
      username: admin.username,
      password: admin.password,
      displayName: admin.displayName,
      role: admin.role,
      email: admin.email || '',
      phone: admin.phone || '',
      status: admin.status,
    });
    setAdminUserFormError('');
    setShowAdminUserPassword(false);
    setAdminUserModalOpen(true);
  };

  const handleSaveAdminUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserFormData.username.trim() || !adminUserFormData.displayName.trim()) {
      setAdminUserFormError('กรุณากรอกชื่อผู้ใช้และชื่อที่แสดง');
      return;
    }
    if (!adminUserFormData.password) {
      setAdminUserFormError('กรุณาระบุรหัสผ่าน');
      return;
    }

    const cleanUsername = adminUserFormData.username.trim().toLowerCase();

    if (editingAdminUser) {
      // Edit existing admin
      const duplicate = adminUsers.some(
        (u) => u.id !== editingAdminUser.id && u.username.toLowerCase() === cleanUsername
      );
      if (duplicate) {
        setAdminUserFormError('ชื่อผู้ใช้นี้ (Username) มีผู้ใช้งานแล้ว');
        return;
      }

      const updated = adminUsers.map((u) => {
        if (u.id === editingAdminUser.id) {
          return {
            ...u,
            username: cleanUsername,
            password: adminUserFormData.password,
            displayName: adminUserFormData.displayName.trim(),
            role: adminUserFormData.role,
            email: adminUserFormData.email.trim(),
            phone: adminUserFormData.phone.trim(),
            status: adminUserFormData.status,
            updatedAt: new Date().toISOString(),
          };
        }
        return u;
      });

      setAdminUsers(updated);
      saveAdminUsers(updated);
      if (currentAdmin?.id === editingAdminUser.id) {
        const myUpdate = updated.find((u) => u.id === currentAdmin.id) || null;
        setCurrentAdmin(myUpdate);
        setCurrentAdminUser(myUpdate);
      }
    } else {
      // Add new admin
      const duplicate = adminUsers.some((u) => u.username.toLowerCase() === cleanUsername);
      if (duplicate) {
        setAdminUserFormError('ชื่อผู้ใช้นี้ (Username) มีผู้ใช้งานแล้ว กรุณาใช้ชื่ออื่น');
        return;
      }

      const newAdmin: AdminUser = {
        id: `admin-${Date.now()}`,
        username: cleanUsername,
        password: adminUserFormData.password,
        displayName: adminUserFormData.displayName.trim(),
        role: adminUserFormData.role,
        email: adminUserFormData.email.trim(),
        phone: adminUserFormData.phone.trim(),
        status: adminUserFormData.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...adminUsers, newAdmin];
      setAdminUsers(updated);
      saveAdminUsers(updated);
    }

    setAdminUserModalOpen(false);
  };

  const handleConfirmDeleteAdmin = () => {
    if (!deletingAdminUserId) return;
    const adminToDelete = adminUsers.find((u) => u.id === deletingAdminUserId);

    if (adminToDelete?.username.toLowerCase() === 'admin') {
      setDeletingAdminUserId(null);
      return;
    }

    const updated = adminUsers.filter((u) => u.id !== deletingAdminUserId);
    setAdminUsers(updated);
    saveAdminUsers(updated);
    setDeletingAdminUserId(null);
  };

  const deletingTargetUser = adminUsers.find((u) => u.id === deletingAdminUserId);

  // --- Checklist Items & Templates States ---
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemTargetCategory, setItemTargetCategory] = useState<VehicleCategory>('general');
  const [editingItemData, setEditingItemData] = useState<{
    originalId?: string;
    categoryName: string;
    title: string;
    description: string;
  } | null>(null);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{
    categoryKey: VehicleCategory;
    categoryName: string;
    itemId: string;
    itemTitle: string;
  } | null>(null);

  const [confirmResetTemplates, setConfirmResetTemplates] = useState(false);

  const getCategoryKeyForSubTab = (tab: AdminSubTab): VehicleCategory => {
    if (tab === 'general_checklist') return 'general';
    if (tab === 'crane_checklist') return 'crane_truck';
    return 'bucket_truck_class_c';
  };

  const currentCategoryKey: VehicleCategory = getCategoryKeyForSubTab(subTab);
  const currentCategoryList: InspectionCategoryTemplate[] = checklistTemplates[currentCategoryKey] || [];

  const handleOpenAddItem = (prefilledCatName?: string) => {
    const defaultCat = prefilledCatName || currentCategoryList[0]?.category || '1. หมวดหมู่ใหม่';
    setEditingItemData({
      categoryName: defaultCat,
      title: '',
      description: '',
    });
    setItemTargetCategory(currentCategoryKey);
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (categoryName: string, item: { id: string; title: string; description?: string }) => {
    setEditingItemData({
      originalId: item.id,
      categoryName,
      title: item.title,
      description: item.description || '',
    });
    setItemTargetCategory(currentCategoryKey);
    setItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemData || !editingItemData.title.trim()) return;

    const key = itemTargetCategory;
    const currentList = [...(checklistTemplates[key] || [])];
    const targetCatIndex = currentList.findIndex((c) => c.category === editingItemData.categoryName);

    if (editingItemData.originalId) {
      const updatedList = currentList.map((cat) => ({
        ...cat,
        items: cat.items.map((i) =>
          i.id === editingItemData.originalId
            ? { ...i, title: editingItemData.title.trim(), description: editingItemData.description.trim() }
            : i
        ),
      }));
      onUpdateTemplates({
        ...checklistTemplates,
        [key]: updatedList,
      });
    } else {
      const newItem = {
        id: `${key}_${Date.now()}`,
        title: editingItemData.title.trim(),
        description: editingItemData.description.trim(),
      };

      if (targetCatIndex >= 0) {
        currentList[targetCatIndex] = {
          ...currentList[targetCatIndex],
          items: [...currentList[targetCatIndex].items, newItem],
        };
      } else {
        currentList.push({
          category: editingItemData.categoryName.trim(),
          items: [newItem],
        });
      }

      onUpdateTemplates({
        ...checklistTemplates,
        [key]: currentList,
      });
    }

    setItemModalOpen(false);
  };

  const handleConfirmDeleteItem = () => {
    if (!deleteTarget) return;
    const { categoryKey, categoryName, itemId } = deleteTarget;
    const updatedList = (checklistTemplates[categoryKey] || [])
      .map((cat) => {
        if (cat.category === categoryName) {
          return {
            ...cat,
            items: cat.items.filter((i) => i.id !== itemId),
          };
        }
        return cat;
      })
      .filter((cat) => cat.items.length > 0);

    onUpdateTemplates({
      ...checklistTemplates,
      [categoryKey]: updatedList,
    });
    setDeleteTarget(null);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const key = currentCategoryKey;
    const exists = (checklistTemplates[key] || []).some((c) => c.category === newCatName.trim());
    if (exists) {
      setCatError('มีหมวดหมู่นี้อยู่แล้ว');
      return;
    }

    const updatedList = [
      ...(checklistTemplates[key] || []),
      { category: newCatName.trim(), items: [] },
    ];

    onUpdateTemplates({
      ...checklistTemplates,
      [key]: updatedList,
    });

    setNewCatName('');
    setCatError('');
    setCatModalOpen(false);
  };

  // 1. Mandatory Admin Login Gate
  if (!isAdminLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-3xl border border-slate-200 shadow-xl animate-in zoom-in-95 duration-200">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-md">
          <Lock className="w-7 h-7" />
        </div>

        <div className="text-center">
          <h2 className="text-xl font-black text-slate-900">
            เข้าสู่ระบบสำหรับผู้ดูแลระบบ
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            กรุณาระบุชื่อผู้ใช้และรหัสผ่านเพื่อจัดการข้อมูลยานพาหนะและรายการตรวจเช็ค
          </p>
        </div>

        {/* Username & Password Form */}
        <form onSubmit={handleAdminCredentialsLogin} className="mt-6 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อผู้ใช้ (Username)
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="ระบุชื่อผู้ใช้ (เช่น admin)"
                value={loginUsername}
                onChange={(e) => {
                  setLoginUsername(e.target.value);
                  setLoginError('');
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showLoginPassword ? 'text' : 'password'}
                required
                placeholder="ระบุรหัสผ่าน (เช่น Pea*123456)"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setLoginError('');
                }}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {loginError && (
              <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {loginError}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            เข้าสู่ระบบผู้ดูแล
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[11px] text-slate-400 font-medium uppercase">หรือเข้าสู่ระบบด้วย</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Option B: Google Sign-in */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleGoogleAdminLogin}
            disabled={isLoggingInGoogle}
            className="gsi-material-button w-full justify-center !h-10 shadow-xs"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  ></path>
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  ></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents font-semibold text-xs text-slate-700">
                {isLoggingInGoogle ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google Account'}
              </span>
            </div>
          </button>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 text-center space-y-1">
          <div>🔑 User หลัก: <span className="font-mono font-bold text-slate-800">admin</span></div>
          <div>🔒 รหัสผ่านเริ่มต้น: <span className="font-mono font-bold text-slate-800">Pea*123456</span></div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Admin Screen
  return (
    <div className="space-y-6">
      {/* Admin Title Header with Sign Out */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-amber-400 rounded-full text-xs font-bold">
              <Settings className="w-3.5 h-3.5" />
              แผงควบคุมผู้ดูแลระบบ
            </span>
            {currentAdmin && (
              <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2.5 py-1 rounded-full">
                ผู้ใช้งาน: <strong className="text-slate-800">{currentAdmin.displayName}</strong> (@{currentAdmin.username})
              </span>
            )}
            <button
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              ออกจากระบบ
            </button>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            การจัดการข้อมูลระบบและผู้ดูแลระบบ
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            จัดการยานพาหนะ, รายการตรวจเช็ค 3 ประเภท และบัญชีผู้ดูแลระบบ (เพิ่ม/ลบ/แก้ไข)
          </p>
        </div>

        {/* Tab Switcher for Admin features */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setSubTab('vehicles')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'vehicles'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="w-4 h-4" />
            ยานพาหนะ ({vehicles.length})
          </button>

          <button
            onClick={() => setSubTab('general_checklist')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'general_checklist'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            1. ทั่วไป
          </button>

          <button
            onClick={() => setSubTab('crane_checklist')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'crane_checklist'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            2. รถเครน
          </button>

          <button
            onClick={() => setSubTab('bucket_checklist')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'bucket_checklist'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4" />
            3. กระเช้า Class C
          </button>

          {/* New Tab: Manage Admin Users */}
          <button
            onClick={() => setSubTab('admin_users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'admin_users'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'text-slate-700 hover:text-slate-950 font-bold'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            จัดการผู้ดูแลระบบ ({adminUsers.length})
          </button>
        </div>
      </div>

      {/* SubTab 1: Manage Vehicles */}
      {subTab === 'vehicles' && (
        <VehicleManager
          vehicles={vehicles}
          onAddVehicle={onAddVehicle}
          onUpdateVehicle={onUpdateVehicle}
          onDeleteVehicle={onDeleteVehicle}
          onStartInspection={onStartInspection}
        />
      )}

      {/* SubTab 5: Manage Admin Users (NEW!) */}
      {subTab === 'admin_users' && (
        <div className="space-y-6">
          {/* Header Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  จัดการบัญชีผู้ดูแลระบบ (Admin Accounts)
                </h3>
                <p className="text-xs text-slate-500">
                  เพิ่ม ลบ แก้ไข ผู้ดูแลระบบ และกำหนดสิทธิ์การเข้าใช้งาน ({adminUsers.length} บัญชี)
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenAddAdmin}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-98"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              เพิ่มผู้ดูแลระบบใหม่
            </button>
          </div>

          {/* Admin Users Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminUsers.map((admin) => {
              const roleInfo = ROLE_META[admin.role] || ROLE_META.admin;
              const isRoot = admin.username.toLowerCase() === 'admin';

              return (
                <div
                  key={admin.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between"
                >
                  <div>
                    {/* Role & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${roleInfo.bg}`}>
                        {roleInfo.label}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        admin.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {admin.status === 'active' ? '● ใช้งานปกติ' : '○ ระงับใช้งาน'}
                      </span>
                    </div>

                    {/* Display name & username */}
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                      {admin.displayName}
                      {isRoot && (
                        <span title="User หลัก">
                          <ShieldCheck className="w-4 h-4 text-amber-500" />
                        </span>
                      )}
                    </h4>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      Username: <strong className="text-slate-800">@{admin.username}</strong>
                    </p>

                    {/* Contact & Date */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      {admin.email && (
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{admin.email}</span>
                        </div>
                      )}
                      {admin.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{admin.phone}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 pt-1">
                        สร้างเมื่อ: {new Date(admin.createdAt).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEditAdmin(admin)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      แก้ไข
                    </button>

                    {!isRoot && (
                      <button
                        onClick={() => setDeletingAdminUserId(admin.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="ลบผู้ดูแลระบบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SubTabs 2, 3, 4: Manage Checklist Items for 3 Categories */}
      {(subTab === 'general_checklist' || subTab === 'crane_checklist' || subTab === 'bucket_checklist') && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  subTab === 'general_checklist'
                    ? 'bg-blue-600'
                    : subTab === 'crane_checklist'
                    ? 'bg-amber-600'
                    : 'bg-purple-600'
                }`}
              >
                {subTab === 'general_checklist' ? (
                  <Car className="w-5 h-5" />
                ) : subTab === 'crane_checklist' ? (
                  <Wrench className="w-5 h-5" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {subTab === 'general_checklist'
                    ? 'รายการตรวจเช็ค: 1. ยานพาหนะทั่วไป'
                    : subTab === 'crane_checklist'
                    ? 'รายการตรวจเช็ค: 2. รถบรรทุกติดเครนไฮดรอลิค'
                    : 'รายการตรวจเช็ค: 3. รถกระเช้า Class C (ฮอทไลน์ / ฉนวนไฟฟ้า)'}
                </h3>
                <p className="text-xs text-slate-500">
                  รวม {currentCategoryList.length} หมวดหมู่ ({currentCategoryList.reduce((acc, c) => acc + c.items.length, 0)} รายการตรวจ)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setConfirmResetTemplates(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition-all"
                title="รีเซ็ตกลับเป็นชุดรายการตรวจมาตรฐาน"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                รีเซ็ตค่าเริ่มต้น
              </button>

              <button
                onClick={() => {
                  setCatError('');
                  setCatModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all"
              >
                <FolderPlus className="w-4 h-4" />
                เพิ่มหมวดหมู่
              </button>

              <button
                onClick={() => handleOpenAddItem()}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all active:scale-98 ${
                  subTab === 'general_checklist'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : subTab === 'crane_checklist'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                <Plus className="w-4 h-4" />
                เพิ่มรายการตรวจเช็คใหม่
              </button>
            </div>
          </div>

          {/* Categories and Checklist Items */}
          <div className="space-y-4">
            {currentCategoryList.map((cat, catIdx) => (
              <div
                key={catIdx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                    <h4 className="font-bold text-slate-800 text-sm">{cat.category}</h4>
                    <span className="text-xs text-slate-500 font-mono">({cat.items.length} รายการ)</span>
                  </div>

                  <button
                    onClick={() => handleOpenAddItem(cat.category)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    เพิ่มข้อตรวจในหมวดนี้
                  </button>
                </div>

                {cat.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    ยังไม่มีรายการตรวจในหมวดนี้
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {cat.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 text-[11px]">#{itemIdx + 1}</span>
                            <span className="font-bold text-slate-800 text-sm">{item.title}</span>
                          </div>
                          {item.description && (
                            <p className="text-slate-500 mt-1 leading-relaxed">{item.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                          <button
                            onClick={() => handleOpenEditItem(cat.category, item)}
                            className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all flex items-center gap-1 font-medium"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>

                          <button
                            onClick={() =>
                              setDeleteTarget({
                                categoryKey: currentCategoryKey,
                                categoryName: cat.category,
                                itemId: item.id,
                                itemTitle: item.title,
                              })
                            }
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                            title="ลบรายการตรวจนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Admin User (NEW!) */}
      {adminUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {editingAdminUser ? 'แก้ไขข้อมูลผู้ดูแลระบบ' : 'เพิ่มผู้ดูแลระบบใหม่'}
              </h3>
              <button
                onClick={() => setAdminUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminUser} className="p-5 space-y-3.5">
              {adminUserFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{adminUserFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={editingAdminUser?.username.toLowerCase() === 'admin'}
                  placeholder="เช่น admin, manager, somchai"
                  value={adminUserFormData.username}
                  onChange={(e) =>
                    setAdminUserFormData({ ...adminUserFormData, username: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  รหัสผ่าน (Password) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminUserPassword ? 'text' : 'password'}
                    required
                    placeholder="ระบุรหัสผ่าน (เช่น Pea*123456)"
                    value={adminUserFormData.password}
                    onChange={(e) =>
                      setAdminUserFormData({ ...adminUserFormData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminUserPassword(!showAdminUserPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ-นามสกุล / ชื่อที่แสดง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น นายสมชาย ใจมั่น (หน.หมวด)"
                  value={adminUserFormData.displayName}
                  onChange={(e) =>
                    setAdminUserFormData({ ...adminUserFormData, displayName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ระดับสิทธิ์ (Role)
                  </label>
                  <select
                    value={adminUserFormData.role}
                    onChange={(e) =>
                      setAdminUserFormData({ ...adminUserFormData, role: e.target.value as AdminRole })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin (ผู้ดูแล)</option>
                    <option value="supervisor">Supervisor (หัวหน้า)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานะบัญชี
                  </label>
                  <select
                    value={adminUserFormData.status}
                    onChange={(e) =>
                      setAdminUserFormData({
                        ...adminUserFormData,
                        status: e.target.value as 'active' | 'inactive',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="active">ใช้งานปกติ (Active)</option>
                    <option value="inactive">ระงับการใช้งาน</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    placeholder="user@pea.co.th"
                    value={adminUserFormData.email}
                    onChange={(e) =>
                      setAdminUserFormData({ ...adminUserFormData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    placeholder="081-xxx-xxxx"
                    value={adminUserFormData.phone}
                    onChange={(e) =>
                      setAdminUserFormData({ ...adminUserFormData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdminUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-xs"
                >
                  {editingAdminUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ดูแลระบบ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Admin User Confirmation */}
      <ConfirmModal
        isOpen={!!deletingAdminUserId}
        title="ยืนยันการลบบัญชีผู้ดูแลระบบ"
        message={
          deletingTargetUser
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ดูแลระบบ "${deletingTargetUser.displayName}" (@${deletingTargetUser.username})?\n\nเมื่อลบแล้วบัญชีนี้จะไม่สามารถเข้าสู่ระบบผู้ดูแลได้อีก`
            : ''
        }
        confirmLabel="ลบบัญชี"
        cancelLabel="ยกเลิก"
        isDestructive={true}
        onConfirm={handleConfirmDeleteAdmin}
        onCancel={() => setDeletingAdminUserId(null)}
      />

      {/* Add / Edit Checklist Item Modal */}
      {itemModalOpen && editingItemData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-blue-600" />
                {editingItemData.originalId ? 'แก้ไขรายการตรวจเช็ค' : 'เพิ่มรายการตรวจเช็คใหม่'}
              </h3>
              <button
                onClick={() => setItemModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ประเภทชุดการตรวจ
                </label>
                <select
                  disabled={!!editingItemData.originalId}
                  value={itemTargetCategory}
                  onChange={(e) => setItemTargetCategory(e.target.value as VehicleCategory)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 font-semibold"
                >
                  <option value="general">1. ยานพาหนะทั่วไป (รถกระบะ, รถตู้, รถเก๋ง ฯลฯ)</option>
                  <option value="crane_truck">2. รถบรรทุกติดเครนไฮดรอลิค (เครนยก, สลิง, ไฮดรอลิก)</option>
                  <option value="bucket_truck_class_c">3. รถกระเช้า Class C (ฉนวนไฟฟ้า, ฮอทไลน์)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมวดหมู่หลัก (Category)
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 3. บูมฉนวนไฟฟ้าและการรับรอง Dielectric"
                  value={editingItemData.categoryName}
                  onChange={(e) =>
                    setEditingItemData({ ...editingItemData, categoryName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {(checklistTemplates[itemTargetCategory] || []).map((c, i) => (
                    <option key={i} value={c.category} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อรายการที่ต้องตรวจเช็ค (Inspection Item Title) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ตรวจสอบความสะอาดบูมฉนวน, ตรวจสอบ Foot Switch..."
                  value={editingItemData.title}
                  onChange={(e) =>
                    setEditingItemData({ ...editingItemData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบายวิธีตรวจหรือเกณฑ์มาตรฐาน (Guideline / Standard)
                </label>
                <textarea
                  rows={3}
                  placeholder="เช่น บูมฉนวนสะอาด แห้ง เป็นมันเงา ไม่มีคราบเขม่าหรือรอยกะเทาะ..."
                  value={editingItemData.description}
                  onChange={(e) =>
                    setEditingItemData({ ...editingItemData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-xs"
                >
                  {editingItemData.originalId ? 'บันทึกการแก้ไข' : 'เพิ่มรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-blue-600" />
              เพิ่มหมวดหมู่รายการตรวจใหม่
            </h3>

            <form onSubmit={handleAddCategory} className="space-y-4">
              {catError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{catError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อหมวดหมู่
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น 6. ระบบกู้ภัยกระเช้าฉุกเฉิน"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold"
                >
                  สร้างหมวดหมู่
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="ยืนยันการลบรายการตรวจเช็ค"
        message={
          deleteTarget
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบรายการตรวจ "${deleteTarget.itemTitle}" ออกจากหมวดหมู่ "${deleteTarget.categoryName}"?\n\nการกระทำนี้จะมีผลกับการตรวจเช็คครั้งต่อไป`
            : ''
        }
        confirmLabel="ลบรายการตรวจ"
        cancelLabel="ยกเลิก"
        isDestructive={true}
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset Templates Confirmation */}
      <ConfirmModal
        isOpen={confirmResetTemplates}
        title="รีเซ็ตรายการตรวจเช็คกลับเป็นค่าเริ่มต้น"
        message={`คุณต้องการคืนค่ารายการตรวจเช็คทั้ง 3 ประเภท (ทั่วไป, รถเครน, รถกระเช้า Class C) ให้กลับสู่ค่ามาตรฐานเริ่มต้นของระบบหรือไม่?\n\nรายการที่คุณเพิ่มหรือแก้ไขเองจะถูกแทนที่ด้วยค่ามาตรฐาน`}
        confirmLabel="รีเซ็ตเป็นค่าเริ่มต้น"
        cancelLabel="ยกเลิก"
        isDestructive={false}
        onConfirm={() => {
          setConfirmResetTemplates(false);
          onResetTemplates();
        }}
        onCancel={() => setConfirmResetTemplates(false)}
      />
    </div>
  );
};
