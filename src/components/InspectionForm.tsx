import React, { useState, useEffect, useId } from 'react';
import { 
  ClipboardCheck, 
  Car, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Send, 
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  FileSpreadsheet,
  Wrench,
  Layers,
  Zap
} from 'lucide-react';
import { 
  Vehicle, 
  InspectionItem, 
  OverallStatus, 
  CheckStatus, 
  InspectionRecord,
  ChecklistTemplatesState,
  VehicleCategory
} from '../types/vehicle';
import { ConfirmModal } from './ConfirmModal';

interface InspectionFormProps {
  vehicles: Vehicle[];
  checklistTemplates: ChecklistTemplatesState;
  preselectedVehicleId?: string | null;
  isSheetsConnected: boolean;
  onSaveInspection: (record: Omit<InspectionRecord, 'id' | 'createdAt'>) => Promise<void>;
  onViewHistory: (vehicleId?: string) => void;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({
  vehicles,
  checklistTemplates,
  preselectedVehicleId,
  isSheetsConnected,
  onSaveInspection,
  onViewHistory,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    preselectedVehicleId || (vehicles[0]?.id || '')
  );

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const activeCategory: VehicleCategory = selectedVehicle?.category || 'general';

  const [odometer, setOdometer] = useState<number>(selectedVehicle?.lastOdometer || 0);
  const [inspectorName, setInspectorName] = useState<string>('');
  const [inspectorPhone, setInspectorPhone] = useState<string>('');
  const [workDescription, setWorkDescription] = useState<string>('');
  const [overallStatus, setOverallStatus] = useState<OverallStatus>('ready');
  const [summaryRemarks, setSummaryRemarks] = useState<string>('');

  const vehicleSelectId = useId();
  const odometerInputId = useId();
  const inspectorNameInputId = useId();
  const inspectorPhoneInputId = useId();
  const workDescriptionInputId = useId();
  const summaryRemarksInputId = useId();

  // Active checklist templates for this vehicle's category
  const getTemplateForCategory = (cat: VehicleCategory) => {
    if (cat === 'crane_truck') return checklistTemplates.crane_truck || [];
    if (cat === 'bucket_truck_class_c') return checklistTemplates.bucket_truck_class_c || [];
    return checklistTemplates.general || [];
  };

  const activeTemplateCategories = getTemplateForCategory(activeCategory);

  // Initialize/repopulate checklist items when vehicle category changes
  const [items, setItems] = useState<InspectionItem[]>([]);

  useEffect(() => {
    const templateCats = getTemplateForCategory(activeCategory);

    setItems(
      templateCats.flatMap((cat) =>
        cat.items.map((item) => ({
          id: item.id,
          category: cat.category,
          title: item.title,
          description: item.description,
          status: 'pass' as CheckStatus,
          remark: '',
        }))
      )
    );
  }, [activeCategory, checklistTemplates]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRecordId, setSubmittedRecordId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [showOdoConfirm, setShowOdoConfirm] = useState(false);

  // Sync odometer when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      setOdometer(selectedVehicle.lastOdometer || 0);
    }
  }, [selectedVehicleId, selectedVehicle]);

  // If preselectedVehicleId changes externally
  useEffect(() => {
    if (preselectedVehicleId) {
      setSelectedVehicleId(preselectedVehicleId);
    }
  }, [preselectedVehicleId]);

  // Update item status
  const handleItemStatusChange = (itemId: string, status: CheckStatus) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            status,
            remark: status === 'pass' || status === 'na' ? '' : item.remark,
          };
        }
        return item;
      })
    );
  };

  const handleItemRemarkChange = (itemId: string, remark: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, remark } : item))
    );
  };

  // Quick mark all pass
  const handleMarkAllPass = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'pass',
        remark: '',
      }))
    );
    setOverallStatus('ready');
  };

  // Count metrics
  const passCount = items.filter((i) => i.status === 'pass').length;
  const failCount = items.filter((i) => i.status === 'fail').length;
  const naCount = items.filter((i) => i.status === 'na').length;
  const totalItems = items.length;

  // Auto-suggest overall status when failCount changes
  useEffect(() => {
    if (failCount === 0) {
      setOverallStatus('ready');
    } else if (failCount <= 2) {
      setOverallStatus('conditional');
    } else {
      setOverallStatus('not_ready');
    }
  }, [failCount]);

  const executeSaveInspection = async () => {
    if (!selectedVehicle) return;
    setIsSubmitting(true);
    setFormError('');
    try {
      await onSaveInspection({
        vehicleId: selectedVehicle.id,
        vehicleLicensePlate: selectedVehicle.licensePlate,
        vehicleCategory: selectedVehicle.category,
        vehicleType: selectedVehicle.vehicleType,
        brand: selectedVehicle.brand,
        model: selectedVehicle.model,
        department: selectedVehicle.department,
        inspectionDate: new Date().toISOString(),
        odometer: Number(odometer) || 0,
        inspectorName: inspectorName.trim(),
        inspectorPhone: inspectorPhone.trim(),
        workDescription: workDescription.trim(),
        items,
        overallStatus,
        summaryRemarks: summaryRemarks.trim(),
        syncedToSheets: isSheetsConnected,
      });

      setSubmittedRecordId(selectedVehicle.id);
    } catch (err: any) {
      console.error('Inspection submit error:', err);
      setFormError(`เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${err?.message || 'โปรดลองใหม่อีกครั้ง'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedVehicle) {
      setFormError('กรุณาเลือกยานพาหนะ');
      return;
    }
    if (!inspectorName.trim()) {
      setFormError('กรุณาระบุชื่อผู้ตรวจสอบ / พนักงานขับรถ');
      return;
    }

    if (odometer < selectedVehicle.lastOdometer) {
      setShowOdoConfirm(true);
      return;
    }

    await executeSaveInspection();
  };

  // Reset form for new inspection
  const handleResetForNew = () => {
    setSubmittedRecordId(null);
    handleMarkAllPass();
    setSummaryRemarks('');
    setWorkDescription('');
  };

  if (submittedRecordId && selectedVehicle) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-2xl mx-auto shadow-sm animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">บันทึกผลการตรวจสภาพเรียบร้อยแล้ว</h2>
        <p className="text-slate-600 mt-2 text-sm">
          ยานพาหนะทะเบียน <span className="font-bold text-slate-800">{selectedVehicle.licensePlate}</span> ({selectedVehicle.brand} {selectedVehicle.model})
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-slate-50 text-slate-700">
          {selectedVehicle.category === 'bucket_truck_class_c' ? (
            <>
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <span>ประเภท: 3. รถกระเช้า Class C (ฮอทไลน์ / ฉนวนไฟฟ้า)</span>
            </>
          ) : selectedVehicle.category === 'crane_truck' ? (
            <>
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>ประเภท: 2. รถบรรทุกติดเครนไฮดรอลิค</span>
            </>
          ) : (
            <>
              <Car className="w-3.5 h-3.5 text-blue-600" />
              <span>ประเภท: 1. ยานพาหนะทั่วไป</span>
            </>
          )}
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-3 gap-3 text-center">
          <div className="p-2">
            <span className="text-xs text-slate-500 block">ผลการตรวจ</span>
            <span className={`text-sm font-bold ${overallStatus === 'ready' ? 'text-emerald-600' : overallStatus === 'conditional' ? 'text-amber-600' : 'text-rose-600'}`}>
              {overallStatus === 'ready' ? '🟢 พร้อมใช้งาน' : overallStatus === 'conditional' ? '🟡 มีข้อสังเกต' : '🔴 ห้ามปฏิบัติงาน'}
            </span>
          </div>
          <div className="p-2 border-x border-slate-200">
            <span className="text-xs text-slate-500 block">เลขไมล์บันทึก</span>
            <span className="text-sm font-mono font-bold text-slate-800">{Number(odometer).toLocaleString()} กม.</span>
          </div>
          <div className="p-2">
            <span className="text-xs text-slate-500 block">Google Sheets</span>
            <span className="text-sm font-medium flex items-center justify-center gap-1 text-slate-700">
              {isSheetsConnected ? (
                <>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600 text-xs font-semibold">ซิงค์แล้ว</span>
                </>
              ) : (
                <span className="text-slate-400 text-xs">เก็บในเครื่อง</span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleResetForNew}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all"
          >
            ตรวจเช็คคันต่อไป
          </button>
          <button
            onClick={() => onViewHistory(selectedVehicle.id)}
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-all"
          >
            ดูประวัติการตรวจเช็คของคันนี้
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner / Selection */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              แบบฟอร์มตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              ระบบสลับรายการตรวจเช็คอัตโนมัติตามประเภทรถ (1. ยานพาหนะทั่วไป / 2. รถบรรทุกติดเครนไฮดรอลิค)
            </p>
          </div>

          <button
            type="button"
            onClick={handleMarkAllPass}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition-all self-start sm:self-auto"
            title="ตั้งค่าทุกข้อเป็น ผ่าน (ปกติ)"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            ผ่านทั้งหมด (Fast Pass)
          </button>
        </div>

        {/* Vehicle Selection & Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div>
            <label htmlFor={vehicleSelectId} className="block text-xs font-semibold text-slate-700 mb-1">
              เลือกยานพาหนะที่ต้องการตรวจ <span className="text-red-500">*</span>
            </label>
            <select
              id={vehicleSelectId}
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} ({v.brand} {v.model}) - {v.category === 'bucket_truck_class_c' ? '[กระเช้า Class C]' : v.category === 'crane_truck' ? '[รถเครน]' : '[ทั่วไป]'}
                </option>
              ))}
            </select>
            {selectedVehicle && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                สังกัด: {selectedVehicle.department}
              </span>
            )}
          </div>

          <div>
            <label htmlFor={odometerInputId} className="block text-xs font-semibold text-slate-700 mb-1">
              เลขไมล์ก่อนออกปฏิบัติงาน (กม.) <span className="text-red-500">*</span>
            </label>
            <input
              id={odometerInputId}
              type="number"
              min="0"
              required
              value={odometer}
              onChange={(e) => setOdometer(Number(e.target.value))}
              className="w-full px-3 py-2 font-mono font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {selectedVehicle && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                เลขไมล์ครั้งก่อน: {selectedVehicle.lastOdometer.toLocaleString()} กม.
              </span>
            )}
          </div>

          <div>
            <label htmlFor={inspectorNameInputId} className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อผู้ตรวจสอบ / พนักงานขับรถ <span className="text-red-500">*</span>
            </label>
            <input
              id={inspectorNameInputId}
              type="text"
              required
              placeholder="เช่น นายสมชาย ใจมั่น"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label htmlFor={inspectorPhoneInputId} className="block text-xs font-semibold text-slate-700 mb-1">
              เบอร์โทรศัพท์ติดต่อฉุกเฉิน
            </label>
            <input
              id={inspectorPhoneInputId}
              type="tel"
              placeholder="เช่น 081-234-5678"
              value={inspectorPhone}
              onChange={(e) => setInspectorPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor={workDescriptionInputId} className="block text-xs font-semibold text-slate-700 mb-1">
              ลักษณะงาน / ภารกิจที่ปฏิบัติ
            </label>
            <input
              id={workDescriptionInputId}
              type="text"
              placeholder="เช่น ออกตรวจแก้กระแสไฟฟ้าขัดข้อง, งานยกหม้อแปลง/ปักเสา"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Applied Checklist Type Notice */}
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            activeCategory === 'bucket_truck_class_c'
              ? 'bg-purple-50/80 border-purple-200 text-purple-900'
              : activeCategory === 'crane_truck'
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-blue-50/70 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {activeCategory === 'bucket_truck_class_c' ? (
              <Zap className="w-4 h-4 text-purple-600 shrink-0" />
            ) : activeCategory === 'crane_truck' ? (
              <Wrench className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Car className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>
              กำลังใช้ชุดรายการตรวจ: <strong>{
                activeCategory === 'bucket_truck_class_c'
                  ? '3. รถกระเช้า Class C (ฮอทไลน์ / ฉนวนไฟฟ้า)'
                  : activeCategory === 'crane_truck'
                  ? '2. รถบรรทุกติดเครนไฮดรอลิค'
                  : '1. ยานพาหนะทั่วไป'
              }</strong> (รวม {items.length} รายการตรวจ)
            </span>
          </div>

          <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
            {activeTemplateCategories.length} หมวดหมู่
          </span>
        </div>
      </div>

      {/* Progress & Summary Bar */}
      <div className="sticky top-2 z-20 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold">ความคืบหน้าการตรวจ</span>
          </div>
          <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
            {passCount + failCount + naCount} / {totalItems} ข้อ
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-400 font-medium">✓ ผ่าน: {passCount}</span>
          {failCount > 0 && (
            <span className="text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/50">
              ✕ ผิดปกติ: {failCount}
            </span>
          )}
          {naCount > 0 && <span className="text-slate-400 hidden sm:inline">- N/A: {naCount}</span>}
        </div>
      </div>

      {/* Categorized Checklist Items */}
      <div className="space-y-6">
        {activeTemplateCategories.map((categoryGroup, groupIdx) => {
          const categoryItems = items.filter((i) => i.category === categoryGroup.category);
          const groupFailCount = categoryItems.filter((i) => i.status === 'fail').length;

          return (
            <div
              key={groupIdx}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-all"
            >
              {/* Category Header */}
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeCategory === 'crane_truck' ? 'bg-amber-600' : 'bg-blue-600'}`} />
                  {categoryGroup.category}
                </h3>
                {groupFailCount > 0 ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                    พบข้อบกพร่อง {groupFailCount} รายการ
                  </span>
                ) : (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    ปกติครบทุกข้อ
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-100">
                {categoryItems.map((item) => {
                  const isFail = item.status === 'fail';
                  const isPass = item.status === 'pass';
                  const isNa = item.status === 'na';

                  return (
                    <div
                      key={item.id}
                      className={`p-4 transition-colors ${
                        isFail ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 pr-2">
                          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* 3-State Radio Options */}
                        <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                          {/* Pass */}
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'pass')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                              isPass
                                ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ปกติ
                          </button>

                          {/* Fail */}
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'fail')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                              isFail
                                ? 'bg-rose-600 text-white shadow-xs font-semibold animate-pulse'
                                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            ชำรุด / ผิดปกติ
                          </button>

                          {/* NA */}
                          <button
                            type="button"
                            onClick={() => handleItemStatusChange(item.id, 'na')}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                              isNa
                                ? 'bg-slate-700 text-white font-semibold'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="ไม่มีในรถคันนี้ / ไม่เกี่ยวข้อง"
                          >
                            N/A
                          </button>
                        </div>
                      </div>

                      {/* Expandable Remark Input if Fail */}
                      {isFail && (
                        <div className="mt-3 pt-3 border-t border-rose-200/60 animate-in fade-in duration-150">
                          <label className="block text-xs font-semibold text-rose-700 mb-1">
                            ⚠️ ระบุรายละเอียดข้อบกพร่องที่พบ ({item.title}):
                          </label>
                          <input
                            type="text"
                            placeholder="เช่น ซีลไฮดรอลิกรั่ว, สลิงแตกเกลียว, ปากล็อกตะขอไม่สปริง..."
                            value={item.remark || ''}
                            onChange={(e) => handleItemRemarkChange(item.id, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            required
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Safety Evaluation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          การประเมินผลความพร้อมของยานพาหนะก่อนออกปฏิบัติงาน
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Ready */}
          <label
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
              overallStatus === 'ready'
                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="overallStatus"
              value="ready"
              checked={overallStatus === 'ready'}
              onChange={() => setOverallStatus('ready')}
              className="sr-only"
            />
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">พร้อมใช้งาน (Pass)</span>
            <span className="text-xs text-slate-500 mt-1">
              สภาพสมบูรณ์ ปลอดภัยตามมาตรฐานทุกประการ
            </span>
          </label>

          {/* Conditional */}
          <label
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
              overallStatus === 'conditional'
                ? 'border-amber-500 bg-amber-50/70 text-amber-900 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="overallStatus"
              value="conditional"
              checked={overallStatus === 'conditional'}
              onChange={() => setOverallStatus('conditional')}
              className="sr-only"
            />
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">พร้อมใช้งานแบบมีข้อสังเกต</span>
            <span className="text-xs text-slate-500 mt-1">
              ใช้งานได้ชั่วคราว มีจุดต้องเฝ้าระวังหรือสั่งซ่อมในวัน
            </span>
          </label>

          {/* Not Ready */}
          <label
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center ${
              overallStatus === 'not_ready'
                ? 'border-rose-500 bg-rose-50/70 text-rose-900 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <input
              type="radio"
              name="overallStatus"
              value="not_ready"
              checked={overallStatus === 'not_ready'}
              onChange={() => setOverallStatus('not_ready')}
              className="sr-only"
            />
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
              <XCircle className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">ไม่พร้อมใช้งาน (ห้ามขับ/ห้ามยก)</span>
            <span className="text-xs text-slate-500 mt-1">
              มีข้อบกพร่องร้ายแรงต่อความปลอดภัย ต้องส่งซ่อมทันที
            </span>
          </label>
        </div>

        <div>
          <label htmlFor={summaryRemarksInputId} className="block text-xs font-semibold text-slate-700 mb-1">
            ความเห็นเพิ่มเติม / สรุปสั่งการซ่อมบำรุง
          </label>
          <textarea
            id={summaryRemarksInputId}
            rows={2}
            placeholder="เช่น ตรวจระดับน้ำมันไฮดรอลิกเรียบร้อย, นัดช่างตรวจซีลกระบอกยกสัปดาห์หน้า..."
            value={summaryRemarks}
            onChange={(e) => setSummaryRemarks(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Form Error Banner */}
      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs sm:text-sm text-rose-800 flex items-center gap-2.5 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isSheetsConnected ? (
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <FileSpreadsheet className="w-4 h-4" />
              เชื่อมต่อ Google Sheets แล้ว (จะบันทึกผลลงชีตตามหมวดหมู่โดยอัตโนมัติ)
            </span>
          ) : (
            <span className="text-slate-500 flex items-center gap-1">
              <Info className="w-4 h-4 text-blue-500" />
              ข้อมูลจะถูกบันทึกในฐานข้อมูลระบบ และสามารถซิงค์ไป Google Sheets ได้ทุกเมื่อ
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 transition-all disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              กำลังบันทึกข้อมูล...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              บันทึกผลการตรวจเช็คสภาพรถ
            </>
          )}
        </button>
      </div>

      {/* Confirm Low Odometer Modal */}
      {selectedVehicle && (
        <ConfirmModal
          isOpen={showOdoConfirm}
          title="ยืนยันเลขไมล์ที่ระบุ"
          message={`เลขไมล์ที่ระบุ (${odometer.toLocaleString()} กม.) มีค่าน้อยกว่าเลขไมล์ล่าสุด (${selectedVehicle.lastOdometer.toLocaleString()} กม.)\n\nคุณต้องการบันทึกผลการตรวจสอบด้วยเลขไมล์นี้ต่อหรือไม่?`}
          confirmLabel="บันทึกต่อ"
          cancelLabel="กลับไปแก้ไขเลขไมล์"
          isDestructive={false}
          onConfirm={() => {
            setShowOdoConfirm(false);
            executeSaveInspection();
          }}
          onCancel={() => setShowOdoConfirm(false)}
        />
      )}
    </form>
  );
};
