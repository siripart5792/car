/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Car, 
  ClipboardCheck, 
  History, 
  LayoutDashboard, 
  FileSpreadsheet, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw,
  Settings,
  Wrench,
  Menu,
  X
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  Vehicle, 
  InspectionRecord, 
  VehicleStatus, 
  ChecklistTemplatesState 
} from './types/vehicle';
import { 
  loadVehicles, 
  saveVehicles, 
  loadInspections, 
  saveInspections,
  loadChecklistTemplates,
  saveChecklistTemplates,
  resetChecklistTemplatesToDefault
} from './services/storage';
import { 
  initAuth, 
  googleSignIn, 
  logout 
} from './services/auth';
import { 
  getOrCreateSpreadsheet, 
  syncVehiclesToSheet, 
  syncAllInspectionsToSheet, 
  appendInspectionToSheet, 
  SpreadsheetInfo 
} from './services/googleSheets';

import { Dashboard } from './components/Dashboard';
import { VehicleManager } from './components/VehicleManager';
import { InspectionForm } from './components/InspectionForm';
import { InspectionHistory } from './components/InspectionHistory';
import { GoogleSheetsPanel } from './components/GoogleSheetsPanel';
import { AdminPanel } from './components/AdminPanel';

type TabType = 'dashboard' | 'inspect' | 'vehicles' | 'history' | 'admin' | 'sheets';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadVehicles());
  const [inspections, setInspections] = useState<InspectionRecord[]>(() => loadInspections());
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplatesState>(() => loadChecklistTemplates());

  // Cross-component navigation state
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | null>(null);
  const [historyFilterVehicleId, setHistoryFilterVehicleId] = useState<string | null>(null);

  // Auth & Google Sheets state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast / notification feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // 1. Initialize Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      async (authedUser, token) => {
        setUser(authedUser);
        setAccessToken(token);
        try {
          const sheet = await getOrCreateSpreadsheet(token);
          setSpreadsheetInfo(sheet);
        } catch (err) {
          console.error('Failed to auto-fetch spreadsheet:', err);
        }
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setSpreadsheetInfo(null);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. Google Sign-In Handler
  const handleGoogleLogin = async () => {
    setIsConnecting(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast('เข้าสู่ระบบสำเร็จ เชื่อมต่อ Google Workspace เรียบร้อยแล้ว', 'success');

        // Create or get spreadsheet
        try {
          const sheet = await getOrCreateSpreadsheet(result.accessToken);
          setSpreadsheetInfo(sheet);
          // Initial sync of existing data
          await syncVehiclesToSheet(result.accessToken, sheet.id, vehicles);
          await syncAllInspectionsToSheet(result.accessToken, sheet.id, inspections);
          showToast(`ซิงค์ข้อมูลกับ Google Sheet "${sheet.title}" เรียบร้อยแล้ว`, 'success');
        } catch (sheetErr: any) {
          console.error('Sheet setup error:', sheetErr);
          showToast(`เชื่อมต่อ Sheet ผิดพลาด: ${sheetErr.message}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      showToast(`เข้าสู่ระบบไม่สำเร็จ: ${err.message || 'โปรดลองใหม่อีกครั้ง'}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // 3. Logout Handler
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setSpreadsheetInfo(null);
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // 4. Vehicle Operations
  const handleAddVehicle = async (newVehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newVehicle: Vehicle = {
      ...newVehicleData,
      id: `veh-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newVehicle, ...vehicles];
    setVehicles(updated);
    saveVehicles(updated);
    const catLabel =
      newVehicle.category === 'bucket_truck_class_c'
        ? 'รถกระเช้า Class C'
        : newVehicle.category === 'crane_truck'
        ? 'รถบรรทุกติดเครน'
        : 'รถทั่วไป';
    showToast(`เพิ่มยานพาหนะทะเบียน ${newVehicle.licensePlate} (${catLabel}) เรียบร้อยแล้ว`, 'success');

    // Auto sync to sheet if connected
    if (accessToken && spreadsheetInfo) {
      try {
        await syncVehiclesToSheet(accessToken, spreadsheetInfo.id, updated);
      } catch (err) {
        console.error('Auto sync vehicle failed:', err);
      }
    }
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    const updated = vehicles.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v));
    setVehicles(updated);
    saveVehicles(updated);
    showToast(`แก้ไขข้อมูลทะเบียน ${updatedVehicle.licensePlate} เรียบร้อยแล้ว`, 'success');

    if (accessToken && spreadsheetInfo) {
      try {
        await syncVehiclesToSheet(accessToken, spreadsheetInfo.id, updated);
      } catch (err) {
        console.error('Auto sync vehicle failed:', err);
      }
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const vehicleToDelete = vehicles.find((v) => v.id === vehicleId);
    const updated = vehicles.filter((v) => v.id !== vehicleId);
    setVehicles(updated);
    saveVehicles(updated);
    showToast(`ลบยานพาหนะทะเบียน ${vehicleToDelete?.licensePlate || ''} เรียบร้อยแล้ว`, 'info');

    if (accessToken && spreadsheetInfo) {
      try {
        await syncVehiclesToSheet(accessToken, spreadsheetInfo.id, updated);
      } catch (err) {
        console.error('Auto sync vehicle failed:', err);
      }
    }
  };

  // 5. Checklist Template Customization Operations (Admin Feature)
  const handleUpdateTemplates = (newTemplates: ChecklistTemplatesState) => {
    setChecklistTemplates(newTemplates);
    saveChecklistTemplates(newTemplates);
    showToast('บันทึกการปรับปรุงรายการตรวจเช็คเรียบร้อยแล้ว', 'success');
  };

  const handleResetTemplates = () => {
    const reset = resetChecklistTemplatesToDefault();
    setChecklistTemplates(reset);
    showToast('คืนค่ารายการตรวจเช็คทั้ง 3 ประเภทกลับเป็นค่ามาตรฐานเริ่มต้นแล้ว', 'info');
  };

  // 6. Inspection Operations
  const handleSaveInspection = async (
    recordData: Omit<InspectionRecord, 'id' | 'createdAt'>
  ): Promise<void> => {
    const newRecord: InspectionRecord = {
      ...recordData,
      id: `insp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Update vehicle's last odometer & status in fleet
    let newVehicleStatus: VehicleStatus = 'ready';
    if (newRecord.overallStatus === 'conditional') newVehicleStatus = 'needs_attention';
    if (newRecord.overallStatus === 'not_ready') newVehicleStatus = 'maintenance';

    const updatedVehicles = vehicles.map((v) => {
      if (v.id === newRecord.vehicleId) {
        return {
          ...v,
          lastOdometer: Math.max(v.lastOdometer, newRecord.odometer),
          status: newVehicleStatus,
          updatedAt: new Date().toISOString(),
        };
      }
      return v;
    });

    setVehicles(updatedVehicles);
    saveVehicles(updatedVehicles);

    const updatedInspections = [newRecord, ...inspections];
    setInspections(updatedInspections);
    saveInspections(updatedInspections);

    showToast(
      `บันทึกผลการตรวจทะเบียน ${newRecord.vehicleLicensePlate} เรียบร้อยแล้ว`,
      'success'
    );

    // Auto sync row to Google Sheets if connected
    if (accessToken && spreadsheetInfo) {
      try {
        await appendInspectionToSheet(accessToken, spreadsheetInfo.id, newRecord);
        await syncVehiclesToSheet(accessToken, spreadsheetInfo.id, updatedVehicles);
        showToast('ซิงค์ข้อมูลลง Google Sheets อัตโนมัติแล้ว', 'success');
      } catch (err) {
        console.error('Failed to append to Google Sheets:', err);
      }
    }
  };

  const handleDeleteInspection = async (recordId: string) => {
    const updated = inspections.filter((i) => i.id !== recordId);
    setInspections(updated);
    saveInspections(updated);
    showToast('ลบบันทึกการตรวจเรียบร้อยแล้ว', 'info');

    if (accessToken && spreadsheetInfo) {
      try {
        await syncAllInspectionsToSheet(accessToken, spreadsheetInfo.id, updated);
      } catch (err) {
        console.error('Auto sync inspections failed:', err);
      }
    }
  };

  // 7. Manual Sync Triggers for Sheets Panel
  const handleSyncAll = async () => {
    if (!accessToken || !spreadsheetInfo) throw new Error('ยังไม่ได้เข้าสู่ระบบ Google');
    await syncVehiclesToSheet(accessToken, spreadsheetInfo.id, vehicles);
    await syncAllInspectionsToSheet(accessToken, spreadsheetInfo.id, inspections);
  };

  const handleSyncVehicles = async () => {
    if (!accessToken || !spreadsheetInfo) throw new Error('ยังไม่ได้เข้าสู่ระบบ Google');
    await syncVehiclesToSheet(accessToken, spreadsheetInfo.id, vehicles);
  };

  const handleSyncInspections = async () => {
    if (!accessToken || !spreadsheetInfo) throw new Error('ยังไม่ได้เข้าสู่ระบบ Google');
    await syncAllInspectionsToSheet(accessToken, spreadsheetInfo.id, inspections);
  };

  // Quick navigation helpers
  const handleStartInspectionForVehicle = (vehicleId?: string) => {
    if (vehicleId) setPreselectedVehicleId(vehicleId);
    setActiveTab('inspect');
  };

  const handleViewHistoryForVehicle = (vehicleId?: string) => {
    if (vehicleId) setHistoryFilterVehicleId(vehicleId);
    setActiveTab('history');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Prompt',sans-serif]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-3 text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : toast.type === 'error'
                ? 'bg-rose-900 text-white border-rose-800'
                : 'bg-blue-900 text-white border-blue-800'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <X className="w-5 h-5 text-rose-400" />}
            {toast.type === 'info' && <ShieldCheck className="w-5 h-5 text-blue-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Application Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo / App Name */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight block">
                ระบบตรวจเช็คสภาพยานพาหนะ
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                1. ยานพาหนะทั่วไป • 2. รถบรรทุกติดเครนไฮดรอลิค
              </span>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              แดชบอร์ด
            </button>

            <button
              onClick={() => setActiveTab('inspect')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'inspect'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              ตรวจสภาพรถ
            </button>

            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'vehicles'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="w-4 h-4" />
              ยานพาหนะ
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              ประวัติย้อนหลัง
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/50'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400" />
              ผู้ดูแลระบบ
            </button>

            <button
              onClick={() => setActiveTab('sheets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'sheets'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Google Sheets
            </button>
          </nav>

          {/* Right Status / Auth */}
          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => setActiveTab('sheets')}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition-all text-xs font-medium text-emerald-900"
                title="คลิกเพื่อจัดการ Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline font-bold">Sheets ซิงค์แล้ว</span>
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-5 h-5 rounded-full border border-emerald-300"
                  />
                )}
              </button>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isConnecting}
                className="gsi-material-button text-xs !h-9 !px-3 shadow-xs"
                title="เชื่อมต่อ Google Sheets"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon !w-4 !h-4 !mr-2">
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
                  <span className="gsi-material-button-contents text-xs font-semibold">
                    {isConnecting ? 'กำลังต่อ...' : 'เชื่อมต่อ Sheets'}
                  </span>
                </div>
              </button>
            )}

            {/* Mobile menu hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-2 animate-in slide-in-from-top duration-150">
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              แดชบอร์ดสรุปภาพรวม
            </button>
            <button
              onClick={() => {
                setActiveTab('inspect');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'inspect' ? 'bg-blue-600 text-white' : 'text-slate-700'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              แบบฟอร์มตรวจสภาพรถ
            </button>
            <button
              onClick={() => {
                setActiveTab('vehicles');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'vehicles' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <Car className="w-4 h-4" />
              จัดการยานพาหนะ ({vehicles.length} คัน)
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
              }`}
            >
              <History className="w-4 h-4" />
              ประวัติการตรวจย้อนหลัง
            </button>
            <button
              onClick={() => {
                setActiveTab('admin');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left text-sm font-bold flex items-center gap-2 ${
                activeTab === 'admin' ? 'bg-slate-900 text-white' : 'text-slate-800'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400" />
              หน้าผู้ดูแลระบบ (Admin)
            </button>
            <button
              onClick={() => {
                setActiveTab('sheets');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full p-2.5 rounded-xl text-left text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'sheets' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              การเชื่อมต่อ Google Sheets
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            vehicles={vehicles}
            inspections={inspections}
            onStartInspection={handleStartInspectionForVehicle}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            isSheetsConnected={!!user && !!spreadsheetInfo}
            onOpenSheets={() => {
              if (spreadsheetInfo?.url) window.open(spreadsheetInfo.url, '_blank');
              else setActiveTab('sheets');
            }}
          />
        )}

        {activeTab === 'inspect' && (
          <InspectionForm
            vehicles={vehicles}
            checklistTemplates={checklistTemplates}
            preselectedVehicleId={preselectedVehicleId}
            isSheetsConnected={!!user && !!spreadsheetInfo}
            onSaveInspection={handleSaveInspection}
            onViewHistory={handleViewHistoryForVehicle}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehicleManager
            vehicles={vehicles}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onStartInspection={handleStartInspectionForVehicle}
          />
        )}

        {activeTab === 'history' && (
          <InspectionHistory
            records={inspections}
            vehicles={vehicles}
            filterVehicleId={historyFilterVehicleId}
            onDeleteRecord={handleDeleteInspection}
            onOpenSheets={() => {
              if (spreadsheetInfo?.url) window.open(spreadsheetInfo.url, '_blank');
            }}
            isSheetsConnected={!!user && !!spreadsheetInfo}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            user={user}
            vehicles={vehicles}
            checklistTemplates={checklistTemplates}
            onGoogleLogin={handleGoogleLogin}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onStartInspection={handleStartInspectionForVehicle}
            onUpdateTemplates={handleUpdateTemplates}
            onResetTemplates={handleResetTemplates}
          />
        )}

        {activeTab === 'sheets' && (
          <GoogleSheetsPanel
            user={user}
            spreadsheetInfo={spreadsheetInfo}
            isConnecting={isConnecting}
            onLogin={handleGoogleLogin}
            onLogout={handleLogout}
            onSyncAll={handleSyncAll}
            onSyncVehicles={handleSyncVehicles}
            onSyncInspections={handleSyncInspections}
            totalVehicles={vehicles.length}
            totalInspections={inspections.length}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน (1. ยานพาหนะทั่วไป • 2. รถบรรทุกติดเครนไฮดรอลิค)</span>
          </div>
          <div>
            <span>มีหน้าผู้ดูแลระบบ (Admin) • ซิงค์ Google Sheets • ดูประวัติย้อนหลังทุกคัน</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
