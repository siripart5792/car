import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  ShieldCheck, 
  Database,
  ArrowRight
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SpreadsheetInfo } from '../services/googleSheets';
import { ConfirmModal } from './ConfirmModal';

interface GoogleSheetsPanelProps {
  user: User | null;
  spreadsheetInfo: SpreadsheetInfo | null;
  isConnecting: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSyncAll: () => Promise<void>;
  onSyncVehicles: () => Promise<void>;
  onSyncInspections: () => Promise<void>;
  totalVehicles: number;
  totalInspections: number;
}

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  user,
  spreadsheetInfo,
  isConnecting,
  onLogin,
  onLogout,
  onSyncAll,
  onSyncVehicles,
  onSyncInspections,
  totalVehicles,
  totalInspections,
}) => {
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmSyncAll, setConfirmSyncAll] = useState(false);

  const handleSync = async (type: 'all' | 'vehicles' | 'inspections') => {
    setSyncingType(type);
    setSyncStatusMsg(null);
    try {
      if (type === 'all') await onSyncAll();
      else if (type === 'vehicles') await onSyncVehicles();
      else if (type === 'inspections') await onSyncInspections();

      setSyncStatusMsg({
        type: 'success',
        message: 'ซิงค์ข้อมูลกับ Google Sheets สำเร็จเรียบร้อยแล้ว',
      });
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncStatusMsg({
        type: 'error',
        message: `เกิดข้อผิดพลาดในการซิงค์: ${err?.message || 'ไม่สามารถติดต่อ Google API ได้'}`,
      });
    } finally {
      setSyncingType(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Overview Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                การเชื่อมต่อ Google Sheets (สเปรดชีต)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                ซิงค์ข้อมูลยานพาหนะและผลการตรวจเช็คสภาพรถก่อนปฏิบัติงานเข้าสู่ Google Spreadsheet ของคุณโดยตรง
              </p>
            </div>
          </div>

          {user && (
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium self-start sm:self-auto transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              ออกจากระบบ
            </button>
          )}
        </div>

        {/* Auth State */}
        {!user ? (
          <div className="py-8 text-center max-w-lg mx-auto space-y-4">
            <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-left">
              <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                สิทธิ์การเข้าถึงผ่าน Google Workspace
              </h4>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                เข้าสู่ระบบด้วยบัญชี Google เพื่อให้ระบบสร้างและบันทึกข้อมูลการตรวจเช็คสภาพรถลงบน Google Sheets ของคุณแบบอัตโนมัติ โดยได้รับความยินยอมจากคุณ
              </p>
            </div>

            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={onLogin}
                disabled={isConnecting}
                className="gsi-material-button hover:shadow-md transition-all active:scale-98"
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
                  <span className="gsi-material-button-contents font-medium text-slate-700">
                    {isConnecting ? 'กำลังเชื่อมต่อ...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="pt-5 space-y-6">
            {/* User Details */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-10 h-10 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">
                  {user.displayName || 'ผู้ใช้งาน Google'}
                </div>
                <div className="text-xs text-slate-500 truncate">{user.email}</div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                เชื่อมต่อแล้ว
              </span>
            </div>

            {/* Spreadsheet Card */}
            {spreadsheetInfo && (
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                      Google Spreadsheet ประจำระบบ
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-0.5">
                      {spreadsheetInfo.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      ID: {spreadsheetInfo.id}
                    </p>
                  </div>

                  <a
                    href={spreadsheetInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all self-start sm:self-auto"
                  >
                    <span>เปิดดูใน Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="pt-2 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-emerald-200/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>แผ่นงานที่ 1: <strong className="text-slate-800">ประวัติการตรวจเช็ค</strong> (Inspections Log)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>แผ่นงานที่ 2: <strong className="text-slate-800">ข้อมูลยานพาหนะ</strong> (Vehicles Fleet)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Status alert message */}
            {syncStatusMsg && (
              <div
                className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
                  syncStatusMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {syncStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{syncStatusMsg.message}</span>
              </div>
            )}

            {/* Sync Action Buttons */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                การซิงค์ข้อมูลแบบกำหนดเอง (Manual Sync)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  disabled={!!syncingType}
                  onClick={() => setConfirmSyncAll(true)}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-5 h-5 text-blue-600" />
                    <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-blue-600 ${syncingType === 'all' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="font-bold text-sm text-slate-800">ซิงค์ข้อมูลทั้งหมด</div>
                  <div className="text-xs text-slate-500 mt-1">
                    รถ {totalVehicles} คัน + ผลตรวจ {totalInspections} รายการ
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!!syncingType}
                  onClick={() => handleSync('vehicles')}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/30 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-emerald-600 ${syncingType === 'vehicles' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="font-bold text-sm text-slate-800">ซิงค์ยานพาหนะ</div>
                  <div className="text-xs text-slate-500 mt-1">
                    อัปเดตทะเบียนและเลขไมล์ {totalVehicles} คัน
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!!syncingType}
                  onClick={() => handleSync('inspections')}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-purple-400 bg-white hover:bg-purple-50/30 transition-all text-left group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                    <RefreshCw className={`w-4 h-4 text-slate-400 group-hover:text-purple-600 ${syncingType === 'inspections' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="font-bold text-sm text-slate-800">ซิงค์ประวัติการตรวจ</div>
                  <div className="text-xs text-slate-500 mt-1">
                    ส่งข้อมูลประวัติย้อนหลัง {totalInspections} รายการ
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Overwriting/Syncing all data (Mandated by Workspace Skill) */}
      <ConfirmModal
        isOpen={confirmSyncAll}
        title="ยืนยันการซิงค์ข้อมูลทั้งหมดไปยัง Google Sheets"
        message={`คุณต้องการอัปเดตข้อมูลยานพาหนะ (${totalVehicles} คัน) และบันทึกประวัติการตรวจเช็คสภาพทั้งหมด (${totalInspections} รายการ) ลงบนสเปรดชีตหรือไม่?\n\nข้อมูลในแผ่นงานของ Google Sheets จะถูกจัดระเบียบและซิงค์ให้ตรงกับระบบ`}
        confirmLabel="เริ่มการซิงค์"
        cancelLabel="ยกเลิก"
        isDestructive={false}
        onConfirm={() => {
          setConfirmSyncAll(false);
          handleSync('all');
        }}
        onCancel={() => setConfirmSyncAll(false)}
      />
    </div>
  );
};
