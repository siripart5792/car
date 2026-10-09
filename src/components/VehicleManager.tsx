import React, { useState } from 'react';
import { 
  Car, 
  Truck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  ClipboardCheck, 
  Fuel, 
  Gauge, 
  Building, 
  X,
  Zap,
  Lock
} from 'lucide-react';
import { Vehicle, VehicleType, VehicleStatus, FuelType, VehicleCategory } from '../types/vehicle';
import { ConfirmModal } from './ConfirmModal';

interface VehicleManagerProps {
  vehicles: Vehicle[];
  peaBranches?: string[];
  isAdmin?: boolean;
  onAddVehicle: (vehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onStartInspection: (vehicleId: string) => void;
  onNavigateToPeaBranches?: () => void;
  onNavigateToAdmin?: () => void;
}

export const VEHICLE_CATEGORY_META: Record<VehicleCategory, { label: string; badgeLabel: string; bg: string; text: string; icon: React.ReactNode }> = {
  general: {
    label: '1. ยานพาหนะทั่วไป',
    badgeLabel: 'ทั่วไป',
    bg: 'bg-blue-50 border-blue-200 text-blue-700',
    text: 'text-blue-700',
    icon: <Car className="w-3.5 h-3.5" />,
  },
  crane_truck: {
    label: '2. รถบรรทุกติดเครนไฮดรอลิค',
    badgeLabel: 'เครนไฮดรอลิค',
    bg: 'bg-amber-50 border-amber-200 text-amber-800',
    text: 'text-amber-800',
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
  bucket_truck_class_c: {
    label: '3. รถกระเช้า Class C',
    badgeLabel: 'กระเช้า Class C',
    bg: 'bg-purple-50 border-purple-200 text-purple-800',
    text: 'text-purple-800',
    icon: <Zap className="w-3.5 h-3.5 text-purple-600" />,
  },
};

const VEHICLE_TYPE_META: Record<VehicleType, { label: string; icon: React.ReactNode }> = {
  pickup: { label: 'รถกระบะ / ปิคอัพ', icon: <Car className="w-4 h-4" /> },
  truck: { label: 'รถบรรทุก 6-10 ล้อ', icon: <Truck className="w-4 h-4" /> },
  van: { label: 'รถตู้โดยสาร', icon: <Car className="w-4 h-4" /> },
  bucket_truck: { label: 'รถกระเช้าทั่วไป', icon: <Truck className="w-4 h-4" /> },
  bucket_truck_class_c: { label: 'รถกระเช้าฉนวน Class C (ฮอทไลน์)', icon: <Zap className="w-4 h-4 text-purple-600" /> },
  crane_truck: { label: 'รถบรรทุกติดเครนไฮดรอลิค', icon: <Truck className="w-4 h-4" /> },
  sedan: { label: 'รถยนต์นั่งส่วนบุคคล', icon: <Car className="w-4 h-4" /> },
  motorcycle: { label: 'รถจักรยานยนต์', icon: <Car className="w-4 h-4" /> },
  other: { label: 'ยานพาหนะอื่นๆ', icon: <Car className="w-4 h-4" /> },
};

const STATUS_META: Record<VehicleStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  ready: { 
    label: 'พร้อมใช้งาน', 
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', 
    text: 'text-emerald-700', 
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 
  },
  needs_attention: { 
    label: 'มีข้อสังเกต / ต้องดูแล', 
    bg: 'bg-amber-50 border-amber-200 text-amber-700', 
    text: 'text-amber-700', 
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> 
  },
  maintenance: { 
    label: 'ส่งซ่อม / ระงับใช้', 
    bg: 'bg-rose-50 border-rose-200 text-rose-700', 
    text: 'text-rose-700', 
    icon: <Wrench className="w-4 h-4 text-rose-600" /> 
  },
};

const FUEL_LABELS: Record<FuelType, string> = {
  diesel: 'ดีเซล (Diesel)',
  gasoline: 'เบนซิน (Gasoline)',
  ev: 'ไฟฟ้า 100% (EV)',
  hybrid: 'ไฮบริด (Hybrid)',
  cng_lpg: 'ก๊าซ NGV / LPG',
};

export const COMMON_PEA_BRANCHES = [
  'กฟภ. สำนักงานใหญ่',
  'กฟจ.เชียงใหม่',
  'กฟจ.นครราชสีมา',
  'กฟจ.พิษณุโลก',
  'กฟจ.ขอนแก่น',
  'กฟจ.ชลบุรี',
  'กฟจ.สงขลา',
  'กฟจ.นครปฐม',
  'กฟจ.พระนครศรีอยุธยา',
  'กฟจ.สุราษฎร์ธานี',
  'กฟจ.อุบลราชธานี',
  'กฟจ.ระยอง',
];

export const VehicleManager: React.FC<VehicleManagerProps> = ({
  vehicles,
  peaBranches,
  isAdmin = false,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onStartInspection,
  onNavigateToPeaBranches,
  onNavigateToAdmin,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);

  // Form states
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    licensePlate: '',
    province: 'กรุงเทพมหานคร',
    peaBranch: (peaBranches && peaBranches[0]) || 'กฟภ. สำนักงานใหญ่',
    category: 'general' as VehicleCategory,
    vehicleType: 'pickup' as VehicleType,
    brand: '',
    model: '',
    department: 'แผนกปฏิบัติการระบบไฟฟ้า',
    lastOdometer: 0,
    fuelType: 'diesel' as FuelType,
    status: 'ready' as VehicleStatus,
    notes: '',
  });

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setEditingVehicle(null);
    setFormError('');
    setFormData({
      licensePlate: '',
      province: 'กรุงเทพมหานคร',
      peaBranch: (peaBranches && peaBranches[0]) || 'กฟภ. สำนักงานใหญ่',
      category: 'general',
      vehicleType: 'pickup',
      brand: '',
      model: '',
      department: 'แผนกปฏิบัติการระบบไฟฟ้า',
      lastOdometer: 0,
      fuelType: 'diesel',
      status: 'ready',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    if (!isAdmin) return;
    setEditingVehicle(v);
    setFormError('');
    setFormData({
      licensePlate: v.licensePlate,
      province: v.province,
      peaBranch: v.peaBranch || (peaBranches && peaBranches[0]) || 'กฟภ. สำนักงานใหญ่',
      category: v.category || 'general',
      vehicleType: v.vehicleType,
      brand: v.brand,
      model: v.model,
      department: v.department,
      lastOdometer: v.lastOdometer,
      fuelType: v.fuelType,
      status: v.status,
      notes: v.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setFormError('ผู้ใช้งานทั่วไปไม่สามารถเพิ่มหรือแก้ไขยานพาหนะได้ (เฉพาะผู้ดูแลระบบ)');
      return;
    }
    if (!formData.licensePlate.trim()) {
      setFormError('กรุณากรอกหมายเลขทะเบียนรถ');
      return;
    }

    if (editingVehicle) {
      onUpdateVehicle({
        ...editingVehicle,
        ...formData,
        lastOdometer: Number(formData.lastOdometer) || 0,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddVehicle({
        ...formData,
        lastOdometer: Number(formData.lastOdometer) || 0,
      });
    }

    setIsFormOpen(false);
  };

  const activeBranchList = peaBranches && peaBranches.length > 0 ? peaBranches : COMMON_PEA_BRANCHES;
  const availableBranches = Array.from(
    new Set([...activeBranchList, ...vehicles.map((v) => v.peaBranch || 'กฟภ. สำนักงานใหญ่')])
  );

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.province.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.peaBranch && v.peaBranch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.department.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBranch = selectedBranch === 'all' || (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === selectedBranch;
    const matchesCategory = selectedCategory === 'all' || v.category === selectedCategory;
    const matchesType = selectedType === 'all' || v.vehicleType === selectedType;
    const matchesStatus = selectedStatus === 'all' || v.status === selectedStatus;

    return matchesSearch && matchesBranch && matchesCategory && matchesType && matchesStatus;
  });

  const deletingVehicle = vehicles.find((v) => v.id === deletingVehicleId);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-blue-600" />
            ข้อมูลยานพาหนะในระบบ
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            แยกข้อมูลตามการไฟฟ้าส่วนภูมิภาค ({availableBranches.length} สังกัด) • แบ่ง 3 กลุ่มประเภทรถ ({vehicles.length} คัน)
          </p>
        </div>
        {isAdmin ? (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-xs transition-all active:scale-98 shrink-0"
          >
            <Plus className="w-4 h-4" />
            เพิ่มยานพาหนะใหม่
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>โหมดผู้ใช้งานทั่วไป (เฉพาะ Admin ที่เพิ่ม/แก้ไข/ลบรถได้)</span>
            </span>
          </div>
        )}
      </div>

      {/* Quick PEA Branch Selection Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedBranch('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            selectedBranch === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
          }`}
        >
          ทุกการไฟฟ้า ({vehicles.length})
        </button>
        {availableBranches.map((b) => {
          const count = vehicles.filter((v) => (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === b).length;
          if (count === 0 && selectedBranch !== b) return null;
          return (
            <button
              key={b}
              onClick={() => setSelectedBranch(b)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedBranch === b
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {b} ({count})
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาทะเบียน, รุ่น, สังกัด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-bold rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">⚡ ทุกการไฟฟ้า ({vehicles.length} คัน)</option>
              {availableBranches.map((branch) => {
                const count = vehicles.filter((v) => (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === branch).length;
                return (
                  <option key={branch} value={branch}>
                    {branch} ({count} คัน)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            >
              <option value="all">ทุกกลุ่มประเภทรถ (3 ประเภท)</option>
              <option value="general">1. ยานพาหนะทั่วไป</option>
              <option value="crane_truck">2. รถบรรทุกติดเครนไฮดรอลิค</option>
              <option value="bucket_truck_class_c">3. รถกระเช้า Class C</option>
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="all">ทุกประเภทย่อย</option>
              {Object.entries(VEHICLE_TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="all">ทุกสถานะความพร้อม</option>
              <option value="ready">พร้อมใช้งาน</option>
              <option value="needs_attention">มีข้อสังเกต / ต้องดูแล</option>
              <option value="maintenance">ส่งซ่อม / ระงับใช้</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedBranch !== 'all' || selectedCategory !== 'all' || selectedType !== 'all' || selectedStatus !== 'all') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>ผลการค้นหา {filteredVehicles.length} คัน จากทั้งหมด {vehicles.length} คัน</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBranch('all');
                setSelectedCategory('all');
                setSelectedType('all');
                setSelectedStatus('all');
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      {/* Vehicle Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Car className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">ไม่พบยานพาหนะที่ตรงกับเงื่อนไข</h3>
          <p className="text-sm text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;เพิ่มยานพาหนะใหม่&quot; เพื่อสร้างรายการ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((v) => {
            const statusInfo = STATUS_META[v.status] || STATUS_META.ready;
            const typeInfo = VEHICLE_TYPE_META[v.vehicleType] || VEHICLE_TYPE_META.other;
            const categoryInfo = VEHICLE_CATEGORY_META[v.category] || VEHICLE_CATEGORY_META.general;

            return (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  {/* Category Pill and Status */}
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${categoryInfo.bg}`}>
                      {categoryInfo.icon}
                      {categoryInfo.label}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* PEA Branch Badge */}
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                      <Building className="w-3 h-3 text-indigo-600" />
                      {v.peaBranch || 'กฟภ. สำนักงานใหญ่'}
                    </span>
                  </div>

                  {/* License plate */}
                  <div className="mt-2 flex items-baseline gap-2">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-base rounded-lg tracking-wider shadow-xs">
                      {v.licensePlate}
                    </div>
                    <span className="text-xs text-slate-500 font-medium">{v.province}</span>
                  </div>

                  {/* Vehicle details */}
                  <div className="mt-2">
                    <h3 className="font-bold text-slate-800 text-base">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {typeInfo.icon}
                      {typeInfo.label}
                    </p>
                  </div>

                  {/* Specs / Meta */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        สังกัด/แผนก:
                      </span>
                      <span className="font-medium text-slate-800 text-right truncate max-w-[180px]">{v.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        เลขไมล์ล่าสุด:
                      </span>
                      <span className="font-mono font-semibold text-slate-800">
                        {v.lastOdometer.toLocaleString()} กม.
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Fuel className="w-3.5 h-3.5 text-slate-400" />
                        เชื้อเพลิง:
                      </span>
                      <span className="text-slate-700">{FUEL_LABELS[v.fuelType]}</span>
                    </div>
                  </div>

                  {v.notes && (
                    <div className="mt-3 p-2 rounded-lg bg-slate-50 text-xs text-slate-600 line-clamp-2">
                      <span className="font-medium text-slate-700">หมายเหตุ:</span> {v.notes}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(v)}
                        title="แก้ไขข้อมูลรถ (เฉพาะผู้ดูแลระบบ)"
                        className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all text-xs flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        onClick={() => setDeletingVehicleId(v.id)}
                        title="ลบยานพาหนะ (เฉพาะผู้ดูแลระบบ)"
                        className="p-2 rounded-lg text-slate-600 hover:text-red-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs px-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>ดูข้อมูลเท่านั้น</span>
                    </div>
                  )}

                  <button
                    onClick={() => onStartInspection(v.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-xs transition-all active:scale-98"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>ตรวจสภาพคันนี้</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Vehicle Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                {editingVehicle ? 'แก้ไขข้อมูลยานพาหนะ' : 'เพิ่มยานพาหนะใหม่'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Primary Category Selection (3 Categories) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  กลุ่มประเภทหลักของยานพาหนะ (3 ประเภท) <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  ระบบจะใช้รายการตรวจเช็คสภาพที่ตรงตามมาตรฐานความปลอดภัยของประเภทนั้นๆ
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  {/* Category 1 */}
                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                      formData.category === 'general'
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value="general"
                      checked={formData.category === 'general'}
                      onChange={() => setFormData({ ...formData, category: 'general', vehicleType: 'pickup' })}
                      className="sr-only"
                    />
                    <Car className="w-5 h-5 mb-1 text-blue-600" />
                    <span className="text-xs">1. ทั่วไป</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">กระบะ, ตู้, เก๋ง</span>
                  </label>

                  {/* Category 2 */}
                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                      formData.category === 'crane_truck'
                        ? 'border-amber-600 bg-amber-50/70 text-amber-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value="crane_truck"
                      checked={formData.category === 'crane_truck'}
                      onChange={() => setFormData({ ...formData, category: 'crane_truck', vehicleType: 'crane_truck' })}
                      className="sr-only"
                    />
                    <Wrench className="w-5 h-5 mb-1 text-amber-600" />
                    <span className="text-xs">2. รถเครน</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">เครนไฮดรอลิค, สลิง</span>
                  </label>

                  {/* Category 3: Class C Bucket Truck */}
                  <label
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
                      formData.category === 'bucket_truck_class_c'
                        ? 'border-purple-600 bg-purple-50/70 text-purple-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value="bucket_truck_class_c"
                      checked={formData.category === 'bucket_truck_class_c'}
                      onChange={() => setFormData({ ...formData, category: 'bucket_truck_class_c', vehicleType: 'bucket_truck_class_c' })}
                      className="sr-only"
                    />
                    <Zap className="w-5 h-5 mb-1 text-purple-600" />
                    <span className="text-xs">3. กระเช้า Class C</span>
                    <span className="text-[10px] text-slate-500 font-normal mt-0.5">ฉนวนไฟฟ้า, ฮอทไลน์</span>
                  </label>
                </div>
              </div>

              {/* PEA Branch Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    การไฟฟ้าที่สังกัด (PEA Branch) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold border border-purple-200 inline-flex items-center gap-1">
                    🔒 สิทธิ์เฉพาะผู้ดูแลระบบในการเพิ่ม/ลบ
                  </span>
                </div>
                <select
                  value={formData.peaBranch}
                  onChange={(e) => setFormData({ ...formData, peaBranch: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 text-slate-800"
                >
                  {/* If vehicle has legacy branch name not in active list, retain it as option */}
                  {formData.peaBranch && !activeBranchList.includes(formData.peaBranch) && (
                    <option value={formData.peaBranch}>
                      {formData.peaBranch} (สังกัดเดิม)
                    </option>
                  )}
                  {activeBranchList.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>เลือกจากการไฟฟ้าที่ลงทะเบียนในระบบเพื่อมาตรฐานเดียวกัน</span>
                  {onNavigateToPeaBranches && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        onNavigateToPeaBranches();
                      }}
                      className="text-purple-600 hover:text-purple-800 font-semibold hover:underline"
                    >
                      จัดการรายชื่อการไฟฟ้า &rarr;
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ทะเบียนรถ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 1กข-4521 หรือ 83-9912"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    จังหวัดที่จดทะเบียน
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทยานพาหนะย่อย
                  </label>
                  <select
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as VehicleType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {Object.entries(VEHICLE_TYPE_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ประเภทเชื้อเพลิง
                  </label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as FuelType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {Object.entries(FUEL_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ยี่ห้อ (Brand)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Toyota, Isuzu, Hino"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รุ่น (Model)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Hilux Revo, D-Max, 500 Series"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สังกัด / แผนกที่ดูแล
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น แผนกปฏิบัติการระบบไฟฟ้า, แผนกฮอทไลน์"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขไมล์ล่าสุด (กิโลเมตร)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lastOdometer}
                    onChange={(e) => setFormData({ ...formData, lastOdometer: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  สถานะความพร้อมเริ่มต้น
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="ready">พร้อมใช้งาน (สมบูรณ์)</option>
                  <option value="needs_attention">มีข้อสังเกต / ต้องเฝ้าระวัง</option>
                  <option value="maintenance">ส่งซ่อม / ระงับการใช้งาน</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ / รายละเอียดอุปกรณ์ประจำรถ
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น บูมฉนวน 46kV ทดสอบ Dielectric แล้ว, ติดตั้งกระเช้าคู่, มีสายดินกราวด์ 50 sq.mm."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium shadow-xs"
                >
                  {editingVehicle ? 'บันทึกการแก้ไข' : 'เพิ่มยานพาหนะ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation Dialog for Deleting Vehicle */}
      <ConfirmModal
        isOpen={!!deletingVehicleId}
        title="ยืนยันการลบข้อมูลยานพาหนะ"
        message={
          deletingVehicle
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบยานพาหนะ ทะเบียน "${deletingVehicle.licensePlate} (${deletingVehicle.brand} ${deletingVehicle.model})"?\n\nการกระทำนี้จะลบข้อมูลรถออกจากระบบ และไม่สามารถย้อนกลับได้`
            : ''
        }
        confirmLabel="ลบยานพาหนะ"
        cancelLabel="ยกเลิก"
        isDestructive={true}
        onConfirm={() => {
          if (deletingVehicleId && isAdmin) {
            onDeleteVehicle(deletingVehicleId);
            setDeletingVehicleId(null);
          }
        }}
        onCancel={() => setDeletingVehicleId(null)}
      />
    </div>
  );
};
