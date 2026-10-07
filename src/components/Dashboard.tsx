import React, { useState } from 'react';
import { 
  Car, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  ClipboardCheck, 
  ShieldCheck, 
  Calendar, 
  ArrowRight, 
  FileSpreadsheet, 
  Clock, 
  Zap, 
  Copy, 
  Check, 
  BellRing, 
  AlertCircle,
  ExternalLink 
} from 'lucide-react';
import { Vehicle, InspectionRecord } from '../types/vehicle';
import { SpreadsheetInfo } from '../services/googleSheets';
import { VEHICLE_CATEGORY_META } from './VehicleManager';

interface DashboardProps {
  vehicles: Vehicle[];
  inspections: InspectionRecord[];
  onStartInspection: (vehicleId?: string) => void;
  onNavigateToTab: (tab: 'inspect' | 'vehicles' | 'history' | 'sheets' | 'admin') => void;
  isSheetsConnected: boolean;
  spreadsheetInfo?: SpreadsheetInfo | null;
  onOpenSheets?: () => void;
  onConnectSheets?: () => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  vehicles,
  inspections,
  onStartInspection,
  onNavigateToTab,
  isSheetsConnected,
  spreadsheetInfo,
  onOpenSheets,
  onConnectSheets,
}) => {
  const [copiedDailyAlert, setCopiedDailyAlert] = useState(false);

  const readyVehicles = vehicles.filter((v) => v.status === 'ready');
  const attentionVehicles = vehicles.filter((v) => v.status === 'needs_attention');
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance');

  const generalVehiclesCount = vehicles.filter((v) => v.category === 'general').length;
  const craneVehiclesCount = vehicles.filter((v) => v.category === 'crane_truck').length;
  const bucketVehiclesCount = vehicles.filter((v) => v.category === 'bucket_truck_class_c').length;

  const readinessPercent = vehicles.length
    ? Math.round((readyVehicles.length / vehicles.length) * 100)
    : 100;

  // Inspections today (using local date string YYYY-MM-DD)
  const todayDateObj = new Date();
  const todayStr = todayDateObj.toISOString().split('T')[0];
  
  // Set of vehicle IDs inspected today
  const inspectedTodayRecords = inspections.filter((i) => i.inspectionDate.startsWith(todayStr));
  const inspectedVehicleIdsToday = new Set(inspectedTodayRecords.map((i) => i.vehicleId));

  // Vehicles that have NOT been inspected today (excluding those in maintenance)
  const pendingVehiclesToday = vehicles.filter(
    (v) => !inspectedVehicleIdsToday.has(v.id) && v.status !== 'maintenance'
  );

  // Vehicles that HAVE been inspected today
  const completedVehiclesToday = vehicles.filter((v) => inspectedVehicleIdsToday.has(v.id));

  const recentInspections = [...inspections]
    .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime())
    .slice(0, 5);

  const formattedTodayDate = todayDateObj.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Handler to copy the daily uninspected list for LINE or dispatcher sharing
  const handleCopyPendingList = () => {
    if (pendingVehiclesToday.length === 0) return;
    const textLines = [
      `📢 สรุปรายชื่อยานพาหนะที่ "ยังไม่ได้ตรวจสภาพก่อนปฏิบัติงาน" ประจำวัน:`,
      `📅 วันที่: ${formattedTodayDate}`,
      `⚠️ ค้างตรวจทั้งหมด: ${pendingVehiclesToday.length} คัน (จาก ${vehicles.length} คัน)`,
      `----------------------------------------`,
      ...pendingVehiclesToday.map((v, i) => {
        const catName =
          v.category === 'bucket_truck_class_c'
            ? 'รถกระเช้า Class C'
            : v.category === 'crane_truck'
            ? 'รถบรรทุกติดเครน'
            : 'ทั่วไป';
        return `${i + 1}. ทะเบียน ${v.licensePlate} (${v.brand} ${v.model}) [${catName}] - ${v.department}`;
      }),
      `----------------------------------------`,
      `*กรุณาตรวจสภาพรถตามแบบฟอร์มก่อนนำรถออกปฏิบัติงาน เพื่อความปลอดภัยสูงสุด*`,
    ];

    navigator.clipboard.writeText(textLines.join('\n'));
    setCopiedDailyAlert(true);
    setTimeout(() => setCopiedDailyAlert(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Daily Audit Notification Banner */}
      {pendingVehiclesToday.length > 0 ? (
        <div className="bg-amber-500/10 border-2 border-amber-400/80 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-amber-950 text-base">
                  แจ้งเตือนประจำวัน: วันนี้มียานพาหนะที่ &quot;ยังไม่ได้ตรวจสภาพ&quot; {pendingVehiclesToday.length} คัน
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-bold">
                  {formattedTodayDate}
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-1">
                ตรวจแล้ว {completedVehiclesToday.length} คัน • ยังไม่ได้ตรวจ {pendingVehiclesToday.length} คัน — กรุณาตรวจสภาพความปลอดภัยก่อนออกปฏิบัติงาน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={handleCopyPendingList}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="คัดลอกข้อความสรุปเพื่อส่งแจ้งเตือนในกลุ่ม LINE"
            >
              {copiedDailyAlert ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
              <span>{copiedDailyAlert ? 'คัดลอกแล้ว!' : 'คัดลอกรายชื่อส่ง LINE'}</span>
            </button>

            {pendingVehiclesToday[0] && (
              <button
                onClick={() => onStartInspection(pendingVehiclesToday[0].id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition-all"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>ตรวจคันแรกทันที ({pendingVehiclesToday[0].licensePlate})</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border-2 border-emerald-400/80 rounded-3xl p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-emerald-950 text-base">
                ยอดเยี่ยม! วันนี้ยานพาหนะทุกคันได้รับการตรวจสภาพเรียบร้อยแล้ว (100% Inspected)
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                ประจำวันที่ {formattedTodayDate} • ครบทุกคันในกองยานพาหนะ พร้อมปฏิบัติงานด้วยความปลอดภัย
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full text-blue-200 text-xs font-semibold mb-3 border border-blue-400/20">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            ระบบความปลอดภัยและตรวจสภาพยานพาหนะก่อนปฏิบัติงาน (3 ประเภท)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ศูนย์ควบคุมความพร้อมยานพาหนะ
          </h1>
          <p className="mt-2 text-sm text-blue-100/80 leading-relaxed">
            ระบบตรวจเช็คสภาพยานพาหนะประจำวัน แบ่งเป็น 3 ประเภท: ทั่วไป, รถเครน และรถกระเช้า Class C พร้อมบันทึกประวัติและซิงค์ Google Sheets
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onStartInspection()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-98"
            >
              <ClipboardCheck className="w-4 h-4" />
              เริ่มตรวจเช็คสภาพรถตอนนี้
            </button>

            <button
              onClick={() => onNavigateToTab('admin')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-semibold text-sm rounded-xl backdrop-blur-md transition-all border border-white/20"
            >
              <Wrench className="w-4 h-4 text-amber-300" />
              หน้าผู้ดูแลระบบ (Login เข้าจัดการ)
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-10 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* 3 Categories Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category 1: General */}
        <div className="bg-blue-50/70 border border-blue-200/80 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">ประเภทที่ 1</span>
              <h4 className="font-bold text-slate-900 text-sm">ยานพาหนะทั่วไป</h4>
              <p className="text-[11px] text-slate-500">กระบะ, ตู้, เก๋ง, ตรวจการ</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-blue-700">{generalVehiclesCount}</span>
            <span className="text-[10px] text-slate-500 block">คัน</span>
          </div>
        </div>

        {/* Category 2: Hydraulic Crane Truck */}
        <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">ประเภทที่ 2</span>
              <h4 className="font-bold text-slate-900 text-sm">รถบรรทุกติดเครน</h4>
              <p className="text-[11px] text-slate-500">ขาค้ำยัน, บูมเครน, สลิง, Overload</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-amber-700">{craneVehiclesCount}</span>
            <span className="text-[10px] text-slate-500 block">คัน</span>
          </div>
        </div>

        {/* Category 3: Class C Bucket Truck */}
        <div className="bg-purple-50/70 border border-purple-200/80 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block">ประเภทที่ 3</span>
              <h4 className="font-bold text-slate-900 text-sm">รถกระเช้า Class C</h4>
              <p className="text-[11px] text-slate-500">ฉนวนไฟฟ้า, ฮอทไลน์ 22-33kV</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-purple-700">{bucketVehiclesCount}</span>
            <span className="text-[10px] text-slate-500 block">คัน</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">ยานพาหนะทั้งหมด</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{vehicles.length}</span>
            <span className="text-xs text-slate-500">คันในระบบ</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
            <span>ความพร้อมใช้งาน:</span>
            <strong className="text-slate-800">{readinessPercent}%</strong>
          </div>
        </div>

        {/* Ready */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">พร้อมปฏิบัติงาน</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{readyVehicles.length}</span>
            <span className="text-xs text-slate-500">คัน</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            สภาพสมบูรณ์ ผ่านการตรวจเช็ค
          </div>
        </div>

        {/* Attention */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">มีข้อสังเกต</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-600">{attentionVehicles.length}</span>
            <span className="text-xs text-slate-500">คัน</span>
          </div>
          <div className="mt-2 text-xs text-amber-700 font-medium">
            ต้องเฝ้าระวัง / นัดคิวซ่อม
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">ส่งซ่อม / ห้ามใช้</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">{maintenanceVehicles.length}</span>
            <span className="text-xs text-slate-500">คัน</span>
          </div>
          <div className="mt-2 text-xs text-rose-600 font-medium">
            อยู่ระหว่างซ่อมแซม
          </div>
        </div>
      </div>

      {/* Daily Inspection Audit Section (สรุปแต่ละวันว่าวันนี้รถคันไหนไม่ได้ตรวจสภาพบ้าง) */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="font-black text-slate-900 text-base">
                สรุปผลการตรวจสภาพยานพาหนะประจำวัน ({formattedTodayDate})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ตรวจสอบสถานะยานพาหนะที่ตรวจแล้ว และรายชื่อรถที่ยังไม่ได้ตรวจสภาพก่อนปฏิบัติงาน
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold">
              ✓ ตรวจแล้ว: {completedVehiclesToday.length} คัน
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
              pendingVehiclesToday.length > 0 
                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              ⚠️ ยังไม่ได้ตรวจ: {pendingVehiclesToday.length} คัน
            </span>
          </div>
        </div>

        {/* Detailed List of Uninspected Vehicles Today */}
        {pendingVehiclesToday.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-900">
              รถทุกคันผ่านการตรวจเช็คสภาพก่อนออกงานประจำวันแล้ว
            </h4>
            <p className="text-xs text-emerald-700">
              ไม่มีรถค้างตรวจในระบบสำหรับวันนี้ ยานพาหนะทุกคันพร้อมปฏิบัติงานอย่างปลอดภัย
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
              <span>รายชื่อยานพาหนะที่ยังไม่ได้ตรวจสภาพวันนี้ ({pendingVehiclesToday.length} คัน):</span>
              <button
                onClick={handleCopyPendingList}
                className="text-blue-600 hover:underline flex items-center gap-1 font-bold"
              >
                <Copy className="w-3.5 h-3.5" />
                คัดลอกรายชื่อไปส่งไลน์
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingVehiclesToday.map((v) => {
                const catMeta = VEHICLE_CATEGORY_META[v.category] || VEHICLE_CATEGORY_META.general;
                return (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/90 transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                          {v.licensePlate}
                        </span>
                        <span className="font-bold text-xs text-slate-800 truncate">
                          {v.brand} {v.model}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catMeta.bg}`}>
                          {catMeta.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">
                        สังกัด: {v.department} • ไมล์ล่าสุด: {v.lastOdometer.toLocaleString()} กม.
                      </div>
                    </div>

                    <button
                      onClick={() => onStartInspection(v.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-all active:scale-98"
                    >
                      ตรวจสภาพคันนี้
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Section: Pending vs Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Status summary */}
        <div className="lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                สถานะการตรวจภาพรวม
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {inspectedVehicleIdsToday.size} / {vehicles.length} คัน
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-slate-600">ยานพาหนะพร้อมตรวจทั้งหมด:</span>
                <span className="font-bold text-slate-900">{vehicles.length} คัน</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-emerald-800">
                <span>ตรวจสภาพแล้ววันนี้:</span>
                <span className="font-bold">{completedVehiclesToday.length} คัน</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between text-amber-800">
                <span>ยังไม่ได้ตรวจวันนี้:</span>
                <span className="font-bold">{pendingVehiclesToday.length} คัน</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-center justify-between text-rose-800">
                <span>รถที่ส่งซ่อม/ระงับใช้:</span>
                <span className="font-bold">{maintenanceVehicles.length} คัน</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigateToTab('vehicles')}
              className="text-xs font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              ดูรายการยานพาหนะทั้งหมด
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Recent Inspections Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-600" />
                การตรวจสภาพล่าสุด (Recent Inspections)
              </h3>
              <button
                onClick={() => onNavigateToTab('history')}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                ดูประวัติทั้งหมด ({inspections.length})
              </button>
            </div>

            {recentInspections.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-600">ยังไม่มีบันทึกการตรวจเช็ค</h4>
                <p className="text-xs text-slate-500 mt-1">
                  กดปุ่ม &quot;เริ่มตรวจเช็คสภาพรถ&quot; เพื่อบันทึกผลการตรวจสอบครั้งแรก
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentInspections.map((rec) => {
                  const date = new Date(rec.inspectionDate);
                  const catMeta = VEHICLE_CATEGORY_META[rec.vehicleCategory] || VEHICLE_CATEGORY_META.general;

                  return (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            rec.overallStatus === 'ready'
                              ? 'bg-emerald-100 text-emerald-700'
                              : rec.overallStatus === 'conditional'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {rec.overallStatus === 'ready' ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              {rec.vehicleLicensePlate}
                            </span>
                            <span className="text-xs text-slate-600 truncate">
                              ({rec.brand} {rec.model})
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${catMeta.bg}`}>
                              {catMeta.badgeLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ผู้ตรวจ: {rec.inspectorName} • เลขไมล์ {rec.odometer.toLocaleString()} กม.
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            rec.overallStatus === 'ready'
                              ? 'bg-emerald-50 text-emerald-700'
                              : rec.overallStatus === 'conditional'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {rec.overallStatus === 'ready'
                            ? 'ผ่าน'
                            : rec.overallStatus === 'conditional'
                            ? 'มีข้อสังเกต'
                            : 'ห้ามใช้'}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' })}{' '}
                          {date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Google Sheets Status in Dashboard */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-slate-500">Google Sheets:</span>
              {isSheetsConnected ? (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ลิงก์อัตโนมัติ (บันทึกลงชีตทันที ไม่ต้องกดซิงค์)</span>
                </span>
              ) : (
                <span className="text-slate-600 font-medium">ยังไม่ได้เชื่อมต่อ</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSheetsConnected && onOpenSheets && (
                <button
                  onClick={onOpenSheets}
                  className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                >
                  <span>เปิดสเปรดชีต</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
              {!isSheetsConnected && onConnectSheets && (
                <button
                  onClick={onConnectSheets}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  เชื่อมต่อ Google Sheets (คลิกครั้งเดียว)
                </button>
              )}
              <button
                onClick={() => onNavigateToTab('sheets')}
                className="text-blue-600 font-semibold hover:underline"
              >
                จัดการการเชื่อมต่อ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
