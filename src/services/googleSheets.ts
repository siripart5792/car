import { Vehicle, InspectionRecord } from '../types/vehicle';

const SPREADSHEET_STORAGE_KEY = 'vehicle_inspection_spreadsheet_id';

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

const VEHICLE_TYPE_LABELS: Record<string, string> = {
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

const STATUS_LABELS: Record<string, string> = {
  ready: 'พร้อมใช้งาน',
  needs_attention: 'มีข้อสังเกต/ต้องดูแล',
  maintenance: 'ส่งซ่อม/ระงับใช้',
};

const OVERALL_STATUS_LABELS: Record<string, string> = {
  ready: 'พร้อมใช้งาน (ผ่าน)',
  conditional: 'พร้อมใช้งานแบบมีข้อสังเกต',
  not_ready: 'ไม่พร้อมใช้งาน (ห้ามขับ/ห้ามยก)',
};

export const getSavedSpreadsheetId = (): string | null => {
  return localStorage.getItem(SPREADSHEET_STORAGE_KEY);
};

export const saveSpreadsheetId = (id: string): void => {
  localStorage.setItem(SPREADSHEET_STORAGE_KEY, id);
};

export const clearSpreadsheetId = (): void => {
  localStorage.removeItem(SPREADSHEET_STORAGE_KEY);
};

/**
 * Creates or retrieves the Google Spreadsheet
 */
export async function getOrCreateSpreadsheet(accessToken: string): Promise<SpreadsheetInfo> {
  const existingId = getSavedSpreadsheetId();

  if (existingId) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${existingId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: existingId,
          url: `https://docs.google.com/spreadsheets/d/${existingId}/edit`,
          title: data.properties?.title || 'ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน',
        };
      }
    } catch (err) {
      console.warn('Could not load saved spreadsheet, will create new:', err);
    }
  }

  // Create new spreadsheet
  const newSheetPayload = {
    properties: {
      title: `ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน - บันทึกข้อมูล`,
    },
    sheets: [
      {
        properties: {
          title: 'ประวัติการตรวจเช็ค',
          gridProperties: { rowCount: 150, columnCount: 18 },
        },
      },
      {
        properties: {
          title: 'ข้อมูลยานพาหนะ',
          gridProperties: { rowCount: 60, columnCount: 14 },
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

  return {
    id: spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    title: createdData.properties?.title || 'ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน',
  };
}

async function initializeHeaders(accessToken: string, spreadsheetId: string) {
  const inspectionHeaders = [
    [
      'รหัสการตรวจ',
      'วัน-เวลาที่ตรวจ',
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

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A1:P1?valueInputOption=USER_ENTERED`,
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลยานพาหนะ'!A1:M1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: vehicleHeaders }),
    }
  );
}

/**
 * Sync entire fleet list to Google Sheet
 */
export async function syncVehiclesToSheet(
  accessToken: string,
  spreadsheetId: string,
  vehicles: Vehicle[]
): Promise<void> {
  const rows = [
    [
      'รหัสรถ',
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
      v.licensePlate,
      v.province,
      VEHICLE_CATEGORY_LABELS[v.category] || (v.category === 'crane_truck' ? 'รถบรรทุกติดเครนไฮดรอลิค' : 'ยานพาหนะทั่วไป'),
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ข้อมูลยานพาหนะ'!A1:M${Math.max(rows.length + 10, 100)}:clear`,
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
    record.vehicleLicensePlate,
    VEHICLE_CATEGORY_LABELS[record.vehicleCategory] || (record.vehicleCategory === 'crane_truck' ? 'รถบรรทุกติดเครนไฮดรอลิค' : 'ยานพาหนะทั่วไป'),
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
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
        r.vehicleLicensePlate,
        VEHICLE_CATEGORY_LABELS[r.vehicleCategory] || (r.vehicleCategory === 'crane_truck' ? 'รถบรรทุกติดเครนไฮดรอลิค' : 'ยานพาหนะทั่วไป'),
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
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติการตรวจเช็ค'!A1:P${Math.max(rows.length + 20, 200)}:clear`,
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
