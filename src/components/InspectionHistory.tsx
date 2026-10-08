import React, { useState } from 'react';
import { 
  History, 
  Car, 
  Search, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Trash2, 
  Printer, 
  FileSpreadsheet, 
  X,
  Gauge,
  Phone,
  Briefcase,
  ChevronRight,
  Filter,
  ClipboardCheck
} from 'lucide-react';
import { InspectionRecord, Vehicle, OverallStatus } from '../types/vehicle';
import { ConfirmModal } from './ConfirmModal';

interface InspectionHistoryProps {
  records: InspectionRecord[];
  vehicles: Vehicle[];
  peaBranches?: string[];
  filterVehicleId?: string | null;
  onDeleteRecord: (recordId: string) => void;
  onOpenSheets?: () => void;
  isSheetsConnected: boolean;
}

const OVERALL_STATUS_BADGES: Record<OverallStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  ready: {
    label: 'พร้อมใช้งาน',
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    text: 'text-emerald-700',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  },
  conditional: {
    label: 'มีข้อสังเกต',
    bg: 'bg-amber-50 border-amber-200 text-amber-700',
    text: 'text-amber-700',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  not_ready: {
    label: 'ห้ามปฏิบัติงาน',
    bg: 'bg-rose-50 border-rose-200 text-rose-700',
    text: 'text-rose-700',
    icon: <XCircle className="w-4 h-4 text-rose-600" />,
  },
};

export const InspectionHistory: React.FC<InspectionHistoryProps> = ({
  records,
  vehicles,
  peaBranches,
  filterVehicleId: initialFilterVehicleId,
  onDeleteRecord,
  onOpenSheets,
  isSheetsConnected,
}) => {
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>(
    initialFilterVehicleId || 'all'
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [activeRecord, setActiveRecord] = useState<InspectionRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  const availableBranches = Array.from(
    new Set([...(peaBranches || []), ...records.map((r) => r.peaBranch || 'กฟภ. สำนักงานใหญ่')])
  );

  const filteredRecords = records.filter((rec) => {
    const matchesBranch =
      selectedBranchFilter === 'all' || (rec.peaBranch || 'กฟภ. สำนักงานใหญ่') === selectedBranchFilter;
    const matchesVehicle =
      selectedVehicleFilter === 'all' || rec.vehicleId === selectedVehicleFilter;
    const matchesCategory =
      selectedCategoryFilter === 'all' || rec.vehicleCategory === selectedCategoryFilter;
    const matchesStatus =
      selectedStatusFilter === 'all' || rec.overallStatus === selectedStatusFilter;
    const matchesSearch =
      rec.vehicleLicensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.peaBranch && rec.peaBranch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rec.inspectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rec.workDescription && rec.workDescription.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesBranch && matchesVehicle && matchesCategory && matchesStatus && matchesSearch;
  });

  const deletingRecord = records.find((r) => r.id === deletingRecordId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            ประวัติการตรวจเช็คสภาพยานพาหนะย้อนหลัง
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            เก็บบันทึกข้อมูลการตรวจสอบย้อนหลังของรถแต่ละคัน แยกการไฟฟ้า ตรวจดูข้อบกพร่อง ({records.length} รายการ)
          </p>
        </div>

        {isSheetsConnected && onOpenSheets && (
          <button
            onClick={onOpenSheets}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium text-xs rounded-xl transition-all self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            เปิดสเปรดชีต Google Sheets
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาทะเบียน, ชื่อผู้ตรวจ, งาน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          <div>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="w-full px-3 py-2 bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-bold rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">⚡ ทุกการไฟฟ้า</option>
              {availableBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
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
              value={selectedVehicleFilter}
              onChange={(e) => setSelectedVehicleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="all">ทุกยานพาหนะ</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} ({v.brand} {v.model})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
            >
              <option value="all">ทุกสถานะผลการตรวจ</option>
              <option value="ready">พร้อมใช้งาน (Pass)</option>
              <option value="conditional">มีข้อสังเกต</option>
              <option value="not_ready">ห้ามปฏิบัติงาน</option>
            </select>
          </div>
        </div>

        {(searchTerm || selectedBranchFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedVehicleFilter !== 'all' || selectedStatusFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>แสดง {filteredRecords.length} รายการ จากทั้งหมด {records.length} รายการ</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBranchFilter('all');
                setSelectedCategoryFilter('all');
                setSelectedVehicleFilter('all');
                setSelectedStatusFilter('all');
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      {/* Records List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">ไม่พบประวัติการตรวจเช็คที่ตรงกับเงื่อนไข</h3>
          <p className="text-sm text-slate-500 mt-1">ลองเปลี่ยนตัวกรอง หรือทำการตรวจเช็คสภาพรถผ่านแบบฟอร์มเพื่อเริ่มเก็บบันทึก</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const statusInfo = OVERALL_STATUS_BADGES[rec.overallStatus] || OVERALL_STATUS_BADGES.ready;
            const passCount = rec.items.filter((i) => i.status === 'pass').length;
            const failCount = rec.items.filter((i) => i.status === 'fail').length;
            const inspectionDate = new Date(rec.inspectionDate);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Vehicle & Date */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                    <Car className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-sm rounded-lg">
                        {rec.vehicleLicensePlate}
                      </span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {rec.brand} {rec.model}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold">
                        ⚡ {rec.peaBranch || 'กฟภ. สำนักงานใหญ่'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        rec.vehicleCategory === 'bucket_truck_class_c'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : rec.vehicleCategory === 'crane_truck'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {rec.vehicleCategory === 'bucket_truck_class_c'
                          ? '3. กระเช้า Class C'
                          : rec.vehicleCategory === 'crane_truck'
                          ? '2. รถบรรทุกติดเครน'
                          : '1. รถทั่วไป'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.bg}`}
                      >
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {inspectionDate.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {inspectionDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                      </span>

                      <span className="flex items-center gap-1 font-mono">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                        {rec.odometer.toLocaleString()} กม.
                      </span>

                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {rec.inspectorName}
                      </span>
                    </div>

                    {rec.workDescription && (
                      <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                        <span className="font-medium text-slate-700">ภารกิจ:</span> {rec.workDescription}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className="text-right text-xs">
                    <div className="text-emerald-700 font-medium">✓ ผ่าน {passCount} ข้อ</div>
                    {failCount > 0 ? (
                      <div className="text-rose-600 font-bold">✕ มีข้อบกพร่อง {failCount} ข้อ</div>
                    ) : (
                      <div className="text-slate-400">ไม่มีข้อบกพร่อง</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveRecord(rec)}
                      className="inline-flex items-center gap-1 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-all"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                      ดูใบตรวจ
                    </button>

                    <button
                      onClick={() => setDeletingRecordId(rec.id)}
                      title="ลบรายการตรวจนี้"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Inspection Slip Modal */}
      {activeRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header / Actions */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    ใบบันทึกผลการตรวจเช็คสภาพยานพาหนะก่อนปฏิบัติงาน
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">รหัสเอกสาร: {activeRecord.id}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-medium shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  พิมพ์เอกสาร
                </button>
                <button
                  onClick={() => setActiveRecord(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Printable View */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 print:p-0">
              {/* Info Card */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1">ทะเบียนรถ:</span>
                  <span className="font-mono font-bold text-sm text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                    {activeRecord.vehicleLicensePlate}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">ยี่ห้อ / รุ่น:</span>
                  <span className="font-semibold text-slate-800">
                    {activeRecord.brand} {activeRecord.model}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">เลขไมล์ก่อนออก:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {activeRecord.odometer.toLocaleString()} กม.
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">ผลการประเมิน:</span>
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${
                      activeRecord.overallStatus === 'ready'
                        ? 'text-emerald-700'
                        : activeRecord.overallStatus === 'conditional'
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {OVERALL_STATUS_BADGES[activeRecord.overallStatus]?.label}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1">ผู้ตรวจ / พนักงานขับ:</span>
                  <span className="font-medium text-slate-800">{activeRecord.inspectorName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">เบอร์ติดต่อ:</span>
                  <span className="font-mono text-slate-700">{activeRecord.inspectorPhone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">สังกัด / แผนก:</span>
                  <span className="text-slate-800">{activeRecord.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">วัน-เวลาที่ตรวจ:</span>
                  <span className="text-slate-800">
                    {new Date(activeRecord.inspectionDate).toLocaleString('th-TH')}
                  </span>
                </div>
              </div>

              {activeRecord.workDescription && (
                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900">
                  <span className="font-bold">ภารกิจที่ปฏิบัติงาน:</span> {activeRecord.workDescription}
                </div>
              )}

              {/* Items Breakdown */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm">
                  รายละเอียดผลการตรวจเช็คสภาพแต่ละรายการ ({activeRecord.items.length} รายการ)
                </h4>

                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {activeRecord.items.map((item, idx) => {
                    const isFail = item.status === 'fail';
                    const isPass = item.status === 'pass';
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                          isFail ? 'bg-rose-50/70' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <span className="text-slate-400 text-[10px] block">{item.category}</span>
                          <span className="font-medium text-slate-800">{item.title}</span>
                          {item.remark && (
                            <p className="mt-1 text-rose-700 font-medium">
                              ⚠️ ข้อบกพร่อง: {item.remark}
                            </p>
                          )}
                        </div>

                        <div className="self-start sm:self-center">
                          {isPass && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ปกติ
                            </span>
                          )}
                          {isFail && (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              ชำรุด / ผิดปกติ
                            </span>
                          )}
                          {item.status === 'na' && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg">
                              N/A
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Remarks */}
              {activeRecord.summaryRemarks && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-800 block mb-1">ความเห็นเพิ่มเติม / สั่งการ:</span>
                  <p className="text-slate-700 whitespace-pre-line">{activeRecord.summaryRemarks}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Record (Workspace Skill Requirement) */}
      <ConfirmModal
        isOpen={!!deletingRecordId}
        title="ยืนยันการลบประวัติการตรวจเช็ค"
        message={
          deletingRecord
            ? `คุณแน่ใจหรือไม่ว่าต้องการลบบันทึกการตรวจสภาพรถทะเบียน "${deletingRecord.vehicleLicensePlate}" เมื่อวันที่ ${new Date(
                deletingRecord.inspectionDate
              ).toLocaleDateString('th-TH')}?\n\nการลบนี้จะนำข้อมูลออกจากประวัติและไม่สามารถกู้คืนได้`
            : ''
        }
        confirmLabel="ลบบันทึก"
        cancelLabel="ยกเลิก"
        isDestructive={true}
        onConfirm={() => {
          if (deletingRecordId) {
            onDeleteRecord(deletingRecordId);
            setDeletingRecordId(null);
          }
        }}
        onCancel={() => setDeletingRecordId(null)}
      />
    </div>
  );
};
