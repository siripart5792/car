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
  X,
  ExternalLink,
  Lock
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  Vehicle, 
  InspectionRecord, 
  VehicleStatus, 
  ChecklistTemplatesState,
  AdminUser
} from './types/vehicle';
import { 
  loadVehicles, 
  saveVehicles, 
  loadInspections, 
  saveInspections,
  loadChecklistTemplates,
  saveChecklistTemplates,
  resetChecklistTemplatesToDefault,
  loadAdminUsers,
  loadPeaBranches,
  savePeaBranches,
  getCurrentAdminUser,
  isStoredAdminAuth,
  setStoredAdminAuth
} from './services/storage';
import { 
  initAuth, 
  googleSignIn, 
  logout,
  getStoredAccessToken,
  saveStoredAccessToken
} from './services/auth';
import { 
  getOrCreateSpreadsheet, 
  syncVehiclesToSheet, 
  syncAllInspectionsToSheet, 
  appendInspectionToSheet, 
  syncAdminUsersToSheet,
  syncBranchSummaryToSheet,
  SpreadsheetInfo,
  getSavedSpreadsheetInfo,
  saveSpreadsheetInfo,
  DEFAULT_SPREADSHEET_URL,
  DEFAULT_WEBHOOK_URL,
  getSavedWebhookUrl,
  saveWebhookUrl,
  callAppsScriptApi,
  fetchDataFromAppsScript,
  syncAllViaAppsScript,
  syncChecklistTemplatesViaAppsScript,
  syncChecklistTemplatesToSheet
} from './services/googleSheets';

import { Dashboard } from './components/Dashboard';
import { VehicleManager } from './components/VehicleManager';
import { InspectionForm } from './components/InspectionForm';
import { InspectionHistory } from './components/InspectionHistory';
import { AdminPanel } from './components/AdminPanel';

type TabType = 'dashboard' | 'inspect' | 'vehicles' | 'history' | 'admin';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadVehicles());
  const [inspections, setInspections] = useState<InspectionRecord[]>(() => loadInspections());
  const [peaBranches, setPeaBranches] = useState<string[]>(() => loadPeaBranches());
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplatesState>(() => loadChecklistTemplates());

  // Cross-component navigation state
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | null>(null);
  const [historyFilterVehicleId, setHistoryFilterVehicleId] = useState<string | null>(null);

  // Auth & Google Sheets state (initialized from persistent cache for instant link)
  const [user, setUser] = useState<User | null>(null);
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(() => getCurrentAdminUser());
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return !!getCurrentAdminUser() || isStoredAdminAuth();
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => getStoredAccessToken());
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(() => getSavedSpreadsheetInfo());
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingFromSheets, setIsFetchingFromSheets] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAdminAuthChange = (isLoggedIn: boolean, adminUser: AdminUser | null) => {
    setIsAdmin(isLoggedIn);
    setCurrentAdminUser(adminUser);
  };

  // Toast / notification feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const isSheetsConnected = !!getSavedWebhookUrl() || (!!(accessToken || getStoredAccessToken()) && !!(spreadsheetInfo || getSavedSpreadsheetInfo()));

  // 1. Initialize Firebase Auth State Listener & Auto-fetch Google Sheets on initial open / refresh
  useEffect(() => {
    // Ensure default Google Apps Script Web App URL is saved if not present
    const existingWebhook = localStorage.getItem('vehicle_inspection_webhook_url');
    if (!existingWebhook || !existingWebhook.trim()) {
      saveWebhookUrl(DEFAULT_WEBHOOK_URL);
    }

    // Auto-fetch shared database from Google Apps Script every time the app opens or refreshes
    const savedWebhook = getSavedWebhookUrl();
    if (savedWebhook) {
      setIsFetchingFromSheets(true);
      fetchDataFromAppsScript(savedWebhook)
        .then((res) => {
          if (res.success) {
            const updatedItems: string[] = [];

            // 1. Update checklist templates if present
            if (res.checklistTemplates) {
              const ct = res.checklistTemplates;
              const hasItems = 
                (ct.general && ct.general.length > 0) || 
                (ct.crane_truck && ct.crane_truck.length > 0) || 
                (ct.bucket_truck_class_c && ct.bucket_truck_class_c.length > 0);
              if (hasItems) {
                setChecklistTemplates(ct);
                saveChecklistTemplates(ct);
                updatedItems.push('รายการตรวจเช็ค');
              }
            }

            // 2. Update vehicles
            if (res.vehicles && res.vehicles.length > 0) {
              setVehicles(res.vehicles);
              saveVehicles(res.vehicles);
              updatedItems.push(`ยานพาหนะ ${res.vehicles.length} คัน`);
            }

            // 3. Update inspections
            if (res.inspections && res.inspections.length > 0) {
              setInspections(res.inspections);
              saveInspections(res.inspections);
              updatedItems.push(`ประวัติ ${res.inspections.length} รายการ`);
            }

            // 4. Update PEA branches
            if (res.branches && res.branches.length > 0) {
              setPeaBranches(res.branches);
              savePeaBranches(res.branches);
            }

            // 5. Update spreadsheet info
            if (res.sheetTitle && res.sheetId) {
              const info: SpreadsheetInfo = {
                id: res.sheetId,
                url: res.sheetUrl || `https://docs.google.com/spreadsheets/d/${res.sheetId}/edit`,
                title: res.sheetTitle,
              };
              setSpreadsheetInfo(info);
              saveSpreadsheetInfo(info);
            }

            if (updatedItems.length > 0) {
              showToast(`ดึงข้อมูลล่าสุดจาก Google Sheets สำเร็จ (${updatedItems.join(', ')})`, 'success');
            }
          }
        })
        .catch((err) => {
          console.warn('Could not auto-fetch from Apps Script on mount:', err);
        })
        .finally(() => {
          setIsFetchingFromSheets(false);
        });
    }

    // Check cached token and auto-fetch/verify spreadsheet immediately on launch
    const cachedToken = getStoredAccessToken();
    if (cachedToken) {
      getOrCreateSpreadsheet(cachedToken)
        .then(async (sheet) => {
          setSpreadsheetInfo(sheet);
          // Auto-flush any inspection records not yet synced
          const currentRecords = loadInspections();
          const unsynced = currentRecords.filter((r) => !r.syncedToSheets);
          if (unsynced.length > 0) {
            for (const rec of unsynced) {
              try {
                await appendInspectionToSheet(cachedToken, sheet.id, rec);
                rec.syncedToSheets = true;
              } catch (e) {
                // ignore
              }
            }
            saveInspections(currentRecords);
            setInspections([...currentRecords]);
          }
        })
        .catch((err) => {
          console.warn('Could not auto-fetch spreadsheet on mount:', err);
        });
    }

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
        if (!getStoredAccessToken()) {
          setAccessToken(null);
        }
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
        showToast('เชื่อมต่อ Google Sheets สำเร็จเรียบร้อยแล้ว', 'success');

        // Create or get spreadsheet
        try {
          const sheet = await getOrCreateSpreadsheet(result.accessToken);
          setSpreadsheetInfo(sheet);
          // Initial sync of existing fleet and records
          await syncVehiclesToSheet(result.accessToken, sheet.id, vehicles);
          await syncAllInspectionsToSheet(result.accessToken, sheet.id, inspections);
          await syncAdminUsersToSheet(result.accessToken, sheet.id, loadAdminUsers());
          await syncBranchSummaryToSheet(result.accessToken, sheet.id, vehicles, inspections, peaBranches);
          showToast(`ซิงค์ข้อมูลกับ Google Sheet "${sheet.title}" เรียบร้อยแล้ว`, 'success');
        } catch (sheetErr: any) {
          console.warn('Sheet setup error:', sheetErr);
        }
        return result;
      }
      return null;
    } catch (err: any) {
      console.warn('Google login issue:', err?.message || err);
      showToast(err?.message || 'โปรดอนุญาตป๊อปอัปในเบราว์เซอร์เพื่อเข้าสู่ระบบ Google', 'error');
      return null;
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
    setIsAdmin(false);
    setCurrentAdminUser(null);
    setStoredAdminAuth(false);
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // 4. Vehicle Operations
  const handleAddVehicle = async (newVehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isAdmin) {
      showToast('ผู้ใช้งานทั่วไปไม่สามารถเพิ่มยานพาหนะได้ (เฉพาะผู้ดูแลระบบ)', 'error');
      return;
    }

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

    // Auto sync to sheet immediately
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'saveVehicle', vehicle: newVehicle }).catch((e) => {
        console.warn('Apps Script sync vehicle failed:', e);
      });
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncVehiclesToSheet(currentToken, currentSheet.id, updated);
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, updated, inspections, peaBranches);
      } catch (err) {
        console.error('Auto sync vehicle failed:', err);
      }
    }
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    if (!isAdmin) {
      showToast('ผู้ใช้งานทั่วไปไม่สามารถแก้ไขยานพาหนะได้ (เฉพาะผู้ดูแลระบบ)', 'error');
      return;
    }

    const updated = vehicles.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v));
    setVehicles(updated);
    saveVehicles(updated);
    showToast(`แก้ไขข้อมูลทะเบียน ${updatedVehicle.licensePlate} เรียบร้อยแล้ว`, 'success');

    // Auto sync to sheet immediately
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'saveVehicle', vehicle: updatedVehicle }).catch((e) => {
        console.warn('Apps Script update vehicle failed:', e);
      });
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncVehiclesToSheet(currentToken, currentSheet.id, updated);
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, updated, inspections, peaBranches);
      } catch (err) {
        console.error('Auto sync vehicle failed:', err);
      }
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!isAdmin) {
      showToast('ผู้ใช้งานทั่วไปไม่สามารถลบยานพาหนะได้ (เฉพาะผู้ดูแลระบบ)', 'error');
      return;
    }

    const vehicleToDelete = vehicles.find((v) => v.id === vehicleId);
    const updated = vehicles.filter((v) => v.id !== vehicleId);
    setVehicles(updated);
    saveVehicles(updated);
    showToast(`ลบยานพาหนะทะเบียน ${vehicleToDelete?.licensePlate || ''} เรียบร้อยแล้ว`, 'info');

    // Auto sync to sheet immediately
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'deleteVehicle', vehicleId }).catch((e) => {
        console.warn('Apps Script delete vehicle failed:', e);
      });
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncVehiclesToSheet(currentToken, currentSheet.id, updated);
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, updated, inspections, peaBranches);
      } catch (err) {
        console.error('Auto sync vehicle failed:', err);
      }
    }
  };

  // 5. Checklist Template Customization Operations (Admin Feature with Google Sheets Sync)
  const handleUpdateTemplates = async (newTemplates: ChecklistTemplatesState) => {
    setChecklistTemplates(newTemplates);
    saveChecklistTemplates(newTemplates);

    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      try {
        await syncChecklistTemplatesViaAppsScript(webhookUrl, newTemplates);
        showToast('บันทึกและซิงค์รายการตรวจเช็คทั้ง 3 แผ่นงานลง Google Sheets สำเร็จ', 'success');
      } catch (err: any) {
        console.warn('Apps Script checklist sync warning:', err);
        showToast('บันทึกในเครื่องสำเร็จ (การซิงค์ชีทแจ้งเตือน: ' + (err?.message || 'เชื่อมต่อไม่ได้') + ')', 'info');
      }
    } else {
      showToast('บันทึกการปรับปรุงรายการตรวจเช็คเรียบร้อยแล้ว', 'success');
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncChecklistTemplatesToSheet(currentToken, currentSheet.id, newTemplates);
      } catch (err) {
        console.warn('Direct OAuth checklist sync warning:', err);
      }
    }
  };

  const handleResetTemplates = async () => {
    const reset = resetChecklistTemplatesToDefault();
    setChecklistTemplates(reset);
    saveChecklistTemplates(reset);

    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      try {
        await syncChecklistTemplatesViaAppsScript(webhookUrl, reset);
        showToast('คืนค่ารายการตรวจเช็คกลับเป็นค่ามาตรฐานและซิงค์ลง Google Sheets สำเร็จ', 'success');
      } catch (err: any) {
        showToast('คืนค่ารายการตรวจเช็คกลับเป็นค่ามาตรฐานเริ่มต้นแล้ว', 'info');
      }
    } else {
      showToast('คืนค่ารายการตรวจเช็คทั้ง 3 ประเภทกลับเป็นค่ามาตรฐานเริ่มต้นแล้ว', 'info');
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncChecklistTemplatesToSheet(currentToken, currentSheet.id, reset);
      } catch (err) {}
    }
  };

  // 6. Inspection Operations (Direct and Automatic Google Sheets Append)
  const handleSaveInspection = async (
    recordData: Omit<InspectionRecord, 'id' | 'createdAt'>
  ): Promise<void> => {
    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();

    const newRecord: InspectionRecord = {
      ...recordData,
      id: `insp-${Date.now()}`,
      createdAt: new Date().toISOString(),
      syncedToSheets: false,
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

    const updatedInspections = [newRecord, ...inspections];

    // Auto write row directly into Google Sheets if connected
    const webhookUrl = getSavedWebhookUrl();

    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, {
        action: 'appendInspection',
        record: newRecord,
      })
        .then(() => {
          newRecord.syncedToSheets = true;
        })
        .catch((err) => {
          console.warn('Apps Script append inspection warning:', err);
        });
      showToast(`บันทึกผลการตรวจทะเบียน ${newRecord.vehicleLicensePlate} และบันทึกลง Google Sheets ทันทีเรียบร้อยแล้ว`, 'success');
    } else if (currentToken && currentSheet) {
      try {
        await appendInspectionToSheet(currentToken, currentSheet.id, newRecord);
        await syncVehiclesToSheet(currentToken, currentSheet.id, updatedVehicles);
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, updatedVehicles, updatedInspections, peaBranches);
        newRecord.syncedToSheets = true;
        showToast('บันทึกผลการตรวจและบันทึกลง Google Sheets ทันทีเรียบร้อยแล้ว', 'success');
      } catch (err) {
        console.error('Failed to append to Google Sheets:', err);
        showToast('บันทึกในระบบเรียบร้อย (ระบบจะซิงค์กับ Google Sheets อัตโนมัติ)', 'info');
      }
    } else {
      showToast(
        `บันทึกผลการตรวจทะเบียน ${newRecord.vehicleLicensePlate} เรียบร้อยแล้ว`,
        'success'
      );
    }

    setVehicles(updatedVehicles);
    saveVehicles(updatedVehicles);

    setInspections(updatedInspections);
    saveInspections(updatedInspections);
  };

  const handleDeleteInspection = async (recordId: string) => {
    if (!isAdmin) {
      showToast('ผู้ใช้งานทั่วไปไม่สามารถลบผลตรวจเช็คสภาพยานพาหนะได้ (เฉพาะผู้ดูแลระบบ)', 'error');
      return;
    }

    const updated = inspections.filter((i) => i.id !== recordId);
    setInspections(updated);
    saveInspections(updated);
    showToast('ลบบันทึกการตรวจเรียบร้อยแล้ว', 'info');

    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'syncAll', inspections: updated, vehicles }).catch(console.warn);
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncAllInspectionsToSheet(currentToken, currentSheet.id, updated);
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, vehicles, updated, peaBranches);
      } catch (err) {
        console.error('Auto sync inspections failed:', err);
      }
    }
  };

  // 7. Auto Sync for Admin Users and All 4 Sheets
  const handleSyncAdminUsers = async (users: any[]) => {
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'syncAll', adminUsers: users }).catch(console.warn);
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncAdminUsersToSheet(currentToken, currentSheet.id, users);
        showToast('บันทึกข้อมูลผู้ดูแลระบบลง Google Sheets สำเร็จ', 'success');
      } catch (err) {
        console.error('Auto sync admin users failed:', err);
      }
    }
  };

  // 8. PEA Branches Management Handlers (Admin Only)
  const handleAddPeaBranch = async (branchName: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = branchName.trim();
    if (!trimmed) {
      return { success: false, message: 'กรุณาระบุชื่อการไฟฟ้า' };
    }
    if (peaBranches.some((b) => b.trim().toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, message: `มีรายชื่อ "${trimmed}" อยู่ในระบบแล้ว` };
    }
    const updated = [...peaBranches, trimmed];
    setPeaBranches(updated);
    savePeaBranches(updated);
    showToast(`เพิ่มรายชื่อการไฟฟ้า "${trimmed}" เรียบร้อยแล้ว`, 'success');

    // Auto sync to sheet 'สรุปแยกตามการไฟฟ้า' and Apps Script
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'saveBranches', branches: updated }).catch(console.warn);
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, vehicles, inspections, updated);
      } catch (err) {
        console.error('Auto sync branch summary failed:', err);
      }
    }
    return { success: true, message: `เพิ่มรายชื่อการไฟฟ้า "${trimmed}" สำเร็จ` };
  };

  const handleDeletePeaBranch = async (branchName: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = branchName.trim();
    if (!peaBranches.includes(trimmed)) {
      return { success: false, message: 'ไม่พบรายชื่อการไฟฟ้านี้ในระบบ' };
    }
    const updated = peaBranches.filter((b) => b !== trimmed);
    setPeaBranches(updated);
    savePeaBranches(updated);
    showToast(`ลบรายชื่อการไฟฟ้า "${trimmed}" เรียบร้อยแล้ว`, 'info');

    // Auto sync to sheet 'สรุปแยกตามการไฟฟ้า' and Apps Script
    const webhookUrl = getSavedWebhookUrl();
    if (webhookUrl) {
      callAppsScriptApi(webhookUrl, { action: 'saveBranches', branches: updated }).catch(console.warn);
    }

    const currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();
    if (currentToken && currentSheet) {
      try {
        await syncBranchSummaryToSheet(currentToken, currentSheet.id, vehicles, inspections, updated);
      } catch (err) {
        console.error('Auto sync branch summary failed:', err);
      }
    }
    return { success: true, message: `ลบรายชื่อการไฟฟ้า "${trimmed}" สำเร็จ` };
  };

  const handleSyncAllSheets = async () => {
    const webhookUrl = getSavedWebhookUrl();
    let currentToken = accessToken || getStoredAccessToken();
    const currentSheet = spreadsheetInfo || getSavedSpreadsheetInfo();

    // Priority 1: Apps Script Web App (No OAuth required, works seamlessly for all users)
    if (webhookUrl) {
      try {
        const currentAdmins = loadAdminUsers();
        await syncAllViaAppsScript(webhookUrl, {
          vehicles,
          inspections,
          branches: peaBranches,
          adminUsers: currentAdmins,
          checklistTemplates,
        });
        showToast('ซิงค์ข้อมูลทั้ง 8 แผ่นงานลง Google Sheets ผ่าน Apps Script สำเร็จเรียบร้อยแล้ว', 'success');
        return;
      } catch (err: any) {
        console.warn('Apps Script bulk sync warning:', err);
        showToast(`ซิงค์ผ่าน Apps Script ไม่สำเร็จ: ${err?.message || 'โปรดตรวจสอบ URL'}`, 'error');
        return;
      }
    }

    // Priority 2: Direct OAuth Sheets API
    if (!currentToken) {
      showToast('กรุณากดยืนยันสิทธิ์ Google หรือระบุ URL ของ Apps Script ในการตั้งค่า', 'info');
      const loginRes = await handleGoogleLogin();
      currentToken = loginRes?.accessToken || getStoredAccessToken();
      if (!currentToken) {
        showToast('ยังไม่มี Token หรือยังไม่ได้ยืนยันสิทธิ์ Google (แนะนำให้ใส่ URL ของ Google Apps Script ที่แถบผู้ดูแลระบบ)', 'info');
        return;
      }
    }

    if (!currentSheet) {
      showToast('ไม่พบข้อมูล Google Sheet กรุณาตรวจสอบลิงก์ในหน้าตั้งค่า', 'error');
      return;
    }

    try {
      const currentAdmins = loadAdminUsers();
      await syncVehiclesToSheet(currentToken, currentSheet.id, vehicles);
      await syncAllInspectionsToSheet(currentToken, currentSheet.id, inspections);
      await syncAdminUsersToSheet(currentToken, currentSheet.id, currentAdmins);
      await syncBranchSummaryToSheet(currentToken, currentSheet.id, vehicles, inspections, peaBranches);
      await syncChecklistTemplatesToSheet(currentToken, currentSheet.id, checklistTemplates);
      showToast('ซิงค์ข้อมูลลง Google Sheets ครบถ้วนทุกแผ่นงานแล้ว', 'success');
    } catch (err: any) {
      console.warn('Sync all sheets warning:', err);
      showToast(`ซิงค์ข้อมูลไม่สำเร็จ: ${err?.message || 'โปรดตรวจสอบการเชื่อมต่อ'}`, 'error');
    }
  };

  // Pull latest fleet, checklist templates, and inspection history from Google Sheets via Apps Script
  const handlePullFromSheets = async () => {
    const webhookUrl = getSavedWebhookUrl();
    if (!webhookUrl) {
      showToast('กรุณาระบุ URL ของ Google Apps Script ในหน้าตั้งค่าก่อน', 'error');
      return;
    }
    setIsFetchingFromSheets(true);
    try {
      showToast('กำลังดึงข้อมูลล่าสุดจาก Google Sheets...', 'info');
      const res = await fetchDataFromAppsScript(webhookUrl);
      if (res.success) {
        let countVehicles = 0;
        let countInspections = 0;
        let updatedParts: string[] = [];

        if (res.checklistTemplates) {
          const ct = res.checklistTemplates;
          const hasItems =
            (ct.general && ct.general.length > 0) ||
            (ct.crane_truck && ct.crane_truck.length > 0) ||
            (ct.bucket_truck_class_c && ct.bucket_truck_class_c.length > 0);
          if (hasItems) {
            setChecklistTemplates(ct);
            saveChecklistTemplates(ct);
            updatedParts.push('รายการตรวจเช็ค 3 ประเภท');
          }
        }

        if (res.vehicles && res.vehicles.length > 0) {
          setVehicles(res.vehicles);
          saveVehicles(res.vehicles);
          countVehicles = res.vehicles.length;
          updatedParts.push(`รถ ${countVehicles} คัน`);
        }
        if (res.inspections && res.inspections.length > 0) {
          setInspections(res.inspections);
          saveInspections(res.inspections);
          countInspections = res.inspections.length;
          updatedParts.push(`ประวัติ ${countInspections} รายการ`);
        }
        if (res.branches && res.branches.length > 0) {
          setPeaBranches(res.branches);
          savePeaBranches(res.branches);
        }
        if (res.sheetTitle && res.sheetId) {
          const info: SpreadsheetInfo = {
            id: res.sheetId,
            url: res.sheetUrl || `https://docs.google.com/spreadsheets/d/${res.sheetId}/edit`,
            title: res.sheetTitle,
          };
          setSpreadsheetInfo(info);
          saveSpreadsheetInfo(info);
        }
        showToast(
          `ดึงข้อมูลล่าสุดสำเร็จ: ${updatedParts.length > 0 ? updatedParts.join(', ') : 'ข้อมูลเป็นปัจจุบันแล้ว'}`,
          'success'
        );
      } else {
        showToast(res.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้', 'error');
      }
    } catch (err: any) {
      showToast(`ดึงข้อมูลไม่สำเร็จ: ${err?.message || 'เกิดข้อผิดพลาด'}`, 'error');
    } finally {
      setIsFetchingFromSheets(false);
    }
  };

  const handleUpdateAccessToken = (token: string) => {
    saveStoredAccessToken(token);
    setAccessToken(token);
    showToast('บันทึก Access Token เรียบร้อยแล้ว พร้อมซิงค์ Google Sheets', 'success');
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
                1. ยานพาหนะทั่วไป • 2. รถบรรทุกติดเครน • 3. รถกระเช้า Class C
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
          </nav>

          {/* Right Status / Auth */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-900 shadow-2xs">
                <span>👑 ผู้ดูแลระบบ</span>
                {currentAdminUser && <span className="font-medium text-amber-700 truncate max-w-[120px]">({currentAdminUser.displayName})</span>}
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>โหมดผู้ใช้งานทั่วไป</span>
              </div>
            )}

            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>บันทึก Google Sheets อัตโนมัติ</span>
            </div>
            <button
              onClick={handlePullFromSheets}
              disabled={isFetchingFromSheets}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-xs active:scale-98 ${
                isFetchingFromSheets ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              title="ดึงข้อมูลล่าสุดจาก Google Sheets (รีเฟรชฐานข้อมูล)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isFetchingFromSheets ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isFetchingFromSheets ? 'กำลังดึง...' : 'ดึงข้อมูล'}</span>
            </button>

            <a
              href={spreadsheetInfo?.url || DEFAULT_SPREADSHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs font-bold shadow-xs active:scale-98"
              title={`เปิดดู Google Sheet: ${spreadsheetInfo?.title || 'ระบบตรวจเช็คสภาพยานพาหนะ'}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เปิดดู Google Sheets</span>
              <ExternalLink className="w-3 h-3" />
            </a>

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
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            vehicles={vehicles}
            inspections={inspections}
            peaBranches={peaBranches}
            onStartInspection={handleStartInspectionForVehicle}
            onNavigateToTab={(tab) => setActiveTab(tab)}
            isSheetsConnected={isSheetsConnected}
            spreadsheetInfo={spreadsheetInfo}
            onOpenSheets={() => {
              const url = spreadsheetInfo?.url || DEFAULT_SPREADSHEET_URL;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
          />
        )}

        {activeTab === 'inspect' && (
          <InspectionForm
            vehicles={vehicles}
            checklistTemplates={checklistTemplates}
            preselectedVehicleId={preselectedVehicleId}
            isSheetsConnected={isSheetsConnected}
            spreadsheetInfo={spreadsheetInfo}
            onConnectSheets={async () => { await handleGoogleLogin(); }}
            onSaveInspection={handleSaveInspection}
            onViewHistory={handleViewHistoryForVehicle}
          />
        )}

        {activeTab === 'vehicles' && (
          <VehicleManager
            vehicles={vehicles}
            peaBranches={peaBranches}
            isAdmin={isAdmin}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onStartInspection={handleStartInspectionForVehicle}
            onNavigateToPeaBranches={() => setActiveTab('admin')}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'history' && (
          <InspectionHistory
            records={inspections}
            vehicles={vehicles}
            peaBranches={peaBranches}
            filterVehicleId={historyFilterVehicleId}
            isAdmin={isAdmin}
            onDeleteRecord={handleDeleteInspection}
            onOpenSheets={() => {
              const url = spreadsheetInfo?.url || DEFAULT_SPREADSHEET_URL;
              window.open(url, '_blank', 'noopener,noreferrer');
            }}
            isSheetsConnected={isSheetsConnected}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            user={user}
            vehicles={vehicles}
            peaBranches={peaBranches}
            checklistTemplates={checklistTemplates}
            spreadsheetInfo={spreadsheetInfo}
            onAdminAuthChange={handleAdminAuthChange}
            onGoogleLogin={async () => { await handleGoogleLogin(); }}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onStartInspection={handleStartInspectionForVehicle}
            onUpdateTemplates={handleUpdateTemplates}
            onResetTemplates={handleResetTemplates}
            onSyncAdminUsers={handleSyncAdminUsers}
            onSyncAllSheets={handleSyncAllSheets}
            onUpdateSpreadsheetInfo={(info) => setSpreadsheetInfo(info)}
            onAddPeaBranch={handleAddPeaBranch}
            onDeletePeaBranch={handleDeletePeaBranch}
            onLoadDataFromSheets={handlePullFromSheets}
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
