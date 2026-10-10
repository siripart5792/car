import { Vehicle, InspectionRecord, AdminUser, ChecklistTemplatesState, InspectionCategoryTemplate } from '../types/vehicle';

const SPREADSHEET_STORAGE_KEY = 'vehicle_inspection_spreadsheet_id';
const SPREADSHEET_INFO_STORAGE_KEY = 'vehicle_inspection_spreadsheet_info_v3';
const WEBHOOK_URL_STORAGE_KEY = 'vehicle_inspection_webhook_url';

export interface SpreadsheetInfo {
  id: string;
  url: string;
  title: string;
}

export const VEHICLE_CATEGORY_LABELS: Record<string, string> = {
  general: 'ยานพาหนะทั่วไป',
  crane_truck: 'รถบรรทุกติดเครนไฮดรอลิค',
  bucket_truck_class_c: 'รถกระเช้า Class C',
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  pickup: 'รถกระบะ / ปิคอัพ',
  truck: 'รถบรรทุก 6 ล้อ / 10 ล้อ',
  van: 'รถตู้ / รถตู้โดยสาร',
  bucket_truck: 'รถกระเช้าไฮดรอลิค',
  bucket_truck_class_c: 'รถกระเช้าฉนวนไฟฟ้า Class C',
  crane_truck: 'รถบรรทุกติดเครนไฮดรอลิค',
  sedan: 'รถยนต์นั่ง / เก๋ง',
  motorcycle: 'รถจักรยานยนต์',
  other: 'ยานพาหนะอื่นๆ',
};

export const STATUS_LABELS: Record<string, string> = {
  ready: 'พร้อมใช้งาน',
  needs_attention: 'มีข้อสังเกต/ต้องดูแล',
  maintenance: 'ส่งซ่อม/ระงับใช้',
};

export const OVERALL_STATUS_LABELS: Record<string, string> = {
  ready: 'พร้อมใช้งาน (ผ่าน)',
  conditional: 'พร้อมใช้งานแบบมีข้อสังเกต',
  not_ready: 'ไม่พร้อมใช้งาน (ห้ามขับ/ห้ามยก)',
};

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  super_admin: 'ผู้ดูแลระบบหลัก (Super Admin)',
  admin: 'ผู้ดูแลระบบ (Admin)',
  supervisor: 'หัวหน้างานตรวจสภาพ (Supervisor)',
};

export const DEFAULT_SPREADSHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;

export const OLD_DEFAULT_WEBHOOK_URLS = [
  'https://script.google.com/macros/s/AKfycbxM-so9M9me64MEVH8KLf4FBqkpqypLHU0Dtdi2yP4FZNvbDuQIKO_dzKjqkRQPx5Bc/exec',
];

export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbz6aqVV2AZwik8BEfVGH52HXxSnagzz83fh3zATvJ_009zGv8Jo-G1UgjD2aRQD1dqo/exec';

export const DEFAULT_SPREADSHEET_INFO: SpreadsheetInfo = {
  id: DEFAULT_SPREADSHEET_ID,
  url: DEFAULT_SPREADSHEET_URL,
  title: 'ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน - การไฟฟ้าส่วนภูมิภาค (PEA)',
};

export const getSavedSpreadsheetId = (): string => {
  return localStorage.getItem(SPREADSHEET_STORAGE_KEY) || DEFAULT_SPREADSHEET_ID;
};

export const saveSpreadsheetId = (id: string): void => {
  localStorage.setItem(SPREADSHEET_STORAGE_KEY, id);
};

export const getSavedSpreadsheetInfo = (): SpreadsheetInfo => {
  try {
    const raw = localStorage.getItem(SPREADSHEET_INFO_STORAGE_KEY);
    if (!raw) return DEFAULT_SPREADSHEET_INFO;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.id || !parsed.url) return DEFAULT_SPREADSHEET_INFO;
    return parsed;
  } catch (e) {
    return DEFAULT_SPREADSHEET_INFO;
  }
};

export const saveSpreadsheetInfo = (info: SpreadsheetInfo): void => {
  try {
    localStorage.setItem(SPREADSHEET_INFO_STORAGE_KEY, JSON.stringify(info));
    localStorage.setItem(SPREADSHEET_STORAGE_KEY, info.id);
  } catch (e) {
    // ignore
  }
};

export const getSavedWebhookUrl = (): string => {
  const saved = localStorage.getItem(WEBHOOK_URL_STORAGE_KEY);
  if (saved && saved.trim()) {
    const trimmed = saved.trim();
    // If the saved URL is one of the previous defaults, automatically migrate to the new default URL
    if (OLD_DEFAULT_WEBHOOK_URLS.includes(trimmed)) {
      localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, DEFAULT_WEBHOOK_URL);
      return DEFAULT_WEBHOOK_URL;
    }
    return trimmed;
  }
  localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, DEFAULT_WEBHOOK_URL);
  return DEFAULT_WEBHOOK_URL;
};

export const saveWebhookUrl = (url: string): void => {
  localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, url.trim());
};

export const resetWebhookUrlToDefault = (): string => {
  localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, DEFAULT_WEBHOOK_URL);
  return DEFAULT_WEBHOOK_URL;
};

export const clearSpreadsheetId = (): void => {
  localStorage.removeItem(SPREADSHEET_STORAGE_KEY);
  localStorage.removeItem(SPREADSHEET_INFO_STORAGE_KEY);
};

/**
 * Call Google Apps Script Web App API
 * Uses Content-Type text/plain to prevent browser CORS preflight (OPTIONS)
 */
export async function callAppsScriptApi(
  url: string,
  payload: Record<string, any>
): Promise<any> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error('ยังไม่ได้ระบุ URL ของ Google Apps Script');
  }

  const res = await fetch(cleanUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });

  if (!res.ok) {
    throw new Error(`Google Apps Script ตอบกลับด้วยข้อผิดพลาด (Status: ${res.status})`);
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    return { success: true, raw: text };
  }
}

/**
 * Test Google Apps Script Web App Connection
 */
export async function testAppsScriptConnection(url: string): Promise<{
  success: boolean;
  message: string;
  sheetTitle?: string;
  sheetId?: string;
}> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return { success: false, message: 'กรุณาระบุ URL ของ Google Apps Script (Web App)' };
  }

  try {
    const getUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=ping` : `${cleanUrl}?action=ping`;
    const getRes = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
    if (getRes.ok) {
      const data = await getRes.json();
      if (data && data.success) {
        return {
          success: true,
          message: data.message || 'เชื่อมต่อกับ Google Apps Script สำเร็จ',
          sheetTitle: data.sheetTitle,
          sheetId: data.sheetId,
        };
      }
    }
  } catch (getErr) {
    // Try POST if GET fails
  }

  try {
    const postRes = await callAppsScriptApi(cleanUrl, { action: 'ping' });
    if (postRes && postRes.success) {
      return {
        success: true,
        message: postRes.message || 'เชื่อมต่อกับ Google Apps Script สำเร็จ',
        sheetTitle: postRes.sheetTitle,
        sheetId: postRes.sheetId,
      };
    }
    return {
      success: false,
      message: postRes?.message || 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบการ Deploy เว็บแอป (สิทธิ์: ทุกคน / Anyone)',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'ไม่สามารถติดต่อ Google Apps Script ได้ (โปรดตรวจสอบ URL และการอนุญาตสิทธิ์)',
    };
  }
}

/**
 * Fetch all data from Google Apps Script to synchronize local state
 */
export async function fetchDataFromAppsScript(url: string): Promise<{
  success: boolean;
  vehicles?: Vehicle[];
  inspections?: InspectionRecord[];
  branches?: string[];
  checklistTemplates?: ChecklistTemplatesState;
  adminUsers?: AdminUser[];
  sheetTitle?: string;
  sheetId?: string;
  sheetUrl?: string;
  message?: string;
}> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return { success: false, message: 'ไม่มี URL ของ Google Apps Script' };
  }

  try {
    const getUrl = cleanUrl.includes('?') ? `${cleanUrl}&action=getAllData` : `${cleanUrl}?action=getAllData`;
    const res = await fetch(getUrl, { method: 'GET', redirect: 'follow' });
    if (res.ok) {
      const json = await res.json();
      if (json && json.success && json.data) {
        return {
          success: true,
          vehicles: json.data.vehicles || [],
          inspections: json.data.inspections || [],
          branches: json.data.branches || [],
          checklistTemplates: json.data.checklistTemplates,
          adminUsers: json.data.adminUsers || [],
          sheetTitle: json.data.spreadsheetTitle,
          sheetId: json.data.spreadsheetId,
          sheetUrl: json.data.spreadsheetUrl,
        };
      }
    }
  } catch (e) {
    // try POST
  }

  try {
    const json = await callAppsScriptApi(cleanUrl, { action: 'getAllData' });
    if (json && json.success && json.data) {
      return {
        success: true,
        vehicles: json.data.vehicles || [],
        inspections: json.data.inspections || [],
        branches: json.data.branches || [],
        checklistTemplates: json.data.checklistTemplates,
        adminUsers: json.data.adminUsers || [],
        sheetTitle: json.data.spreadsheetTitle,
        sheetId: json.data.spreadsheetId,
        sheetUrl: json.data.spreadsheetUrl,
      };
    }
    return { success: false, message: json?.message || 'ไม่สามารถดึงข้อมูลจาก Google Sheets ได้' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets' };
  }
}

/**
 * Sync all data to Google Sheets via Apps Script Web App
 */
export async function syncAllViaAppsScript(
  url: string,
  payload: {
    vehicles: Vehicle[];
    inspections: InspectionRecord[];
    branches: string[];
    adminUsers?: AdminUser[];
    checklistTemplates?: ChecklistTemplatesState;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callAppsScriptApi(url, {
      action: 'syncAll',
      ...payload,
    });
    if (res && res.success) {
      return { success: true, message: res.message || 'ซิงค์ข้อมูลลง Google Sheets ผ่าน Apps Script สำเร็จ' };
    }
    throw new Error(res?.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
  } catch (err: any) {
    throw new Error(err?.message || 'ไม่สามารถส่งข้อมูลไปยัง Apps Script ได้');
  }
}

/**
 * Sync Admin Users to Google Sheets via Apps Script Web App (Sheet: 'ข้อมูลผู้ดูแลระบบ')
 */
export async function syncAdminUsersViaAppsScript(
  url: string,
  admins: AdminUser[]
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callAppsScriptApi(url, {
      action: 'saveAdminUsers',
      adminUsers: admins,
    });
    if (res && res.success) {
      return { success: true, message: res.message || 'ซิงค์ข้อมูลผู้ดูแลระบบลง Google Sheets สำเร็จ' };
    }
    throw new Error(res?.message || 'ซิงค์ข้อมูลผู้ดูแลระบบไม่สำเร็จ');
  } catch (err: any) {
    throw new Error(err?.message || 'ไม่สามารถส่งข้อมูลผู้ดูแลระบบไปยัง Apps Script ได้');
  }
}

/**
 * Upsert single Admin User via Apps Script Web App
 */
export async function syncSingleAdminUserViaAppsScript(
  url: string,
  adminUser: AdminUser
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callAppsScriptApi(url, {
      action: 'saveAdminUser',
      adminUser,
    });
    if (res && res.success) {
      return { success: true, message: res.message || 'บันทึกผู้ดูแลระบบลง Google Sheets สำเร็จ' };
    }
    throw new Error(res?.message || 'บันทึกผู้ดูแลระบบไม่สำเร็จ');
  } catch (err: any) {
    throw new Error(err?.message || 'ไม่สามารถส่งข้อมูลผู้ดูแลระบบไปยัง Apps Script ได้');
  }
}

/**
 * Delete single Admin User via Apps Script Web App
 */
export async function deleteAdminUserViaAppsScript(
  url: string,
  adminId: string,
  username?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callAppsScriptApi(url, {
      action: 'deleteAdminUser',
      adminId,
      username,
    });
    if (res && res.success) {
      return { success: true, message: res.message || 'ลบผู้ดูแลระบบจาก Google Sheets สำเร็จ' };
    }
    throw new Error(res?.message || 'ลบผู้ดูแลระบบไม่สำเร็จ');
  } catch (err: any) {
    throw new Error(err?.message || 'ไม่สามารถส่งคำสั่งลบไปยัง Apps Script ได้');
  }
}

/**
 * Sync only checklist templates (3 sheets) via Apps Script Web App
 */
export async function syncChecklistTemplatesViaAppsScript(
  url: string,
  templates: ChecklistTemplatesState
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await callAppsScriptApi(url, {
      action: 'saveChecklistTemplates',
      checklistTemplates: templates,
    });
    if (res && res.success) {
      return { success: true, message: res.message || 'ซิงค์รายการตรวจเช็คลง Google Sheets สำเร็จ' };
    }
    throw new Error(res?.message || 'ซิงค์รายการตรวจเช็คไม่สำเร็จ');
  } catch (err: any) {
    throw new Error(err?.message || 'ไม่สามารถส่งรายการตรวจเช็คไปยัง Apps Script ได้');
  }
}

/**
 * Creates or retrieves the Google Spreadsheet
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  const existingId = getSavedSpreadsheetId();

  if (existingId && existingId !== DEFAULT_SPREADSHEET_ID) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const info: SpreadsheetInfo = {
          id: existingId,
          url: `https://docs.google.com/spreadsheets/d/${existingId}/edit`,
          title: data.properties?.title || 'ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน',
        };
        saveSpreadsheetInfo(info);
        return info;
      }
    } catch (err) {
      console.warn('Could not load saved spreadsheet, will create new:', err);
    }
  }

  // Create new spreadsheet with 4 dedicated sheets
  const newSheetPayload = {
    properties: {
      title: `ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน - กฟภ. (PEA)`,
    },
    sheets: [
      {
        properties: {
          title: 'ประวัติการตรวจเช็ค',
          gridProperties: { rowCount: 500, columnCount: 20 },
        },
      },
      {
        properties: {
          title: 'ข้อมูลยานพาหนะ',
          gridProperties: { rowCount: 150, columnCount: 16 },
        },
      },
      {
        properties: {
          title: 'ข้อมูลผู้ดูแลระบบ',
          gridProperties: { rowCount: 60, columnCount: 12 },
        },
      },
      {
        properties: {
          title: 'สรุปแยกตามการไฟฟ้า',
          gridProperties: { rowCount: 60, columnCount: 12 },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newSheetPayload),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`สร้าง Google Sheets ไม่สำเร็จ: ${errorText}`);
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  saveSpreadsheetId(spreadsheetId);

  // Initialize header rows
  await initializeHeaders(accessToken, spreadsheetId);

  const info: SpreadsheetInfo = {
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: createdData.properties?.title || 'ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน - กฟภ.',
  };
  saveSpreadsheetInfo(info);
  return info;
}

export async function initializeHeaders(accessToken: string, spreadsheetId: string) {
  const inspectionHeaders = [
    [
      'รหัสการตรวจ',
      'วัน-เวลาที่ตรวจ',
      'การไฟฟ้าที่สังกัด',
      'ทะเบียนรถ',
      'ประเภทกลุ่มรถ',
      'ประเภทย่อย',
      'ยี่ห้อ / รุ่น',
      'เลขไมล์ (กม.)',
      'ผู้ตรวจสอบ / คนขับ',
      'เบอร์ติดต่อ',
      'แผนก / สังกัด',
      'ภารกิจ / งาน',
      'ผลการตรวจรวม',
      'จำนวนข้อผ่าน',
      'จำนวนข้อชำรุด',
      'รายการข้อบกพร่องที่พบ',
      'ความเห็น / หมายเหตุสรุป',
    ],
  ];

  const vehicleHeaders = [
    [
      'รหัสรถ',
      'การไฟฟ้าที่สังกัด',
      'ทะเบียนรถ',
      'จังหวัด',
      'ประเภทกลุ่มรถ',
      'ประเภทย่อย',
      'ยี่ห้อ',
      'รุ่น',
      'แผนก / สังกัด',
      'เลขไมล์ล่าสุด (กม.)',
      'ประเภทเชื้อเพลิง',
      'สถานะรถ',
      'หมายเหตุ',
      'อัปเดตล่าสุด',
    ],
  ];

  const adminHeaders = [
    [
      'รหัสผู้ดูแล',
      'ชื่อผู้ใช้ (Username)',
      'รหัสผ่าน (Password)',
      'ชื่อ-นามสกุล / ตำแหน่ง',
      'ระดับสิทธิ์ (Role)',
      'การไฟฟ้าที่สังกัด',
      'อีเมล',
      'เบอร์โทรศัพท์',
      'สถานะ',
      'วันที่สร้าง',
      'อัปเดตล่าสุด',
    ],
  ];

  const summaryHeaders = [
    [
      'การไฟฟ้าที่สังกัด',
      'จำนวนรถทั้งหมด (คัน)',
      'รถทั่วไป (คัน)',
      'รถบรรทุกติดเครน (คัน)',
      'รถกระเช้า Class C (คัน)',
      'ตรวจแล้ววันนี้ (คัน)',
      'ยังไม่ตรวจวันนี้ (คัน)',
      'สถานะพร้อมใช้งาน (คัน)',
      'ต้องดูแล / ส่งซ่อม (คัน)',
      'อัปเดตล่าสุด',
    ],
  ];

  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A1:Q1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: inspectionHeaders }),
      }
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลยานพาหนะ'!A1:N1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: vehicleHeaders }),
      }
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลผู้ดูแลระบบ'!A1:K1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: adminHeaders }),
      }
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สรุปแยกตามการไฟฟ้า'!A1:J1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: summaryHeaders }),
      }
    );
  } catch (err) {
    console.warn('Error writing headers to sheets:', err);
  }
}

/**
 * Sync entire fleet list to Google Sheet (separated by PEA branch)
 */
export async function syncVehiclesToSheet(
  accessToken: string,
  spreadsheetId: string,
  vehicles: Vehicle[]
): Promise<void> {
  const rows = [
    [
      'รหัสรถ',
      'การไฟฟ้าที่สังกัด',
      'ทะเบียนรถ',
      'จังหวัด',
      'ประเภทกลุ่มรถ',
      'ประเภทย่อย',
      'ยี่ห้อ',
      'รุ่น',
      'แผนก / สังกัด',
      'เลขไมล์ล่าสุด (กม.)',
      'ประเภทเชื้อเพลิง',
      'สถานะรถ',
      'หมายเหตุ',
      'อัปเดตล่าสุด',
    ],
    ...vehicles.map((v) => [
      v.id,
      v.peaBranch || 'กฟภ. สำนักงานใหญ่',
      v.licensePlate,
      v.province,
      VEHICLE_CATEGORY_LABELS[v.category] || (v.category === 'crane_truck' ? 'รถบรรทุกติดเครนไฮดรอลิค' : v.category === 'bucket_truck_class_c' ? 'รถกระเช้า Class C' : 'ยานพาหนะทั่วไป'),
      VEHICLE_TYPE_LABELS[v.vehicleType] || v.vehicleType,
      v.brand,
      v.model,
      v.department,
      v.lastOdometer,
      v.fuelType,
      STATUS_LABELS[v.status] || v.status,
      v.notes || '-',
      new Date(v.updatedAt).toLocaleString('th-TH'),
    ]),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลยานพาหนะ'!A1:N${Math.max(rows.length + 10, 100)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลยานพาหนะ'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    throw new Error('ไม่สามารถบันทึกข้อมูลยานพาหนะลง Google Sheets ได้');
  }
}

/**
 * Append one inspection record row to Google Sheet
 */
export async function appendInspectionToSheet(
  accessToken: string,
  spreadsheetId: string,
  record: InspectionRecord
): Promise<void> {
  const passCount = record.items.filter((i) => i.status === 'pass').length;
  const failItems = record.items.filter((i) => i.status === 'fail');
  const failSummary =
    failItems.length > 0
      ? failItems.map((i) => `• [${i.category}] ${i.title}: ${i.remark || 'ชำรุด/ผิดปกติ'}`).join('\n')
      : 'ไม่มี (ผ่านทุกรายการ)';

  const formattedDate = new Date(record.inspectionDate).toLocaleString('th-TH');

  const row = [
    record.id,
    formattedDate,
    record.peaBranch || 'กฟภ. สำนักงานใหญ่',
    record.vehicleLicensePlate,
    VEHICLE_CATEGORY_LABELS[record.vehicleCategory] || (record.vehicleCategory === 'crane_truck' ? 'รถบรรทุกติดเครนไฮดรอลิค' : record.vehicleCategory === 'bucket_truck_class_c' ? 'รถกระเช้า Class C' : 'ยานพาหนะทั่วไป'),
    VEHICLE_TYPE_LABELS[record.vehicleType] || record.vehicleType,
    `${record.brand} ${record.model}`,
    record.odometer,
    record.inspectorName,
    record.inspectorPhone || '-',
    record.department,
    record.workDescription || '-',
    OVERALL_STATUS_LABELS[record.overallStatus] || record.overallStatus,
    passCount,
    failItems.length,
    failSummary,
    record.summaryRemarks || '-',
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A:Q:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`ไม่สามารถเพิ่มข้อมูลลง Google Sheets: ${errorText}`);
  }
}

/**
 * Sync all inspection records to Google Sheet
 */
export async function syncAllInspectionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  records: InspectionRecord[]
): Promise<void> {
  const header = [
    'รหัสการตรวจ',
    'วัน-เวลาที่ตรวจ',
    'การไฟฟ้าที่สังกัด',
    'ทะเบียนรถ',
    'ประเภทกลุ่มรถ',
    'ประเภทย่อย',
    'ยี่ห้อ / รุ่น',
    'เลขไมล์ (กม.)',
    'ผู้ตรวจสอบ / คนขับ',
    'เบอร์ติดต่อ',
    'แผนก / สังกัด',
    'ภารกิจ / งาน',
    'ผลการตรวจรวม',
    'จำนวนข้อผ่าน',
    'จำนวนข้อชำรุด',
    'รายการข้อบกพร่องที่พบ',
    'ความเห็น / หมายเหตุสรุป',
  ];

  const rows = [
    header,
    ...records.map((r) => {
      const passCount = r.items.filter((i) => i.status === 'pass').length;
      const failItems = r.items.filter((i) => i.status === 'fail');
      const failSummary =
        failItems.length > 0
          ? failItems.map((i) => `• [${i.category}] ${i.title}: ${i.remark || 'ชำรุด'}`).join(' | ')
          : 'ปกติทุกรายการ';
      return [
        r.id,
        new Date(r.inspectionDate).toLocaleString('th-TH'),
        r.peaBranch || 'กฟภ. สำนักงานใหญ่',
        r.vehicleLicensePlate,
        VEHICLE_CATEGORY_LABELS[r.vehicleCategory] || (r.vehicleCategory === 'crane_truck' ? 'รถบรรทุกติดเครนไฮดรอลิค' : r.vehicleCategory === 'bucket_truck_class_c' ? 'รถกระเช้า Class C' : 'ยานพาหนะทั่วไป'),
        VEHICLE_TYPE_LABELS[r.vehicleType] || r.vehicleType,
        `${r.brand} ${r.model}`,
        r.odometer,
        r.inspectorName,
        r.inspectorPhone || '-',
        r.department,
        r.workDescription || '-',
        OVERALL_STATUS_LABELS[r.overallStatus] || r.overallStatus,
        passCount,
        failItems.length,
        failSummary,
        r.summaryRemarks || '-',
      ];
    }),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A1:Q${Math.max(rows.length + 20, 200)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    throw new Error('ไม่สามารถซิงค์ประวัติการตรวจเช็คลง Google Sheets ได้');
  }
}

/**
 * Sync Admin Users to Google Sheet (Tab: 'ข้อมูลผู้ดูแลระบบ')
 */
export async function syncAdminUsersToSheet(
  accessToken: string,
  spreadsheetId: string,
  adminUsers: AdminUser[]
): Promise<void> {
  const rows = [
    [
      'รหัสผู้ดูแล',
      'ชื่อผู้ใช้ (Username)',
      'รหัสผ่าน (Password)',
      'ชื่อ-นามสกุล / ตำแหน่ง',
      'ระดับสิทธิ์ (Role)',
      'การไฟฟ้าที่สังกัด',
      'อีเมล',
      'เบอร์โทรศัพท์',
      'สถานะ',
      'วันที่สร้าง',
      'อัปเดตล่าสุด',
    ],
    ...adminUsers.map((u) => [
      u.id,
      u.username,
      u.password,
      u.displayName,
      ADMIN_ROLE_LABELS[u.role] || u.role,
      u.peaBranch || 'กฟภ. สำนักงานใหญ่',
      u.email || '-',
      u.phone || '-',
      u.status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน',
      new Date(u.createdAt).toLocaleString('th-TH'),
      new Date(u.updatedAt).toLocaleString('th-TH'),
    ]),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลผู้ดูแลระบบ'!A1:K${Math.max(rows.length + 10, 50)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลผู้ดูแลระบบ'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    throw new Error('ไม่สามารถบันทึกข้อมูลผู้ดูแลระบบลง Google Sheets ได้');
  }
}

/**
 * Sync PEA Branch Summary to Google Sheet (Tab: 'สรุปแยกตามการไฟฟ้า')
 */
export async function syncBranchSummaryToSheet(
  accessToken: string,
  spreadsheetId: string,
  vehicles: Vehicle[],
  inspections: InspectionRecord[],
  managedBranches?: string[]
): Promise<void> {
  // Group vehicles by PEA branch, including any managed branches
  const branchPool = managedBranches && managedBranches.length > 0
    ? [...managedBranches, ...vehicles.map((v) => v.peaBranch || 'กฟภ. สำนักงานใหญ่')]
    : vehicles.map((v) => v.peaBranch || 'กฟภ. สำนักงานใหญ่');
  const branches = Array.from(new Set(branchPool));

  // Check today inspections
  const todayStr = new Date().toISOString().split('T')[0];
  const inspectedTodayVehicles = new Set(
    inspections
      .filter((i) => i.inspectionDate.startsWith(todayStr))
      .map((i) => i.vehicleId)
  );

  const rows = [
    [
      'การไฟฟ้าที่สังกัด',
      'จำนวนรถทั้งหมด (คัน)',
      'รถทั่วไป (คัน)',
      'รถบรรทุกติดเครน (คัน)',
      'รถกระเช้า Class C (คัน)',
      'ตรวจแล้ววันนี้ (คัน)',
      'ยังไม่ตรวจวันนี้ (คัน)',
      'สถานะพร้อมใช้งาน (คัน)',
      'ต้องดูแล / ส่งซ่อม (คัน)',
      'อัปเดตล่าสุด',
    ],
    ...branches.map((b) => {
      const bVehicles = vehicles.filter((v) => (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === b);
      const total = bVehicles.length;
      const general = bVehicles.filter((v) => v.category === 'general').length;
      const crane = bVehicles.filter((v) => v.category === 'crane_truck').length;
      const bucket = bVehicles.filter((v) => v.category === 'bucket_truck_class_c').length;
      const inspected = bVehicles.filter((v) => inspectedTodayVehicles.has(v.id)).length;
      const uninspected = total - inspected;
      const ready = bVehicles.filter((v) => v.status === 'ready').length;
      const notReady = total - ready;

      return [
        b,
        total,
        general,
        crane,
        bucket,
        inspected,
        uninspected,
        ready,
        notReady,
        new Date().toLocaleString('th-TH'),
      ];
    }),
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สรุปแยกตามการไฟฟ้า'!A1:J${Math.max(rows.length + 10, 50)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สรุปแยกตามการไฟฟ้า'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    throw new Error('ไม่สามารถบันทึกข้อมูลสรุปแยกตามการไฟฟ้าลง Google Sheets ได้');
  }
}

/**
 * Sync Checklist Templates (3 Categories) to Google Sheets via Direct Sheets API
 */
export async function syncChecklistTemplatesToSheet(
  accessToken: string,
  spreadsheetId: string,
  templates: ChecklistTemplatesState
): Promise<void> {
  const configs: { name: string; categories: InspectionCategoryTemplate[] }[] = [
    { name: 'รายการตรวจ_ยานพาหนะทั่วไป', categories: templates.general || [] },
    { name: 'รายการตรวจ_รถบรรทุกติดเครน', categories: templates.crane_truck || [] },
    { name: 'รายการตรวจ_รถกระเช้าClassC', categories: templates.bucket_truck_class_c || [] },
  ];

  for (const cfg of configs) {
    const rows = [
      ['ลำดับ', 'หมวดหมู่งานตรวจ', 'รหัสรายการ', 'หัวข้อตรวจเช็ค', 'คำอธิบายและเกณฑ์การตรวจ', 'สถานะใช้งาน', 'อัปเดตล่าสุด'],
    ];

    let runningNo = 1;
    for (const cat of cfg.categories) {
      for (const item of cat.items) {
        rows.push([
          String(runningNo++),
          cat.category,
          item.id,
          item.title,
          item.description || '',
          'ใช้งาน',
          new Date().toLocaleString('th-TH'),
        ]);
      }
    }

    try {
      // Clear old rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(cfg.name)}'!A1:G${Math.max(rows.length + 20, 100)}:clear`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      // Write new rows
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodeURIComponent(cfg.name)}'!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        }
      );
    } catch (e) {
      console.warn(`Could not sync ${cfg.name} directly via OAuth:`, e);
    }
  }
}

