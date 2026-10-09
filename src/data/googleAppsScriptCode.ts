/**
 * Google Apps Script Template for PEA Vehicle Inspection System
 * โค้ด Google Apps Script สำหรับนำไปติดตั้งใน Google Sheets เพื่อเชื่อมต่อเป็นฐานข้อมูลกลาง
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน - การไฟฟ้าส่วนภูมิภาค (PEA)
 * Google Apps Script Web App Backend API
 * =========================================================================
 * 
 * วิธีการติดตั้ง:
 * 1. เปิด Google Sheets ที่คุณต้องการใช้เก็บข้อมูล
 * 2. คลิกเมนู "ส่วนขยาย" (Extensions) > "Apps Script"
 * 3. ลบโค้ดที่มีอยู่เดิมทั้งหมด แล้วคัดลอกโค้ดนี้ไปวางแทนที่
 * 4. คลิกปุ่ม "บันทึก" (รูปแผ่นดิสก์ หรือ Ctrl + S)
 * 5. คลิกปุ่ม "การทำให้ใช้งานได้" (Deploy) มุมขวาบน > เลือก "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 * 6. ในช่อง "เลือกประเภท" (Select type) คลิกรูปฟันเฟือง > เลือก "เว็บแอป" (Web app)
 * 7. ตั้งค่าสำคัญ 2 จุด:
 *    - ดำเนินการในฐานะ (Execute as): "ฉัน (Me)"
 *    - ผู้มีสิทธิ์เข้าถึง (Who has access): "ทุกคน (Anyone)"  <-- สำคัญมาก! เพื่อให้ทุกคนใช้งานได้โดยไม่ต้องล็อกอิน
 * 8. คลิก "ทำให้ใช้งานได้" (Deploy) > กดยินยอมให้สิทธิ์ (Authorize access)
 * 9. คัดลอก "URL เว็บแอป" (Web App URL) ที่ลงท้ายด้วย /exec นำไปใส่ในเมนูตั้งค่าของระบบตรวจเช็คสภาพรถ
 */

// ชื่อแผ่นงานทั้งหมดในสเปรดชีต
var SHEET_INSPECTIONS = 'ประวัติการตรวจเช็ค';
var SHEET_VEHICLES = 'ข้อมูลยานพาหนะ';
var SHEET_ADMINS = 'ข้อมูลผู้ดูแลระบบ';
var SHEET_BRANCH_SUMMARY = 'สรุปแยกตามการไฟฟ้า';
var SHEET_BRANCHES = 'รายชื่อการไฟฟ้า';

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureAllSheetsExist(ss);

  if (action === 'ping') {
    return createJsonResponse({
      success: true,
      message: 'เชื่อมต่อ Google Apps Script สำเร็จพร้อมใช้งาน',
      sheetTitle: ss.getName(),
      sheetId: ss.getId(),
      timestamp: new Date().toISOString()
    });
  }

  if (action === 'getAllData') {
    var data = loadAllDataFromSheets(ss);
    return createJsonResponse({
      success: true,
      data: data
    });
  }

  if (action === 'getVehicles') {
    return createJsonResponse({
      success: true,
      vehicles: readVehicles(ss)
    });
  }

  if (action === 'getInspections') {
    return createJsonResponse({
      success: true,
      inspections: readInspections(ss)
    });
  }

  if (action === 'getBranches') {
    return createJsonResponse({
      success: true,
      branches: readBranches(ss)
    });
  }

  return createJsonResponse({
    success: false,
    message: 'ไม่พบคำสั่ง (Unknown action): ' + action
  });
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // รอคิวทำงานเพื่อป้องกัน race condition เมื่อมีผู้ใช้หลายคนส่งพร้อมกัน
    lock.waitLock(15000);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureAllSheetsExist(ss);

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        // Fallback if form encoded
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || 'ping';

    if (action === 'ping') {
      return createJsonResponse({
        success: true,
        message: 'Google Apps Script Web App ตอบรับสำเร็จ',
        sheetTitle: ss.getName(),
        sheetId: ss.getId()
      });
    }

    // 1. ดึงข้อมูลทั้งหมด
    if (action === 'getAllData') {
      var allData = loadAllDataFromSheets(ss);
      return createJsonResponse({
        success: true,
        data: allData
      });
    }

    // 2. บันทึกผลการตรวจสภาพรถ 1 รายการ
    if (action === 'appendInspection' || action === 'saveInspection') {
      var record = payload.record;
      if (!record || !record.id) {
        return createJsonResponse({ success: false, message: 'ไม่มีข้อมูลบันทึกการตรวจ (record is required)' });
      }
      appendSingleInspection(ss, record);
      
      // อัปเดตเลขไมล์และสถานะในตารางยานพาหนะทันที
      updateVehicleOdometerAndStatus(ss, record.vehicleId, record.odometer, record.overallStatus);

      // อัปเดตตารางสรุปการไฟฟ้า
      recalculateBranchSummary(ss);

      return createJsonResponse({
        success: true,
        message: 'บันทึกผลการตรวจทะเบียน ' + (record.vehicleLicensePlate || '') + ' ลง Google Sheets เรียบร้อยแล้ว',
        recordId: record.id
      });
    }

    // 3. บันทึกหรือแก้ไขยานพาหนะ 1 คัน
    if (action === 'saveVehicle') {
      var vehicle = payload.vehicle;
      if (!vehicle || !vehicle.id) {
        return createJsonResponse({ success: false, message: 'ไม่มีข้อมูลยานพาหนะ (vehicle is required)' });
      }
      upsertSingleVehicle(ss, vehicle);
      recalculateBranchSummary(ss);
      return createJsonResponse({
        success: true,
        message: 'บันทึกข้อมูลรถทะเบียน ' + (vehicle.licensePlate || '') + ' สำเร็จ',
        vehicleId: vehicle.id
      });
    }

    // 4. ลบยานพาหนะ
    if (action === 'deleteVehicle') {
      var vehicleId = payload.vehicleId;
      if (!vehicleId) {
        return createJsonResponse({ success: false, message: 'ระบุ vehicleId ที่ต้องการลบ' });
      }
      deleteSingleVehicle(ss, vehicleId);
      recalculateBranchSummary(ss);
      return createJsonResponse({
        success: true,
        message: 'ลบข้อมูลรถรหัส ' + vehicleId + ' สำเร็จ'
      });
    }

    // 5. บันทึกรายชื่อการไฟฟ้า
    if (action === 'saveBranches') {
      var branches = payload.branches || [];
      writeBranches(ss, branches);
      recalculateBranchSummary(ss);
      return createJsonResponse({
        success: true,
        message: 'บันทึกรายชื่อการไฟฟ้า ' + branches.length + ' แห่ง สำเร็จ'
      });
    }

    // 6. ซิงค์ข้อมูลทั้งหมดทั้ง 4-5 แผ่นงาน (Bulk Sync)
    if (action === 'syncAll') {
      if (payload.vehicles && Array.isArray(payload.vehicles)) {
        writeAllVehicles(ss, payload.vehicles);
      }
      if (payload.inspections && Array.isArray(payload.inspections)) {
        writeAllInspections(ss, payload.inspections);
      }
      if (payload.branches && Array.isArray(payload.branches)) {
        writeBranches(ss, payload.branches);
      }
      if (payload.adminUsers && Array.isArray(payload.adminUsers)) {
        writeAdminUsers(ss, payload.adminUsers);
      }
      recalculateBranchSummary(ss);

      return createJsonResponse({
        success: true,
        message: 'ซิงค์ข้อมูลทั้งหมดลง Google Sheets สำเร็จเรียบร้อยแล้ว'
      });
    }

    return createJsonResponse({
      success: false,
      message: 'ไม่พบคำสั่ง (Unknown action): ' + action
    });

  } catch (error) {
    return createJsonResponse({
      success: false,
      error: error.toString(),
      message: 'เกิดข้อผิดพลาดในการประมวลผล: ' + error.message
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

/**
 * ส่ง Response เป็น JSON พร้อมตั้งค่า MIME Type
 */
function createJsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * ตรวจสอบและสร้างแผ่นงานที่จำเป็นทั้ง 5 แผ่น พร้อมหัวตาราง
 */
function ensureAllSheetsExist(ss) {
  var sheetsToCreate = [
    { name: SHEET_INSPECTIONS, headers: getInspectionHeaders() },
    { name: SHEET_VEHICLES, headers: getVehicleHeaders() },
    { name: SHEET_ADMINS, headers: getAdminHeaders() },
    { name: SHEET_BRANCH_SUMMARY, headers: getBranchSummaryHeaders() },
    { name: SHEET_BRANCHES, headers: getBranchesHeaders() }
  ];

  sheetsToCreate.forEach(function(item) {
    var sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
      sheet.appendRow(item.headers);
      styleHeaderRow(sheet, item.headers.length);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(item.headers);
      styleHeaderRow(sheet, item.headers.length);
    }
  });
}

function styleHeaderRow(sheet, colCount) {
  try {
    var range = sheet.getRange(1, 1, 1, colCount);
    range.setFontWeight('bold');
    range.setBackground('#1e293b');
    range.setFontColor('#ffffff');
    range.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
  } catch (e) {}
}

function getInspectionHeaders() {
  return [
    'รหัสการตรวจ',
    'วัน-เวลาที่ตรวจ',
    'การไฟฟ้าที่สังกัด',
    'ทะเบียนรถ',
    'กลุ่มประเภทรถ',
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
    'ความเห็น / หมายเหตุ',
    'JSON_DATA'
  ];
}

function getVehicleHeaders() {
  return [
    'รหัสรถ',
    'การไฟฟ้าที่สังกัด',
    'ทะเบียนรถ',
    'จังหวัด',
    'กลุ่มประเภทรถ',
    'ประเภทย่อย',
    'ยี่ห้อ',
    'รุ่น',
    'แผนก / สังกัด',
    'เลขไมล์ล่าสุด (กม.)',
    'ประเภทเชื้อเพลิง',
    'สถานะรถ',
    'หมายเหตุ',
    'อัปเดตล่าสุด',
    'JSON_DATA'
  ];
}

function getAdminHeaders() {
  return [
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
    'JSON_DATA'
  ];
}

function getBranchSummaryHeaders() {
  return [
    'การไฟฟ้าที่สังกัด',
    'จำนวนรถทั้งหมด (คัน)',
    'รถทั่วไป (คัน)',
    'รถบรรทุกติดเครน (คัน)',
    'รถกระเช้า Class C (คัน)',
    'ตรวจแล้ววันนี้ (คัน)',
    'ยังไม่ตรวจวันนี้ (คัน)',
    'สถานะพร้อมใช้งาน (คัน)',
    'ต้องดูแล / ส่งซ่อม (คัน)',
    'อัปเดตล่าสุด'
  ];
}

function getBranchesHeaders() {
  return [
    'ลำดับ',
    'ชื่อการไฟฟ้า (PEA Branch)',
    'จำนวนรถในสังกัด (คัน)',
    'อัปเดตล่าสุด'
  ];
}

/**
 * แปลงประเภทกลุ่มรถเป็นภาษาไทย
 */
function formatCategoryLabel(cat) {
  if (cat === 'crane_truck') return 'รถบรรทุกติดเครนไฮดรอลิค';
  if (cat === 'bucket_truck_class_c') return 'รถกระเช้า Class C';
  return 'ยานพาหนะทั่วไป';
}

/**
 * แปลงผลการตรวจรวมเป็นภาษาไทย
 */
function formatOverallStatusLabel(st) {
  if (st === 'ready') return 'พร้อมใช้งาน (ผ่าน)';
  if (st === 'conditional') return 'พร้อมใช้งานแบบมีข้อสังเกต';
  if (st === 'not_ready') return 'ไม่พร้อมใช้งาน (ห้ามขับ/ห้ามยก)';
  return st || 'พร้อมใช้งาน';
}

/**
 * เพิ่มประวัติการตรวจเช็ค 1 แถว
 */
function appendSingleInspection(ss, r) {
  var sheet = ss.getSheetByName(SHEET_INSPECTIONS);
  var passCount = 0;
  var failCount = 0;
  var failItems = [];

  if (r.items && Array.isArray(r.items)) {
    passCount = r.items.filter(function(i) { return i.status === 'pass'; }).length;
    failItems = r.items.filter(function(i) { return i.status === 'fail'; });
    failCount = failItems.length;
  }

  var failSummary = failItems.length > 0
    ? failItems.map(function(i) { return '[' + (i.category || '') + '] ' + i.title + ': ' + (i.remark || 'ชำรุด'); }).join(' | ')
    : 'ปกติทุกรายการ';

  var row = [
    r.id || ('insp-' + new Date().getTime()),
    r.inspectionDate ? Utilities.formatDate(new Date(r.inspectionDate), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss') : Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
    r.peaBranch || 'กฟภ. สำนักงานใหญ่',
    r.vehicleLicensePlate || '-',
    formatCategoryLabel(r.vehicleCategory),
    r.vehicleType || '-',
    (r.brand || '') + ' ' + (r.model || ''),
    r.odometer || 0,
    r.inspectorName || '-',
    r.inspectorPhone || '-',
    r.department || '-',
    r.workDescription || '-',
    formatOverallStatusLabel(r.overallStatus),
    passCount,
    failCount,
    failSummary,
    r.summaryRemarks || '-',
    JSON.stringify(r)
  ];

  sheet.appendRow(row);
}

/**
 * อัปเดตเลขไมล์และสถานะในตารางยานพาหนะ
 */
function updateVehicleOdometerAndStatus(ss, vehicleId, odometer, overallStatus) {
  if (!vehicleId) return;
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  var newStatus = 'ready';
  if (overallStatus === 'not_ready') {
    newStatus = 'maintenance';
  } else if (overallStatus === 'conditional') {
    newStatus = 'needs_attention';
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(vehicleId)) {
      var currentOdo = Number(data[i][9]) || 0;
      var newOdo = Math.max(currentOdo, Number(odometer) || 0);
      sheet.getRange(i + 1, 10).setValue(newOdo); // Odometer col J
      sheet.getRange(i + 1, 12).setValue(newStatus); // Status col L
      sheet.getRange(i + 1, 14).setValue(Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'));

      // อัปเดต JSON data ถ้ามี
      try {
        var rawJson = data[i][14];
        if (rawJson) {
          var parsed = JSON.parse(rawJson);
          parsed.lastOdometer = newOdo;
          parsed.status = newStatus;
          parsed.updatedAt = new Date().toISOString();
          sheet.getRange(i + 1, 15).setValue(JSON.stringify(parsed));
        }
      } catch (e) {}
      break;
    }
  }
}

/**
 * เพิ่มหรืออัปเดตรถ 1 คัน
 */
function upsertSingleVehicle(ss, v) {
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  var data = sheet.getDataRange().getValues();
  var rowIdx = -1;

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(v.id)) {
      rowIdx = i + 1;
      break;
    }
  }

  var row = [
    v.id,
    v.peaBranch || 'กฟภ. สำนักงานใหญ่',
    v.licensePlate || '-',
    v.province || '-',
    formatCategoryLabel(v.category),
    v.vehicleType || '-',
    v.brand || '-',
    v.model || '-',
    v.department || '-',
    v.lastOdometer || 0,
    v.fuelType || 'ดีเซล',
    v.status || 'ready',
    v.notes || '-',
    Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
    JSON.stringify(v)
  ];

  if (rowIdx > 0) {
    sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

/**
 * ลบรถ 1 คัน
 */
function deleteSingleVehicle(ss, vehicleId) {
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(vehicleId)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

/**
 * เขียนข้อมูลรถทั้งหมดแบบแทนที่ (Bulk overwrite)
 */
function writeAllVehicles(ss, vehicles) {
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  var headers = getVehicleHeaders();
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (vehicles.length === 0) return;

  var rows = vehicles.map(function(v) {
    return [
      v.id,
      v.peaBranch || 'กฟภ. สำนักงานใหญ่',
      v.licensePlate || '-',
      v.province || '-',
      formatCategoryLabel(v.category),
      v.vehicleType || '-',
      v.brand || '-',
      v.model || '-',
      v.department || '-',
      v.lastOdometer || 0,
      v.fuelType || 'ดีเซล',
      v.status || 'ready',
      v.notes || '-',
      Utilities.formatDate(new Date(v.updatedAt || new Date()), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
      JSON.stringify(v)
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * เขียนประวัติการตรวจเช็คทั้งหมด (Bulk overwrite)
 */
function writeAllInspections(ss, inspections) {
  var sheet = ss.getSheetByName(SHEET_INSPECTIONS);
  var headers = getInspectionHeaders();
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (inspections.length === 0) return;

  var rows = inspections.map(function(r) {
    var passCount = 0;
    var failCount = 0;
    var failItems = [];

    if (r.items && Array.isArray(r.items)) {
      passCount = r.items.filter(function(i) { return i.status === 'pass'; }).length;
      failItems = r.items.filter(function(i) { return i.status === 'fail'; });
      failCount = failItems.length;
    }

    var failSummary = failItems.length > 0
      ? failItems.map(function(i) { return '[' + (i.category || '') + '] ' + i.title + ': ' + (i.remark || 'ชำรุด'); }).join(' | ')
      : 'ปกติทุกรายการ';

    return [
      r.id,
      Utilities.formatDate(new Date(r.inspectionDate || new Date()), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
      r.peaBranch || 'กฟภ. สำนักงานใหญ่',
      r.vehicleLicensePlate || '-',
      formatCategoryLabel(r.vehicleCategory),
      r.vehicleType || '-',
      (r.brand || '') + ' ' + (r.model || ''),
      r.odometer || 0,
      r.inspectorName || '-',
      r.inspectorPhone || '-',
      r.department || '-',
      r.workDescription || '-',
      formatOverallStatusLabel(r.overallStatus),
      passCount,
      failCount,
      failSummary,
      r.summaryRemarks || '-',
      JSON.stringify(r)
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * เขียนรายชื่อการไฟฟ้า (Sheet: รายชื่อการไฟฟ้า)
 */
function writeBranches(ss, branches) {
  var sheet = ss.getSheetByName(SHEET_BRANCHES);
  var headers = getBranchesHeaders();
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (!branches || branches.length === 0) return;

  var vehicles = readVehicles(ss);
  var rows = branches.map(function(b, idx) {
    var count = vehicles.filter(function(v) { return (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === b; }).length;
    return [
      idx + 1,
      b,
      count,
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss')
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * เขียนข้อมูลผู้ดูแลระบบ
 */
function writeAdminUsers(ss, admins) {
  var sheet = ss.getSheetByName(SHEET_ADMINS);
  var headers = getAdminHeaders();
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (!admins || admins.length === 0) return;

  var rows = admins.map(function(u) {
    return [
      u.id,
      u.username,
      u.password || '******',
      u.displayName,
      u.role,
      u.peaBranch || 'กฟภ. สำนักงานใหญ่',
      u.email || '-',
      u.phone || '-',
      u.status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน',
      Utilities.formatDate(new Date(u.createdAt || new Date()), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
      Utilities.formatDate(new Date(u.updatedAt || new Date()), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
      JSON.stringify(u)
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * คำนวณสรุปแยกตามการไฟฟ้าอัตโนมัติ (Sheet: สรุปแยกตามการไฟฟ้า)
 */
function recalculateBranchSummary(ss) {
  var vehicles = readVehicles(ss);
  var inspections = readInspections(ss);
  var branchList = readBranches(ss);

  // รวบรวมรายชื่อการไฟฟ้าทั้งหมดจากตารางรถและตารางรายชื่อ
  var branchSet = {};
  branchList.forEach(function(b) { branchSet[b] = true; });
  vehicles.forEach(function(v) {
    var b = v.peaBranch || 'กฟภ. สำนักงานใหญ่';
    branchSet[b] = true;
  });

  var branches = Object.keys(branchSet);
  if (branches.length === 0) {
    branches = ['กฟภ. สำนักงานใหญ่'];
  }

  // วันที่ปัจจุบัน (YYYY-MM-DD)
  var todayStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
  var inspectedTodayVehicles = {};
  inspections.forEach(function(i) {
    if (i.inspectionDate && i.inspectionDate.indexOf(todayStr) === 0) {
      inspectedTodayVehicles[i.vehicleId] = true;
    }
  });

  var rows = branches.map(function(b) {
    var bVehicles = vehicles.filter(function(v) { return (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === b; });
    var total = bVehicles.length;
    var general = bVehicles.filter(function(v) { return v.category === 'general'; }).length;
    var crane = bVehicles.filter(function(v) { return v.category === 'crane_truck'; }).length;
    var bucket = bVehicles.filter(function(v) { return v.category === 'bucket_truck_class_c'; }).length;
    var inspected = bVehicles.filter(function(v) { return inspectedTodayVehicles[v.id]; }).length;
    var uninspected = total - inspected;
    var ready = bVehicles.filter(function(v) { return v.status === 'ready'; }).length;
    var notReady = total - ready;

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
      Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss')
    ];
  });

  var sheet = ss.getSheetByName(SHEET_BRANCH_SUMMARY);
  var headers = getBranchSummaryHeaders();
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * อ่านข้อมูลรถทั้งหมดจากแผ่นงาน
 */
function readVehicles(ss) {
  var sheet = ss.getSheetByName(SHEET_VEHICLES);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var jsonRaw = row[14];
    if (jsonRaw) {
      try {
        result.push(JSON.parse(jsonRaw));
        continue;
      } catch (e) {}
    }
    // Fallback from row columns
    result.push({
      id: String(row[0]),
      peaBranch: String(row[1] || 'กฟภ. สำนักงานใหญ่'),
      licensePlate: String(row[2] || ''),
      province: String(row[3] || 'กรุงเทพมหานคร'),
      category: row[4] === 'รถบรรทุกติดเครนไฮดรอลิค' ? 'crane_truck' : row[4] === 'รถกระเช้า Class C' ? 'bucket_truck_class_c' : 'general',
      vehicleType: String(row[5] || 'pickup'),
      brand: String(row[6] || ''),
      model: String(row[7] || ''),
      department: String(row[8] || ''),
      lastOdometer: Number(row[9]) || 0,
      fuelType: String(row[10] || 'ดีเซล'),
      status: String(row[11] || 'ready'),
      notes: String(row[12] || ''),
      updatedAt: new Date().toISOString()
    });
  }
  return result;
}

/**
 * อ่านประวัติการตรวจเช็คทั้งหมดจากแผ่นงาน
 */
function readInspections(ss) {
  var sheet = ss.getSheetByName(SHEET_INSPECTIONS);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var jsonRaw = row[17];
    if (jsonRaw) {
      try {
        result.push(JSON.parse(jsonRaw));
        continue;
      } catch (e) {}
    }
    result.push({
      id: String(row[0]),
      inspectionDate: new Date().toISOString(),
      peaBranch: String(row[2] || 'กฟภ. สำนักงานใหญ่'),
      vehicleLicensePlate: String(row[3] || ''),
      vehicleCategory: 'general',
      vehicleType: String(row[5] || ''),
      brand: '',
      model: '',
      odometer: Number(row[7]) || 0,
      inspectorName: String(row[8] || ''),
      inspectorPhone: String(row[9] || ''),
      department: String(row[10] || ''),
      workDescription: String(row[11] || ''),
      overallStatus: 'ready',
      items: [],
      summaryRemarks: String(row[16] || '')
    });
  }
  return result;
}

/**
 * อ่านรายชื่อการไฟฟ้า
 */
function readBranches(ss) {
  var sheet = ss.getSheetByName(SHEET_BRANCHES);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var name = String(data[i][1] || '').trim();
    if (name) result.push(name);
  }
  return result;
}

/**
 * โหลดข้อมูลทั้งหมดรวมกัน
 */
function loadAllDataFromSheets(ss) {
  return {
    vehicles: readVehicles(ss),
    inspections: readInspections(ss),
    branches: readBranches(ss),
    spreadsheetTitle: ss.getName(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}
`;
