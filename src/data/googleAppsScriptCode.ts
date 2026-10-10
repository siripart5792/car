/**
 * Google Apps Script Template for PEA Vehicle Inspection System
 * โค้ด Google Apps Script สำหรับนำไปติดตั้งใน Google Sheets เพื่อเชื่อมต่อเป็นฐานข้อมูลกลาง
 * รองรับการเก็บและจัดการรายการตรวจเช็คของยานพาหนะแต่ละประเภท
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * ระบบตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน - การไฟฟ้าส่วนภูมิภาค (PEA)
 * Google Apps Script Web App Backend API (รองรับ 8 แผ่นงาน รวมรายการตรวจเช็ค)
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
 *    - ผู้มีสิทธิ์เข้าถึง (Who has access): "ทุกคน (Anyone)"  <-- สำคัญมาก! เพื่อให้ระบบดึงและบันทึกข้อมูลได้ทันที
 * 8. คลิก "ทำให้ใช้งานได้" (Deploy) > กดยินยอมให้สิทธิ์ (Authorize access)
 * 9. คัดลอก "URL เว็บแอป" (Web App URL) ที่ลงท้ายด้วย /exec นำไปใส่ในเมนูตั้งค่าของระบบตรวจเช็คสภาพรถ
 */

// ชื่อแผ่นงานทั้งหมดในสเปรดชีต (8 แผ่นงาน)
var SHEET_INSPECTIONS = 'ประวัติการตรวจเช็ค';
var SHEET_VEHICLES = 'ข้อมูลยานพาหนะ';
var SHEET_ADMINS = 'ข้อมูลผู้ดูแลระบบ';
var SHEET_BRANCH_SUMMARY = 'สรุปแยกตามการไฟฟ้า';
var SHEET_BRANCHES = 'รายชื่อการไฟฟ้า';
var SHEET_CHECKLIST_GENERAL = 'รายการตรวจ_ยานพาหนะทั่วไป';
var SHEET_CHECKLIST_CRANE = 'รายการตรวจ_รถบรรทุกติดเครน';
var SHEET_CHECKLIST_BUCKET = 'รายการตรวจ_รถกระเช้าClassC';

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

  if (action === 'getChecklists') {
    return createJsonResponse({
      success: true,
      checklistTemplates: readAllChecklists(ss)
    });
  }

  if (action === 'getAdmins' || action === 'getAdminUsers') {
    return createJsonResponse({
      success: true,
      adminUsers: readAdmins(ss),
      count: readAdmins(ss).length
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

    // 6. บันทึกหรืออัปเดตรายการตรวจเช็คทั้ง 3 ประเภท (Checklist Templates)
    if (action === 'saveChecklistTemplates' || action === 'saveChecklists') {
      var templates = payload.checklistTemplates || {};
      writeAllChecklists(ss, templates);
      return createJsonResponse({
        success: true,
        message: 'บันทึกรายการตรวจเช็คทั้ง 3 ประเภทลง Google Sheets เรียบร้อยแล้ว',
        checklistTemplates: readAllChecklists(ss)
      });
    }

    // 7. บันทึกหรืออัปเดตข้อมูลผู้ดูแลระบบทั้งหมด (Admin Users - แผ่นงาน 'ข้อมูลผู้ดูแลระบบ')
    if (action === 'saveAdminUsers' || action === 'saveAdmins') {
      var adminsToSave = payload.adminUsers || payload.admins || [];
      writeAdminUsers(ss, adminsToSave);
      return createJsonResponse({
        success: true,
        message: 'บันทึกข้อมูลผู้ดูแลระบบ ' + adminsToSave.length + ' ท่าน ลง Google Sheets แผ่นงาน ข้อมูลผู้ดูแลระบบ สำเร็จ',
        adminUsers: readAdmins(ss),
        count: adminsToSave.length
      });
    }

    // 7.1 บันทึกหรืออัปเดตผู้ดูแลระบบ 1 ท่าน (Upsert Single Admin)
    if (action === 'saveAdminUser') {
      var singleAdmin = payload.adminUser || payload.admin;
      if (!singleAdmin || !singleAdmin.username) {
        return createJsonResponse({ success: false, message: 'ระบุข้อมูลผู้ดูแลระบบ (adminUser is required)' });
      }
      var existingAdmins = readAdmins(ss);
      var adminFound = false;
      for (var a = 0; a < existingAdmins.length; a++) {
        if (existingAdmins[a].id === singleAdmin.id || existingAdmins[a].username.toLowerCase() === singleAdmin.username.toLowerCase()) {
          existingAdmins[a] = singleAdmin;
          adminFound = true;
          break;
        }
      }
      if (!adminFound) {
        existingAdmins.push(singleAdmin);
      }
      writeAdminUsers(ss, existingAdmins);
      return createJsonResponse({
        success: true,
        message: 'บันทึกข้อมูลผู้ดูแลระบบ @' + singleAdmin.username + ' สำเร็จ',
        adminUsers: readAdmins(ss)
      });
    }

    // 7.2 ลบผู้ดูแลระบบ 1 ท่าน (Delete Single Admin)
    if (action === 'deleteAdminUser') {
      var adminIdToDelete = payload.adminId;
      var adminUsernameToDelete = payload.username;
      if (!adminIdToDelete && !adminUsernameToDelete) {
        return createJsonResponse({ success: false, message: 'ระบุ adminId หรือ username ที่ต้องการลบ' });
      }
      var allAdmins = readAdmins(ss);
      var filteredAdmins = allAdmins.filter(function(u) {
        if (adminIdToDelete && u.id === adminIdToDelete) return false;
        if (adminUsernameToDelete && u.username.toLowerCase() === String(adminUsernameToDelete).toLowerCase()) return false;
        return true;
      });
      writeAdminUsers(ss, filteredAdmins);
      return createJsonResponse({
        success: true,
        message: 'ลบผู้ดูแลระบบจาก Google Sheets สำเร็จ',
        adminUsers: readAdmins(ss)
      });
    }

    // 8. ซิงค์ข้อมูลทั้งหมดทั้ง 8 แผ่นงาน (Bulk Sync)
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
      if (payload.checklistTemplates) {
        writeAllChecklists(ss, payload.checklistTemplates);
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
 * ตรวจสอบและสร้างแผ่นงานที่จำเป็นทั้ง 8 แผ่น พร้อมหัวตารางและค่าเริ่มต้น
 */
function ensureAllSheetsExist(ss) {
  var sheetsToCreate = [
    { name: SHEET_INSPECTIONS, headers: getInspectionHeaders() },
    { name: SHEET_VEHICLES, headers: getVehicleHeaders() },
    { name: SHEET_ADMINS, headers: getAdminHeaders() },
    { name: SHEET_BRANCH_SUMMARY, headers: getBranchSummaryHeaders() },
    { name: SHEET_BRANCHES, headers: getBranchesHeaders() },
    { name: SHEET_CHECKLIST_GENERAL, headers: getChecklistHeaders(), defaultType: 'general' },
    { name: SHEET_CHECKLIST_CRANE, headers: getChecklistHeaders(), defaultType: 'crane_truck' },
    { name: SHEET_CHECKLIST_BUCKET, headers: getChecklistHeaders(), defaultType: 'bucket_truck_class_c' }
  ];

  sheetsToCreate.forEach(function(item) {
    var sheet = ss.getSheetByName(item.name);
    var isNew = false;
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
      sheet.appendRow(item.headers);
      styleHeaderRow(sheet, item.headers.length);
      isNew = true;
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(item.headers);
      styleHeaderRow(sheet, item.headers.length);
      isNew = true;
    }

    // ถ้าเป็นแผ่นงานรายการตรวจที่เพิ่งสร้างใหม่หรือว่างเปล่า ให้ใส่ค่าเริ่มต้นทันที
    if (isNew && item.defaultType) {
      populateDefaultChecklistSheet(sheet, item.defaultType);
    }

    // ถ้าเป็นแผ่นงานผู้ดูแลระบบที่เพิ่งสร้างใหม่หรือว่างเปล่า ให้ใส่ค่าเริ่มต้นทันที
    if (isNew && item.name === SHEET_ADMINS) {
      populateDefaultAdminsSheet(sheet);
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

function getChecklistHeaders() {
  return [
    'ลำดับ',
    'หมวดหมู่งานตรวจ',
    'รหัสรายการ',
    'หัวข้อตรวจเช็ค',
    'คำอธิบายและเกณฑ์การตรวจ',
    'สถานะใช้งาน',
    'อัปเดตล่าสุด',
    'JSON_DATA'
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
      u.password || '',
      u.displayName,
      u.role,
      u.peaBranch || 'กฟส.หลังสวน',
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
 * ใส่บัญชีผู้ดูแลระบบเริ่มต้นสำหรับแผ่นงานที่สร้างใหม่
 */
function populateDefaultAdminsSheet(sheet) {
  var defaultAdmins = [
    {
      id: 'admin-root',
      username: 'admin',
      password: 'Pea*123456',
      displayName: 'ผู้ดูแลระบบหลัก (Super Admin)',
      role: 'super_admin',
      peaBranch: 'กฟส.หลังสวน',
      email: 'computerpea2564@gmail.com',
      phone: '081-234-5678',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-10-07T00:00:00Z'
    },
    {
      id: 'admin-supervisor',
      username: 'supervisor',
      password: 'Pea*123456',
      displayName: 'จป.วิชาชีพ (Fleet Supervisor)',
      role: 'supervisor',
      peaBranch: 'กฟส.หลังสวน',
      email: 'fleet.supervisor@pea.co.th',
      phone: '089-999-8888',
      status: 'active',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-10-07T00:00:00Z'
    }
  ];

  var headers = getAdminHeaders();
  var rows = defaultAdmins.map(function(u) {
    return [
      u.id,
      u.username,
      u.password,
      u.displayName,
      u.role,
      u.peaBranch,
      u.email,
      u.phone,
      u.status === 'active' ? 'เปิดใช้งาน' : 'ระงับการใช้งาน',
      Utilities.formatDate(new Date(u.createdAt), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
      Utilities.formatDate(new Date(u.updatedAt), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
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
 * =========================================================================
 * ฟังก์ชันจัดการรายการตรวจเช็ค (Checklist Templates) แยก 3 แผ่นงาน
 * =========================================================================
 */

/**
 * อ่านรายการตรวจเช็คจากแผ่นงานที่ระบุ
 */
function readChecklistFromSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var categoryMap = {};
  var categoryOrder = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var categoryName = String(row[1] || '').trim();
    if (!categoryName) continue;

    var itemId = String(row[2] || ('item_' + i));
    var itemTitle = String(row[3] || '').trim();
    if (!itemTitle) continue;

    var itemDesc = String(row[4] || '');
    var itemStatus = String(row[5] || 'ใช้งาน');

    // ข้ามรายการที่ปิดใช้งาน (ถ้ามีระบุ)
    if (itemStatus === 'ระงับ' || itemStatus === 'ปิดใช้งาน' || itemStatus === 'deleted') {
      continue;
    }

    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = [];
      categoryOrder.push(categoryName);
    }

    categoryMap[categoryName].push({
      id: itemId,
      title: itemTitle,
      description: itemDesc
    });
  }

  return categoryOrder.map(function(catName) {
    return {
      category: catName,
      items: categoryMap[catName]
    };
  });
}

/**
 * เขียนรายการตรวจเช็กลงในแผ่นงานที่ระบุ (Bulk overwrite)
 */
function writeChecklistToSheet(ss, sheetName, categories) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  var headers = getChecklistHeaders();
  sheet.clearContents();
  sheet.appendRow(headers);
  styleHeaderRow(sheet, headers.length);

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return;
  }

  var rows = [];
  var runningNumber = 1;

  categories.forEach(function(cat) {
    var catName = String(cat.category || '').trim();
    if (!catName) return;

    var items = cat.items || [];
    if (items.length === 0) {
      // บันทึกหมวดหมู่แม้จะยังไม่มีรายการตรวจ
      rows.push([
        runningNumber++,
        catName,
        'cat_placeholder_' + runningNumber,
        '(หมวดหมู่ว่าง - สามารถเพิ่มรายการได้)',
        '',
        'ใช้งาน',
        Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
        ''
      ]);
    } else {
      items.forEach(function(item) {
        rows.push([
          runningNumber++,
          catName,
          item.id || ('item_' + runningNumber),
          item.title || '-',
          item.description || '',
          'ใช้งาน',
          Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
          JSON.stringify(item)
        ]);
      });
    }
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    // จัดรูปแบบคอลัมน์ให้อ่านง่าย
    try {
      sheet.getRange(2, 1, rows.length, 1).setHorizontalAlignment('center');
      sheet.getRange(2, 6, rows.length, 1).setHorizontalAlignment('center');
    } catch (e) {}
  }
}

/**
 * อ่านรายการตรวจเช็คทั้ง 3 แผ่นงาน
 */
function readAllChecklists(ss) {
  var general = readChecklistFromSheet(ss, SHEET_CHECKLIST_GENERAL);
  var crane = readChecklistFromSheet(ss, SHEET_CHECKLIST_CRANE);
  var bucket = readChecklistFromSheet(ss, SHEET_CHECKLIST_BUCKET);

  // หากแผ่นงานยังไม่มีรายการ ให้ใช้ค่ามาตรฐาน
  if (!general || general.length === 0) {
    general = getDefaultChecklistData('general');
    writeChecklistToSheet(ss, SHEET_CHECKLIST_GENERAL, general);
  }
  if (!crane || crane.length === 0) {
    crane = getDefaultChecklistData('crane_truck');
    writeChecklistToSheet(ss, SHEET_CHECKLIST_CRANE, crane);
  }
  if (!bucket || bucket.length === 0) {
    bucket = getDefaultChecklistData('bucket_truck_class_c');
    writeChecklistToSheet(ss, SHEET_CHECKLIST_BUCKET, bucket);
  }

  return {
    general: general,
    crane_truck: crane,
    bucket_truck_class_c: bucket
  };
}

/**
 * บันทึกรายการตรวจเช็คทั้ง 3 แผ่นงาน
 */
function writeAllChecklists(ss, templates) {
  if (!templates) return;
  if (templates.general && Array.isArray(templates.general)) {
    writeChecklistToSheet(ss, SHEET_CHECKLIST_GENERAL, templates.general);
  }
  if (templates.crane_truck && Array.isArray(templates.crane_truck)) {
    writeChecklistToSheet(ss, SHEET_CHECKLIST_CRANE, templates.crane_truck);
  }
  if (templates.bucket_truck_class_c && Array.isArray(templates.bucket_truck_class_c)) {
    writeChecklistToSheet(ss, SHEET_CHECKLIST_BUCKET, templates.bucket_truck_class_c);
  }
}

/**
 * เติมค่าเริ่มต้นสำหรับแผ่นงานรายการตรวจเช็คที่เพิ่งสร้างใหม่
 */
function populateDefaultChecklistSheet(sheet, type) {
  var categories = getDefaultChecklistData(type);
  if (!categories || categories.length === 0) return;

  var headers = getChecklistHeaders();
  var rows = [];
  var runningNumber = 1;

  categories.forEach(function(cat) {
    var catName = cat.category;
    (cat.items || []).forEach(function(item) {
      rows.push([
        runningNumber++,
        catName,
        item.id,
        item.title,
        item.description || '',
        'ใช้งาน',
        Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm:ss'),
        JSON.stringify(item)
      ]);
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

/**
 * ข้อมูลรายการตรวจเช็คมาตรฐาน (PEA Default Checklists)
 */
function getDefaultChecklistData(type) {
  if (type === 'general') {
    return [
      {
        category: '1. ของเหลวและห้องเครื่องยนต์',
        items: [
          { id: 'gen_eng_oil', title: 'ระดับน้ำมันเครื่อง', description: 'ก้านวัดระดับน้ำมันอยู่ในเกณฑ์ปกติ (Min-Max) สีไม่ดำข้นผิดปกติ' },
          { id: 'gen_brake_fluid', title: 'ระดับน้ำมันเบรก / คลัตช์', description: 'ระดับน้ำมันในกระปุกอยู่ในเกณฑ์กำหนด ไม่รั่วซึม' },
          { id: 'gen_coolant', title: 'ระดับน้ำหล่อเย็นในหม้อน้ำและถังพัก', description: 'ระดับน้ำหล่อเย็นไม่แห้งหรือต่ำกว่าเกณฑ์ ฝาปิดสนิท' },
          { id: 'gen_washer_fluid', title: 'น้ำฉีดกระจก', description: 'มีน้ำเพียงพอ หัวฉีดไม่อุดตัน' },
          { id: 'gen_leaks', title: 'การรั่วซึมใต้ท้องรถและห้องเครื่อง', description: 'ไม่มีคราบน้ำมันหรือน้ำหยดผิดปกติใต้ท้องรถ' },
          { id: 'gen_battery', title: 'สภาพแบตเตอรี่และขั้วต่อ', description: 'ขั้วแน่น ไม่มีขี้เกลือเกาะ สายไฟไม่อยู่ในสภาพชำรุด' }
        ]
      },
      {
        category: '2. ระบบไฟส่องสว่างและสัญญาณ',
        items: [
          { id: 'gen_headlights', title: 'ไฟหน้า (ไฟต่ำ / ไฟสูง)', description: 'ติดครบสองข้าง สว่างปกติ ปรับระดับได้' },
          { id: 'gen_turn_signals', title: 'ไฟเลี้ยว (หน้า-หลัง ซ้าย-ขวา)', description: 'กะพริบปกติ จังหวะสม่ำเสมอทั้งซ้ายและขวา' },
          { id: 'gen_brake_lights', title: 'ไฟเบรก และไฟเบรกดวงที่ 3', description: 'สว่างชัดเจนเมื่อเหยียบเบรก' },
          { id: 'gen_reverse_lights', title: 'ไฟถอยหลัง และสัญญาณเสียงเตือนถอย', description: 'ติดเมื่อเข้าเกียร์ถอยหลัง พร้อมสัญญาณเสียงทำงาน' },
          { id: 'gen_hazard_lights', title: 'ไฟฉุกเฉิน (ไฟผ่าหมาก)', description: 'กะพริบพร้อมกัน 4 จุด เมื่อกดสวิตช์' },
          { id: 'gen_horn', title: 'สัญญาณแตรรถ', description: 'เสียงดังชัดเจน ไม่ขาดหาย' }
        ]
      },
      {
        category: '3. ยาง ล้อ และช่วงล่าง',
        items: [
          { id: 'gen_tire_pressure', title: 'แรงดันลมยางทั้ง 4 ล้อ', description: 'แรงดันลมยางไม่อ่อนหรือแข็งเกินเกณฑ์' },
          { id: 'gen_tire_condition', title: 'สภาพดอกยางและแก้มยาง', description: 'ดอกยางลึกพอ ไม่บวม ไม่มีรอยแตกหรือตะปูตำ' },
          { id: 'gen_wheel_nuts', title: 'น็อตล้อทุกตัว', description: 'ขันแน่นครบทุกตัว ไม่มีน็อตหลวมหรือสูญหาย' },
          { id: 'gen_spare_tire', title: 'ยางอะไหล่และอุปกรณ์เปลี่ยนยาง', description: 'มีลมยางอะไหล่ แม่แรง และประแจขันล้อพร้อมใช้' }
        ]
      },
      {
        category: '4. ระบบควบคุมและเบรก',
        items: [
          { id: 'gen_foot_brake', title: 'แป้นเบรกเท้า', description: 'ระยะเหยียบปกติ เบรกไม่จม ไม่ยวบยาบ' },
          { id: 'gen_hand_brake', title: 'เบรกมือ / เบรกจอด', description: 'ดึงล็อกแน่นหนา ปลดล็อกคลายตัวได้ดี' },
          { id: 'gen_steering', title: 'พวงมาลัยและการบังคับเลี้ยว', description: 'ไม่มีอาการหลวมคลอน ระยะฟรีปกติ หมุนไม่ติดขัด' },
          { id: 'gen_dashboard_warning', title: 'ไฟเตือนบนหน้าปัดเรือนไมล์', description: 'ไม่มีไฟเตือน Check Engine / ABS / Airbag / Battery ค้าง' }
        ]
      },
      {
        category: '5. อุปกรณ์ความปลอดภัยและภายในรถ',
        items: [
          { id: 'gen_seatbelts', title: 'เข็มขัดนิรภัยทุกตำแหน่ง', description: 'ดึงล็อกกระชากได้ปกติ สลักเสียบแน่น' },
          { id: 'gen_mirrors', title: 'กระจกมองข้างและกระจกมองหลัง', description: 'สะอาด ไม่แตก ปรับมุมมองได้ชัดเจน' },
          { id: 'gen_wipers', title: 'ที่ปัดน้ำฝนและยางปัด', description: 'ปัดกระจกสะอาด ยางไม่แข็งกรอบหรือฉีกขาด' },
          { id: 'gen_fire_extinguisher', title: 'ถังดับเพลิงประจำรถ', description: 'เกจวัดแรงดันอยู่ในแถบเขียว ไม่หมดอายุ พร้อมใช้' },
          { id: 'gen_emergency_signs', title: 'ป้ายสะท้อนแสง / กรวยจราจร', description: 'มีกรวยหรือป้ายสามเหลี่ยมสะท้อนแสงฉุกเฉินในรถ' },
          { id: 'gen_docs', title: 'สมุดคู่มือรถ / พ.ร.บ. / ป้ายภาษี', description: 'ป้ายภาษีไม่หมดอายุ พกสำเนาเล่มทะเบียนรถ' }
        ]
      }
    ];
  }

  if (type === 'crane_truck') {
    return [
      {
        category: '1. ระบบตัวรถบรรทุกและระบบขับเคลื่อน (Truck Chassis & Safety)',
        items: [
          { id: 'crn_eng_oil_coolant', title: 'ระดับน้ำมันเครื่องและน้ำหล่อเย็นเครื่องยนต์', description: 'อยู่ในเกณฑ์ปกติ ไม่ขาด ไม่มีความร้อนผิดปกติ' },
          { id: 'crn_air_brake', title: 'ระบบลมเบรกและเกจ์วัดความดันลม (Air Brake Pressure)', description: 'แรงดันลมสะสมได้ตามเกณฑ์ ไม่มีลมรั่วฟ่อ' },
          { id: 'crn_lighting_signals', title: 'ระบบไฟส่องสว่าง ไฟเลี้ยว ไฟเบรก และไฟวับวาบฉุกเฉิน', description: 'ระบบไฟส่องสว่างรอบตัวรถและไฟไซเรนบนหลังคาทำงานครบถ้วน' },
          { id: 'crn_tires_wheels', title: 'สภาพยาง ล้อคู่หลัง และน็อตล้อทุกล้อ', description: 'ดอกยางลึก น็อตล้อขันแน่นทุกตัว ไม่มีรอยฉีกขาดหรือบวม' },
          { id: 'crn_reverse_buzzer', title: 'สัญญาณเสียงถอยหลังและไฟถอย', description: 'เสียงสัญญาณเตือนถอยหลังดังชัดเจนเพื่อความปลอดภัย' },
          { id: 'crn_safety_gear', title: 'ถังดับเพลิง หมวกนิรภัย และกรวยสะท้อนแสง', description: 'อุปกรณ์ความปลอดภัยส่วนบุคคล (PPE) ประจำรถครบถ้วน' }
        ]
      },
      {
        category: '2. ระบบขาหยั่งค้ำยันไฮดรอลิค (Outriggers / Jack Cylinders)',
        items: [
          { id: 'crn_outriggers_movement', title: 'ขาหยั่งค้ำยันไฮดรอลิค กางออก-เก็บเข้า', description: 'กางออกได้สุดและตั้งลงพื้นได้มั่นคง ขาไม่ติดขัด' },
          { id: 'crn_outrigger_cylinders', title: 'กระบอกไฮดรอลิกขาหยั่งและซีลกันน้ำมัน', description: 'ไม่มีคราบน้ำมันไฮดรอลิกรั่วซึมที่กระบอกหรือข้อต่อ' },
          { id: 'crn_outrigger_pads', title: 'แผ่นรองขาค้ำยัน (Outrigger Pads)', description: 'มีแผ่นรองเหล็ก/ไม้เนื้อแข็งครบ 4 จุด สภาพสมบูรณ์ไม่แตกหัก' },
          { id: 'crn_outrigger_pins', title: 'สลักล็อกนิรภัยขาค้ำยัน (Safety Pins & Locks)', description: 'สลักล็อกแน่นหนา ป้องกันขาหยั่งเลื่อนหลุดขณะขับขี่' },
          { id: 'crn_level_bubble', title: 'เกจวัดระดับน้ำระนาบตัวรถ (Level Bubble / Indicator)', description: 'เกจวัดระดับสมบูรณ์ ใช้งานเพื่อปรับระนาบรถก่อนยกงาน' }
        ]
      },
      {
        category: '3. ระบบแขนบูมและโครงสร้างเครน (Crane Boom Structure)',
        items: [
          { id: 'crn_boom_structure', title: 'โครงสร้างบูมเครน (Boom Structure)', description: 'ไม่มีรอยร้าว รอยเชื่อมไม่แตก บูมไม่งอ บิดเบี้ยว หรือยุบตัว' },
          { id: 'crn_boom_pins', title: 'สลักข้อต่อบูมและกิ๊บล็อก (Boom Pivot Pins)', description: 'สลักยึดแน่นหนา มีตัวล็อกครบ ไม่หลวมคลอน' },
          { id: 'crn_lift_cylinders', title: 'กระบอกไฮดรอลิกยกบูมและกระบอกยืดบูม (Lift & Telescopic)', description: 'แกนกระบอกเรียบ ไม่มีรอยขูดขีด ลิฟต์บูมขึ้น-ลงราบรื่น' },
          { id: 'crn_load_chart', title: 'ป้ายพิกัดยกน้ำหนักและตารางรัศมี (Load Capacity Chart)', description: 'ป้ายบอกพิกัดยกน้ำหนักติดชัดเจน ไม่ลบเลือน อ่านค่าได้ง่าย' }
        ]
      },
      {
        category: '4. ระบบวินช์ สลิง และตะขอยก (Winch, Wire Rope & Hook)',
        items: [
          { id: 'crn_wire_rope', title: 'ลวดสลิงยกของ (Hoist Wire Rope)', description: 'สลิงไม่แตกเกลียว ไม่คดงอ ไม่มีสนิมกร่อน ปลายยึดแน่น' },
          { id: 'crn_drum_spooling', title: 'การม้วนเรียงตัวของสลิงบนดรัมวินช์', description: 'สลิงเรียงแถวเรียบร้อย ไม่ปีนทับเกลียว ไม่หลุดขอบรอก' },
          { id: 'crn_hook_safety_latch', title: 'ตะขอยกและปากล็อกนิรภัย (Hook & Safety Latch)', description: 'ตะขอไม่บิดงอหรือร้าว ปากล็อกนิรภัยมีสปริงดีดปิดสนิท' },
          { id: 'crn_sheaves', title: 'ลูกรอกปลายบูม (Boom Point Sheaves)', description: 'ลูกรอกหมุนคล่อง ร่องรอกไม่สึกแหว่ง สลิงไม่ตกจากร่อง' }
        ]
      },
      {
        category: '5. ระบบไฮดรอลิคและอุปกรณ์ตัดความปลอดภัยเครน (Crane Hydraulics & Safety Systems)',
        items: [
          { id: 'crn_control_levers', title: 'คันโยกควบคุมเครน (Control Levers / Joy Stick)', description: 'คันโยกดีดกลับตำแหน่งกึ่งกลาง (Neutral) ได้เองเมื่อปล่อยมือ' },
          { id: 'crn_anti_two_block', title: 'ระบบตัดยกสุดปลายบูม (Anti-Two Block / Limit Switch)', description: 'เมื่อตะขอยกแตะสวิตช์ ระบบจะตัดการยกทันที ป้องกันสลิงขาด' },
          { id: 'crn_holding_valves', title: 'วาล์วนิรภัยล็อกไฮดรอลิก (Check / Holding Valves)', description: 'เมื่อยกบูมค้างไว้ บูมไม่ทรุดตัวลงเอง น้ำมันไม่ไหลย้อน' },
          { id: 'crn_hydraulic_oil', title: 'ระดับน้ำมันไฮดรอลิกในถังพัก (Hydraulic Oil Level)', description: 'ระดับน้ำมันในหลอดแก้วอยู่ในเกณฑ์ ไม่มีฟองอากาศหรือสีขุ่น' },
          { id: 'crn_emergency_stop', title: 'ปุ่มหยุดฉุกเฉิน (Emergency Stop Button)', description: 'กดแล้วตัดการทำงานของระบบเครนทันที' }
        ]
      }
    ];
  }

  if (type === 'bucket_truck_class_c') {
    return [
      {
        category: '1. ระบบตัวรถบรรทุกและระบบขับเคลื่อนกำลังส่ง PTO (Truck Chassis & PTO)',
        items: [
          { id: 'bkc_eng_coolant', title: 'ระดับน้ำมันเครื่อง น้ำหล่อเย็น และน้ำมันพาวเวอร์', description: 'ระดับของเหลวในห้องเครื่องอยู่ในเกณฑ์ปกติ ไม่มีการรั่วซึม' },
          { id: 'bkc_air_brake', title: 'ระบบลมเบรก เกจ์วัดแรงดันลม และระบบเบรกจอด', description: 'แรงดันลมเบรกสะสมได้เกิน 7-8 บาร์ และระบบเบรกจอดล็อกแน่นหนา' },
          { id: 'bkc_pto_engagement', title: 'ระบบส่งกำลังเพลา PTO (Power Take-Off)', description: 'เข้าเกียร์ PTO ได้นิ่มนวล ปั๊มไฮดรอลิกทำงานปกติ ไม่มีเสียงกระแทก' },
          { id: 'bkc_tires_lighting', title: 'สภาพยาง ล้อคู่หลัง สัญญาณไฟ และไฟไซเรนวับวาบ', description: 'ดอกยางลึก น็อตล้อแน่น ไฟส่องสว่างรอบรถและไฟไซเรนบนหลังคาติดครบ' },
          { id: 'bkc_reverse_ppe', title: 'สัญญาณเตือนถอยหลัง ถังดับเพลิง และอุปกรณ์ PPE ประจำรถ', description: 'สัญญาณเตือนถอยหลังดังปกติ มีถังดับเพลิงและหมวกนิรภัยประจำรถ' }
        ]
      },
      {
        category: '2. ระบบขาหยั่งค้ำยันไฮดรอลิคและระบบสายดินตัวรถ (Outriggers & Grounding)',
        items: [
          { id: 'bkc_outriggers_movement', title: 'ขาหยั่งค้ำยันไฮดรอลิคหน้า-หลัง กางออกและตั้งพื้น', description: 'กางออกได้สุดและดันยกลอยตัวรถได้ระดับมั่นคง ไม่ติดขัด' },
          { id: 'bkc_outrigger_pads_pins', title: 'แผ่นรองขาค้ำยัน (Outrigger Pads) และสลักล็อกนิรภัย', description: 'แผ่นรองฉนวน/เหล็กครบ 4 จุด สลักล็อกขาค้ำยึดแน่น ไม่หลุดหลวม' },
          { id: 'bkc_level_indicator', title: 'เกจวัดระดับน้ำระนาบตัวรถ (Level Bubble Indicator)', description: 'อ่านค่าได้ชัดเจน ปรับตั้งตัวรถให้อยู่ในแนวนอนได้ระดับก่อนยกบูม' },
          { id: 'bkc_grounding_cable', title: 'สายดินต่อลงดินชั่วคราวประจำรถกระเช้า (Vehicle Protective Ground)', description: 'สายทองแดงขนาดไม่น้อยกว่า 50 sq.mm. แคลมป์กราวด์สะอาด ยึดแน่นหนา' },
          { id: 'bkc_outrigger_interlock', title: 'ระบบอินเตอร์ล็อกขาค้ำยัน (Outrigger / Boom Interlock)', description: 'บูมจะไม่สามารถยกทำงานได้หากขาหยั่งค้ำยันยังไม่ได้กางลงพื้นสมบูรณ์' }
        ]
      },
      {
        category: '3. บูมฉนวนไฟฟ้าและการรับรอง Dielectric (Insulated Boom & Dielectric Section - Class C)',
        items: [
          { id: 'bkc_fiberglass_boom', title: 'ผิวบูมฉนวนไฟเบอร์กลาสท่อนบน (Insulated Upper Boom Class C)', description: 'ผิวสะอาด แห้ง เป็นมันเงา ไม่มีคราบเขม่า น้ำมัน รอยขูดลึก หรือรอยแตกกะเทาะ' },
          { id: 'bkc_dielectric_cert', title: 'ป้ายรับรองการทดสอบฉนวนไฟฟ้า (Dielectric Test Certification)', description: 'มีสติ๊กเกอร์รับรองผลการทดสอบทางไฟฟ้าประจำปี และยังไม่หมดอายุ' },
          { id: 'bkc_lower_boom_insert', title: 'ท่อนฉนวนบูมท่อนล่าง (Lower Boom Insulator Insert - ถ้ามี)', description: 'สะอาด แห้ง ไร้คราบสิ่งสกปรกนำไฟฟ้าและรอยแตกร้าว' },
          { id: 'bkc_boom_leveling_rods', title: 'ก้านส่งกำลังปรับระดับฉนวนและท่อไฮดรอลิกฉนวนภายในบูม', description: 'ไม่มีคราบน้ำมันไฮดรอลิกรั่วซึม ไม่มีการเสียดสีหรือสึกหรอผิดปกติ' }
        ]
      },
      {
        category: '4. ตัวกระเช้าไฟเบอร์กลาส ถังรองฉนวน และระบบปรับระดับ (Bucket & Liner 46-50kV)',
        items: [
          { id: 'bkc_bucket_fiberglass', title: 'ตัวกระเช้าไฟเบอร์กลาส (Fiberglass Bucket)', description: 'โครงสร้างแข็งแรง ไม่มีรอยแตกหักหรือร้าวที่จุดยึดกระเช้า' },
          { id: 'bkc_bucket_liner', title: 'ถังรองฉนวนภายในกระเช้า (Bucket Liner - Insulated 50kV)', description: 'สะอาด แห้งสนิท ไม่มีน้ำขัง ไม่มีรอยแตกร้าวหรือทะลุ' },
          { id: 'bkc_auto_leveling', title: 'ระบบปรับระดับกระเช้าอัตโนมัติ (Bucket Auto-Leveling)', description: 'กระเช้ารักษาระดับขนานพื้นราบตลอดการยก-ลดบูม ไม่เอียงกระดก' },
          { id: 'bkc_safety_harness_anchor', title: 'จุดยึดเข็มขัดนิรภัย (Harness Anchor) และ Safety Lanyard', description: 'ห่วงยึดเข็มขัดนิรภัยแข็งแรง พร้อมสายนิรภัยดูดซับแรงกระชาก (Shock Absorbing Lanyard)' }
        ]
      },
      {
        category: '5. ชุดควบคุมและการควบคุมฉุกเฉิน (Upper/Lower Controls & Emergency Systems)',
        items: [
          { id: 'bkc_upper_controls', title: 'ชุดควบคุมบนกระเช้า (Upper Controls)', description: 'คันโยกและปุ่มกดทำงานราบรื่น ดีดกลับกึ่งกลางปกติ ไม่ติดขัด' },
          { id: 'bkc_lower_controls_override', title: 'ชุดควบคุมฐานล่างและระบบเลือกสิทธิ์ (Lower Controls Override)', description: 'สวิตช์สลับการควบคุมบน-ล่างทำงานปกติ สามารถควบคุมจากฐานล่างเพื่อช่วยเหลือฉุกเฉินได้' },
          { id: 'bkc_foot_switch', title: 'สวิตช์เหยียบเท้าเพื่อความปลอดภัย (Safety Foot Switch / Deadman)', description: 'ต้องเหยียบสวิตช์เท้าก่อนเท่านั้น ชุดควบคุมจึงจะยอมให้บูมเคลื่อนที่' },
          { id: 'bkc_emergency_power_unit', title: 'ระบบนำกระเช้าลงฉุกเฉิน (Emergency Auxiliary DC Pump / Lowering Valve)', description: 'ปั๊มไฟฟ้าสำรอง DC หรือวาล์วนำกระเช้าลงฉุกเฉินทำงานปกติเมื่อดับเครื่องยนต์' },
          { id: 'bkc_emergency_stop_upper_lower', title: 'ปุ่มหยุดฉุกเฉิน (E-Stop) ทั้งบนกระเช้าและฐานล่าง', description: 'กดแล้วระบบตัดการทำงานและการจ่ายน้ำมันไฮดรอลิกทันที' }
        ]
      }
    ];
  }

  return [];
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
 * อ่านข้อมูลผู้ดูแลระบบทั้งหมดจากแผ่นงาน 'ข้อมูลผู้ดูแลระบบ'
 */
function readAdmins(ss) {
  var sheet = ss.getSheetByName(SHEET_ADMINS);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue; // ข้ามแถวที่ว่างเปล่า

    // ตรวจสอบ JSON_DATA ที่คอลัมน์ 12 (Index 11) ก่อน
    var jsonRaw = row[11];
    if (jsonRaw) {
      try {
        var parsed = JSON.parse(jsonRaw);
        if (parsed && (parsed.username || parsed.id)) {
          // หากในชีตมีการแก้รหัสผ่านโดยตรงที่คอลัมน์ C (Index 2) ให้ใช้ค่าใหม่จากชีต
          if (row[2] && String(row[2]).trim() !== '' && String(row[2]).trim() !== '******') {
            parsed.password = String(row[2]).trim();
          }
          if (row[1]) parsed.username = String(row[1]).trim();
          if (row[3]) parsed.displayName = String(row[3]).trim();
          if (row[4]) parsed.role = (row[4] === 'super_admin' || row[4] === 'ผู้ดูแลระบบหลัก (Super Admin)') ? 'super_admin' : (row[4] === 'supervisor' || row[4] === 'หัวหน้างาน (Supervisor)') ? 'supervisor' : 'admin';
          if (row[5]) parsed.peaBranch = String(row[5]).trim();
          if (row[6]) parsed.email = String(row[6]).trim();
          if (row[7]) parsed.phone = String(row[7]).trim();
          if (row[8]) parsed.status = (row[8] === 'ระงับการใช้งาน' || row[8] === 'inactive') ? 'inactive' : 'active';
          result.push(parsed);
          continue;
        }
      } catch (e) {}
    }

    result.push({
      id: String(row[0] || 'admin-' + i),
      username: String(row[1] || '').trim(),
      password: String(row[2] || '').trim(),
      displayName: String(row[3] || row[1] || 'ผู้ดูแลระบบ').trim(),
      role: (row[4] === 'super_admin' || row[4] === 'ผู้ดูแลระบบหลัก (Super Admin)') ? 'super_admin' : (row[4] === 'supervisor' || row[4] === 'หัวหน้างาน (Supervisor)') ? 'supervisor' : 'admin',
      peaBranch: String(row[5] || 'กฟส.หลังสวน').trim(),
      email: String(row[6] || '').trim(),
      phone: String(row[7] || '').trim(),
      status: (row[8] === 'ระงับการใช้งาน' || row[8] === 'inactive') ? 'inactive' : 'active',
      createdAt: row[9] ? String(row[9]) : new Date().toISOString(),
      updatedAt: row[10] ? String(row[10]) : new Date().toISOString()
    });
  }
  return result;
}

/**
 * โหลดข้อมูลทั้งหมดรวมกัน (รวมทั้ง 8 แผ่นงาน)
 */
function loadAllDataFromSheets(ss) {
  return {
    vehicles: readVehicles(ss),
    inspections: readInspections(ss),
    branches: readBranches(ss),
    checklistTemplates: readAllChecklists(ss),
    adminUsers: readAdmins(ss),
    spreadsheetTitle: ss.getName(),
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl()
  };
}
`;
