import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ClipboardCheck,
  PauseCircle,
  ChevronDown,
  Check,
  Download,
  BarChart3,
  Table,
  LayoutGrid,
  Layers,
  CalendarDays,
  ChevronUp,
  ArrowUpDown,
  AlertCircle,
  Clock,
  Copy,
  Wrench
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InspectionRecord, Vehicle, OverallStatus } from '../types/vehicle';
import { ConfirmModal } from './ConfirmModal';

export interface VehiclePeriodSummary {
  vehicleId: string;
  licensePlate: string;
  brand: string;
  model: string;
  peaBranch: string;
  category: string;
  daysCount: number; // ตรวจกี่วัน
  timesCount: number; // ตรวจกี่ครั้ง
  readyCount: number;
  conditionalCount: number;
  notReadyCount: number;
  notUsedCount: number;
  lastDateStr: string;
  lastTimeString: string;
  lastOdometer: number;
  lastInspector: string;
  lastStatus: OverallStatus;
  inspectionDates: string[];
}

export interface UninspectedVehicleInfo {
  vehicle: Vehicle;
  lastRecord?: InspectionRecord;
  lastInspectionDateStr: string;
  lastInspectionTimeStr?: string;
  lastOdometer: number;
  lastInspector?: string;
  lastStatus?: OverallStatus;
  neverInspected: boolean;
}

export interface MaintenanceVehicleInfo {
  vehicle: Vehicle;
  lastRecord?: InspectionRecord;
  lastInspectionDateStr: string;
  lastInspectionTimeStr?: string;
  lastOdometer: number;
  lastInspector?: string;
  lastStatus?: OverallStatus;
  reason: 'maintenance_status' | 'not_ready_inspection' | 'both';
  issueDetails?: string;
}

interface InspectionHistoryProps {
  records: InspectionRecord[];
  vehicles: Vehicle[];
  peaBranches?: string[];
  filterVehicleId?: string | null;
  isAdmin?: boolean;
  canOpenSpreadsheet?: boolean;
  onDeleteRecord: (recordId: string) => void;
  onOpenSheets?: () => void;
  isSheetsConnected: boolean;
  onStartInspection?: (vehicleId: string) => void;
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
  not_used: {
    label: 'ไม่มีการใช้งานในวันนี้',
    bg: 'bg-slate-100 border-slate-300 text-slate-700',
    text: 'text-slate-700',
    icon: <PauseCircle className="w-4 h-4 text-slate-500" />,
  },
};

export const InspectionHistory: React.FC<InspectionHistoryProps> = ({
  records,
  vehicles,
  peaBranches,
  filterVehicleId: initialFilterVehicleId,
  isAdmin = false,
  canOpenSpreadsheet = false,
  onDeleteRecord,
  onOpenSheets,
  isSheetsConnected,
  onStartInspection,
}) => {
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>(
    initialFilterVehicleId || 'all'
  );
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayYMD = () => formatYMD(new Date());

  // Date filter state - default to 'today' (วันนี้)
  const [datePreset, setDatePreset] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>(getTodayYMD());
  const [endDate, setEndDate] = useState<string>(getTodayYMD());

  const [activeRecord, setActiveRecord] = useState<InspectionRecord | null>(null);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);

  // Vehicle summary & Excel export state
  const [summaryTab, setSummaryTab] = useState<'inspected' | 'uninspected' | 'maintenance'>('inspected');
  const [summaryViewMode, setSummaryViewMode] = useState<'table' | 'cards'>('table');
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState<boolean>(false);
  const [summarySortBy, setSummarySortBy] = useState<'times' | 'days' | 'plate'>('times');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copiedUninspectedLine, setCopiedUninspectedLine] = useState<boolean>(false);

  const getRecordDateString = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return formatYMD(d);
      }
    } catch {
      // ignore
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.substring(0, 10);
    }
    return '';
  };

  const handleDatePresetSelect = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = formatYMD(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last7') {
      const past = new Date();
      past.setDate(past.getDate() - 6);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(now));
    } else if (preset === 'last30') {
      const past = new Date();
      past.setDate(past.getDate() - 29);
      setStartDate(formatYMD(past));
      setEndDate(formatYMD(now));
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatYMD(startOfMonth));
      setEndDate(formatYMD(now));
    }
  };

  const availableBranches = Array.from(
    new Set([...(peaBranches || []), ...records.map((r) => r.peaBranch || 'กฟภ. สำนักงานใหญ่')])
  );

  const filteredRecords = records.filter((rec) => {
    const matchesBranch =
      selectedBranches.length === 0 ||
      selectedBranches.includes(rec.peaBranch || 'กฟภ. สำนักงานใหญ่');
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

    // Date filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const recDateStr = getRecordDateString(rec.inspectionDate);
      if (recDateStr) {
        if (startDate && recDateStr < startDate) {
          matchesDate = false;
        }
        if (endDate && recDateStr > endDate) {
          matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }

    return matchesBranch && matchesVehicle && matchesCategory && matchesStatus && matchesSearch && matchesDate;
  }).sort((a, b) => {
    const timeA = new Date(a.inspectionDate).getTime() || 0;
    const timeB = new Date(b.inspectionDate).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    const createA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return createB - createA;
  });

  const deletingRecord = records.find((r) => r.id === deletingRecordId);

  // Group filtered records by vehicle and compute inspection frequency (ตรวจกี่วัน, ตรวจกี่ครั้ง)
  const vehicleSummaries: VehiclePeriodSummary[] = useMemo(() => {
    const map = new Map<string, InspectionRecord[]>();

    filteredRecords.forEach((rec) => {
      // Use vehicleId or fallback to license plate
      const key = rec.vehicleId || rec.vehicleLicensePlate;
      const existing = map.get(key) || [];
      existing.push(rec);
      map.set(key, existing);
    });

    const list: VehiclePeriodSummary[] = [];

    map.forEach((recs, vId) => {
      // Sort records for this vehicle descending by inspection date
      const sorted = [...recs].sort((a, b) => {
        const timeA = new Date(a.inspectionDate).getTime() || 0;
        const timeB = new Date(b.inspectionDate).getTime() || 0;
        return timeB - timeA;
      });

      const latest = sorted[0];

      // Count distinct calendar dates (ตรวจกี่วัน)
      const uniqueDays = new Set<string>();
      sorted.forEach((r) => {
        const dStr = getRecordDateString(r.inspectionDate);
        if (dStr) uniqueDays.add(dStr);
      });

      const readyCount = sorted.filter((r) => r.overallStatus === 'ready').length;
      const conditionalCount = sorted.filter((r) => r.overallStatus === 'conditional').length;
      const notReadyCount = sorted.filter((r) => r.overallStatus === 'not_ready').length;
      const notUsedCount = sorted.filter((r) => r.overallStatus === 'not_used').length;

      let lastDateStr = '-';
      let lastTimeString = '';
      try {
        const latestD = new Date(latest.inspectionDate);
        if (!isNaN(latestD.getTime())) {
          lastDateStr = latestD.toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          lastTimeString = latestD.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
          }) + ' น.';
        } else {
          lastDateStr = latest.inspectionDate.substring(0, 10);
        }
      } catch {
        lastDateStr = latest.inspectionDate.substring(0, 10);
      }

      list.push({
        vehicleId: latest.vehicleId || vId,
        licensePlate: latest.vehicleLicensePlate,
        brand: latest.brand,
        model: latest.model,
        peaBranch: latest.peaBranch || 'กฟภ. สำนักงานใหญ่',
        category: latest.vehicleCategory,
        daysCount: uniqueDays.size,
        timesCount: sorted.length,
        readyCount,
        conditionalCount,
        notReadyCount,
        notUsedCount,
        lastDateStr,
        lastTimeString,
        lastOdometer: latest.odometer || 0,
        lastInspector: latest.inspectorName || '-',
        lastStatus: latest.overallStatus,
        inspectionDates: Array.from(uniqueDays).sort().reverse(),
      });
    });

    // Sort summary according to user preference
    return list.sort((a, b) => {
      if (summarySortBy === 'times') {
        if (b.timesCount !== a.timesCount) return b.timesCount - a.timesCount;
        return b.daysCount - a.daysCount;
      }
      if (summarySortBy === 'days') {
        if (b.daysCount !== a.daysCount) return b.daysCount - a.daysCount;
        return b.timesCount - a.timesCount;
      }
      return a.licensePlate.localeCompare(b.licensePlate, 'th');
    });
  }, [filteredRecords, summarySortBy]);

  // Vehicles not inspected during the selected reporting period/filters
  const uninspectedVehicles: UninspectedVehicleInfo[] = useMemo(() => {
    // Collect all vehicle identifiers present in filteredRecords
    const inspectedKeys = new Set<string>();
    filteredRecords.forEach((r) => {
      if (r.vehicleId) inspectedKeys.add(r.vehicleId);
      if (r.vehicleLicensePlate) inspectedKeys.add(r.vehicleLicensePlate.trim().toLowerCase());
    });

    // Fast lookup for the latest historical inspection of each vehicle from ALL records
    const latestHistoryMap = new Map<string, InspectionRecord>();
    const sortedAll = [...records].sort((a, b) => {
      const tA = new Date(a.inspectionDate).getTime() || 0;
      const tB = new Date(b.inspectionDate).getTime() || 0;
      return tB - tA;
    });

    sortedAll.forEach((rec) => {
      const vId = rec.vehicleId;
      const plate = rec.vehicleLicensePlate ? rec.vehicleLicensePlate.trim().toLowerCase() : '';
      if (vId && !latestHistoryMap.has(vId)) {
        latestHistoryMap.set(vId, rec);
      }
      if (plate && !latestHistoryMap.has(plate)) {
        latestHistoryMap.set(plate, rec);
      }
    });

    const list: UninspectedVehicleInfo[] = [];

    vehicles.forEach((v) => {
      // 0. Exclude vehicles in maintenance ('ส่งซ่อม / ระงับใช้')
      if (v.status === 'maintenance') {
        return;
      }

      // 1. Branch filter
      if (selectedBranches.length > 0 && !selectedBranches.includes(v.peaBranch || 'กฟภ. สำนักงานใหญ่')) {
        return;
      }
      // 2. Category filter
      if (selectedCategoryFilter !== 'all' && v.category !== selectedCategoryFilter) {
        return;
      }
      // 3. Vehicle filter
      if (selectedVehicleFilter !== 'all' && v.id !== selectedVehicleFilter) {
        return;
      }
      // 4. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchPlate = v.licensePlate.toLowerCase().includes(term);
        const matchBrand = `${v.brand} ${v.model}`.toLowerCase().includes(term);
        const matchBranch = (v.peaBranch || '').toLowerCase().includes(term);
        const matchDept = (v.department || '').toLowerCase().includes(term);
        if (!matchPlate && !matchBrand && !matchBranch && !matchDept) {
          return;
        }
      }

      // 5. Must NOT have any inspection in the filtered period
      const isInspected =
        inspectedKeys.has(v.id) ||
        inspectedKeys.has(v.licensePlate.trim().toLowerCase());

      if (isInspected) {
        return;
      }

      const lastRec = latestHistoryMap.get(v.id) || latestHistoryMap.get(v.licensePlate.trim().toLowerCase());

      // Exclude vehicles whose latest inspection status is prohibited/stop-work ('ห้ามปฏิบัติงาน' / ห้ามใช้)
      if (lastRec?.overallStatus === 'not_ready') {
        return;
      }
      let lastDateStr = 'ยังไม่เคยมีบันทึกตรวจเช็ค';
      let lastTimeStr = '';
      if (lastRec) {
        try {
          const d = new Date(lastRec.inspectionDate);
          if (!isNaN(d.getTime())) {
            lastDateStr = d.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            lastTimeStr = d.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            }) + ' น.';
          } else {
            lastDateStr = lastRec.inspectionDate.substring(0, 10);
          }
        } catch {
          lastDateStr = lastRec.inspectionDate.substring(0, 10);
        }
      }

      list.push({
        vehicle: v,
        lastRecord: lastRec,
        lastInspectionDateStr: lastDateStr,
        lastInspectionTimeStr: lastTimeStr,
        lastOdometer: lastRec?.odometer || v.lastOdometer || 0,
        lastInspector: lastRec?.inspectorName,
        lastStatus: lastRec?.overallStatus,
        neverInspected: !lastRec,
      });
    });

    return list.sort((a, b) => a.vehicle.licensePlate.localeCompare(b.vehicle.licensePlate, 'th'));
  }, [vehicles, records, filteredRecords, selectedBranches, selectedCategoryFilter, selectedVehicleFilter, searchTerm]);

  // Vehicles under maintenance or prohibited ('รถที่ส่งซ่อม / ห้ามใช้')
  const maintenanceVehicles: MaintenanceVehicleInfo[] = useMemo(() => {
    const latestHistoryMap = new Map<string, InspectionRecord>();
    const sortedAll = [...records].sort((a, b) => {
      const tA = new Date(a.inspectionDate).getTime() || 0;
      const tB = new Date(b.inspectionDate).getTime() || 0;
      return tB - tA;
    });

    sortedAll.forEach((rec) => {
      const vId = rec.vehicleId;
      const plate = rec.vehicleLicensePlate ? rec.vehicleLicensePlate.trim().toLowerCase() : '';
      if (vId && !latestHistoryMap.has(vId)) {
        latestHistoryMap.set(vId, rec);
      }
      if (plate && !latestHistoryMap.has(plate)) {
        latestHistoryMap.set(plate, rec);
      }
    });

    const list: MaintenanceVehicleInfo[] = [];

    vehicles.forEach((v) => {
      // 1. Branch filter
      if (selectedBranches.length > 0 && !selectedBranches.includes(v.peaBranch || 'กฟภ. สำนักงานใหญ่')) {
        return;
      }
      // 2. Category filter
      if (selectedCategoryFilter !== 'all' && v.category !== selectedCategoryFilter) {
        return;
      }
      // 3. Vehicle filter
      if (selectedVehicleFilter !== 'all' && v.id !== selectedVehicleFilter) {
        return;
      }
      // 4. Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchPlate = v.licensePlate.toLowerCase().includes(term);
        const matchBrand = `${v.brand} ${v.model}`.toLowerCase().includes(term);
        const matchBranch = (v.peaBranch || '').toLowerCase().includes(term);
        const matchDept = (v.department || '').toLowerCase().includes(term);
        if (!matchPlate && !matchBrand && !matchBranch && !matchDept) {
          return;
        }
      }

      const lastRec = latestHistoryMap.get(v.id) || latestHistoryMap.get(v.licensePlate.trim().toLowerCase());
      const isMaintenanceStatus = v.status === 'maintenance';
      const isNotReadyStatus = lastRec?.overallStatus === 'not_ready';

      // Only include vehicles that are in maintenance status OR whose latest inspection was not_ready
      if (!isMaintenanceStatus && !isNotReadyStatus) {
        return;
      }

      let reason: 'maintenance_status' | 'not_ready_inspection' | 'both' = 'maintenance_status';
      if (isMaintenanceStatus && isNotReadyStatus) {
        reason = 'both';
      } else if (isNotReadyStatus) {
        reason = 'not_ready_inspection';
      }

      let lastDateStr = 'ยังไม่มีบันทึกในระบบ';
      let lastTimeStr = '';
      let issueDetails = v.notes || '';

      if (lastRec) {
        try {
          const d = new Date(lastRec.inspectionDate);
          if (!isNaN(d.getTime())) {
            lastDateStr = d.toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            lastTimeStr = d.toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
            }) + ' น.';
          } else {
            lastDateStr = lastRec.inspectionDate.substring(0, 10);
          }
        } catch {
          lastDateStr = lastRec.inspectionDate.substring(0, 10);
        }

        const failedItems = lastRec.items
          .filter((i) => i.status === 'fail')
          .map((i) => i.title + (i.remark ? ` (${i.remark})` : ''))
          .join(', ');

        if (failedItems) {
          issueDetails = failedItems;
        } else if (lastRec.summaryRemarks) {
          issueDetails = lastRec.summaryRemarks;
        }
      }

      list.push({
        vehicle: v,
        lastRecord: lastRec,
        lastInspectionDateStr: lastDateStr,
        lastInspectionTimeStr: lastTimeStr,
        lastOdometer: lastRec?.odometer || v.lastOdometer || 0,
        lastInspector: lastRec?.inspectorName,
        lastStatus: lastRec?.overallStatus,
        reason,
        issueDetails,
      });
    });

    return list.sort((a, b) => a.vehicle.licensePlate.localeCompare(b.vehicle.licensePlate, 'th'));
  }, [vehicles, records, selectedBranches, selectedCategoryFilter, selectedVehicleFilter, searchTerm]);

  // Overall statistics for the selected reporting period
  const totalUniqueDaysInPeriod = useMemo(() => {
    const days = new Set<string>();
    filteredRecords.forEach((r) => {
      const d = getRecordDateString(r.inspectionDate);
      if (d) days.add(d);
    });
    return days.size;
  }, [filteredRecords]);

  const totalReadyCount = filteredRecords.filter((r) => r.overallStatus === 'ready').length;
  const totalIssueCount = filteredRecords.filter((r) => r.overallStatus === 'conditional' || r.overallStatus === 'not_ready').length;
  const totalNotUsedCount = filteredRecords.filter((r) => r.overallStatus === 'not_used').length;

  // Export to Excel function (.xlsx)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0 && uninspectedVehicles.length === 0 && maintenanceVehicles.length === 0) {
      alert('ไม่พบข้อมูลยานพาหนะหรือการตรวจเช็คที่ตรงกับเงื่อนไขสำหรับการส่งออก');
      return;
    }

    try {
      setIsExporting(true);

      const wb = XLSX.utils.book_new();

      // Sheet 1: สรุปความถี่การตรวจรายคัน (Vehicle Summary)
      if (vehicleSummaries.length > 0) {
        const summaryRows = vehicleSummaries.map((s, idx) => ({
          'ลำดับ': idx + 1,
          'ทะเบียนรถ': s.licensePlate,
          'ยี่ห้อ - รุ่น': `${s.brand} ${s.model}`.trim(),
          'การไฟฟ้าสังกัด': s.peaBranch,
          'กลุ่มประเภทรถ':
            s.category === 'bucket_truck_class_c'
              ? '3. รถกระเช้า Class C'
              : s.category === 'crane_truck'
              ? '2. รถบรรทุกติดเครนไฮดรอลิค'
              : '1. ยานพาหนะทั่วไป',
          'ตรวจกี่วัน (วัน)': s.daysCount,
          'ตรวจกี่ครั้ง (ครั้ง)': s.timesCount,
          'พร้อมใช้งาน (ครั้ง)': s.readyCount,
          'มีข้อสังเกต (ครั้ง)': s.conditionalCount,
          'ห้ามปฏิบัติงาน (ครั้ง)': s.notReadyCount,
          'ไม่มีการใช้งานในวันนี้ (ครั้ง)': s.notUsedCount,
          'ตรวจล่าสุดวันที่': s.lastDateStr,
          'เวลาตรวจล่าสุด': s.lastTimeString,
          'เลขไมล์ล่าสุด (กม.)': s.lastOdometer,
          'ผู้ตรวจล่าสุด': s.lastInspector,
          'สถานะล่าสุด':
            s.lastStatus === 'ready'
              ? 'พร้อมใช้งาน'
              : s.lastStatus === 'conditional'
              ? 'มีข้อสังเกต'
              : s.lastStatus === 'not_ready'
              ? 'ห้ามปฏิบัติงาน'
              : 'ไม่มีการใช้งานในวันนี้',
          'วันที่ตรวจทั้งหมดในรอบนี้': s.inspectionDates.join(', '),
        }));

        const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
        wsSummary['!cols'] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 18 },
          { wch: 22 },
          { wch: 22 },
          { wch: 16 },
          { wch: 18 },
          { wch: 16 },
          { wch: 16 },
          { wch: 18 },
          { wch: 20 },
          { wch: 16 },
          { wch: 14 },
          { wch: 16 },
          { wch: 20 },
          { wch: 16 },
          { wch: 35 },
        ];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปความถี่การตรวจรายคัน');
      }

      // Sheet 2: รายชื่อรถที่ยังไม่ตรวจสภาพในรอบนี้ (Uninspected Vehicles)
      if (uninspectedVehicles.length > 0) {
        const uninspectedRows = uninspectedVehicles.map((u, idx) => ({
          'ลำดับ': idx + 1,
          'ทะเบียนรถ': u.vehicle.licensePlate,
          'ยี่ห้อ - รุ่น': `${u.vehicle.brand} ${u.vehicle.model}`.trim(),
          'การไฟฟ้าสังกัด': u.vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่',
          'กลุ่มประเภทรถ':
            u.vehicle.category === 'bucket_truck_class_c'
              ? '3. รถกระเช้า Class C'
              : u.vehicle.category === 'crane_truck'
              ? '2. รถบรรทุกติดเครนไฮดรอลิค'
              : '1. ยานพาหนะทั่วไป',
          'สังกัด/แผนก': u.vehicle.department || '-',
          'สถานะในช่วงเวลานี้': '⚠️ ยังไม่ได้รับการตรวจสภาพ',
          'ตรวจล่าสุดในระบบ': u.lastInspectionDateStr,
          'เวลาตรวจล่าสุด': u.lastInspectionTimeStr || '-',
          'เลขไมล์ล่าสุด (กม.)': u.lastOdometer || 0,
          'ผู้ตรวจล่าสุดในระบบ': u.lastInspector || '-',
          'ผลตรวจล่าสุดในระบบ': u.lastStatus
            ? u.lastStatus === 'ready'
              ? 'พร้อมใช้งาน'
              : u.lastStatus === 'conditional'
              ? 'มีข้อสังเกต'
              : u.lastStatus === 'not_ready'
              ? 'ห้ามปฏิบัติงาน'
              : 'ไม่มีการใช้งานในวันนี้'
            : 'ยังไม่เคยตรวจ',
        }));

        const wsUninspected = XLSX.utils.json_to_sheet(uninspectedRows);
        wsUninspected['!cols'] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 20 },
          { wch: 24 },
          { wch: 24 },
          { wch: 20 },
          { wch: 24 },
          { wch: 22 },
          { wch: 16 },
          { wch: 18 },
          { wch: 22 },
          { wch: 22 },
        ];
        XLSX.utils.book_append_sheet(wb, wsUninspected, 'รถที่ยังไม่ตรวจสภาพ');
      }

      // Sheet 3: รายชื่อรถที่ส่งซ่อมหรือห้ามปฏิบัติงาน (Maintenance & Prohibited Vehicles)
      if (maintenanceVehicles.length > 0) {
        const maintenanceRows = maintenanceVehicles.map((m, idx) => ({
          'ลำดับ': idx + 1,
          'ทะเบียนรถ': m.vehicle.licensePlate,
          'ยี่ห้อ - รุ่น': `${m.vehicle.brand} ${m.vehicle.model}`.trim(),
          'การไฟฟ้าสังกัด': m.vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่',
          'กลุ่มประเภทรถ':
            m.vehicle.category === 'bucket_truck_class_c'
              ? '3. รถกระเช้า Class C'
              : m.vehicle.category === 'crane_truck'
              ? '2. รถบรรทุกติดเครนไฮดรอลิค'
              : '1. ยานพาหนะทั่วไป',
          'สังกัด/แผนก': m.vehicle.department || '-',
          'สถานะปัจจุบัน':
            m.reason === 'both'
              ? 'ส่งซ่อมบำรุง & ห้ามปฏิบัติงาน'
              : m.reason === 'maintenance_status'
              ? 'ส่งซ่อม / ระงับใช้'
              : 'ห้ามปฏิบัติงาน',
          'รายละเอียดข้อบกพร่อง/สาเหตุ': m.issueDetails || '-',
          'ตรวจล่าสุดในระบบ': m.lastInspectionDateStr,
          'เวลาตรวจล่าสุด': m.lastInspectionTimeStr || '-',
          'เลขไมล์ล่าสุด (กม.)': m.lastOdometer || 0,
          'ผู้ตรวจล่าสุด': m.lastInspector || '-',
          'ผลตรวจล่าสุด': m.lastStatus
            ? m.lastStatus === 'ready'
              ? 'พร้อมใช้งาน'
              : m.lastStatus === 'conditional'
              ? 'มีข้อสังเกต'
              : m.lastStatus === 'not_ready'
              ? 'ห้ามปฏิบัติงาน'
              : 'ไม่มีการใช้งานในวันนี้'
            : 'ยังไม่เคยตรวจ',
        }));

        const wsMaintenance = XLSX.utils.json_to_sheet(maintenanceRows);
        wsMaintenance['!cols'] = [
          { wch: 6 },
          { wch: 14 },
          { wch: 20 },
          { wch: 24 },
          { wch: 24 },
          { wch: 20 },
          { wch: 28 },
          { wch: 35 },
          { wch: 22 },
          { wch: 16 },
          { wch: 18 },
          { wch: 22 },
          { wch: 20 },
        ];
        XLSX.utils.book_append_sheet(wb, wsMaintenance, 'รถที่ส่งซ่อม-ห้ามใช้');
      }

      // Sheet 4: รายละเอียดการตรวจเช็คย้อนหลัง (Detailed Log)
      if (filteredRecords.length > 0) {
        const detailRows = filteredRecords.map((r, idx) => {
          let dateStr = '-';
          let timeStr = '';
          try {
            const d = new Date(r.inspectionDate);
            if (!isNaN(d.getTime())) {
              dateStr = d.toLocaleDateString('th-TH');
              timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            } else {
              dateStr = r.inspectionDate.substring(0, 10);
            }
          } catch {
            dateStr = r.inspectionDate.substring(0, 10);
          }

          const passCount = r.items.filter((i) => i.status === 'pass').length;
          const failCount = r.items.filter((i) => i.status === 'fail').length;
          const failedItems = r.items
            .filter((i) => i.status === 'fail')
            .map((i) => `${i.title}${i.remark ? ` (${i.remark})` : ''}`)
            .join('; ');

          const statusLabel =
            r.overallStatus === 'ready'
              ? 'พร้อมใช้งาน'
              : r.overallStatus === 'conditional'
              ? 'มีข้อสังเกต'
              : r.overallStatus === 'not_ready'
              ? 'ห้ามปฏิบัติงาน'
              : 'ไม่มีการใช้งานในวันนี้';

          const catLabel =
            r.vehicleCategory === 'bucket_truck_class_c'
              ? '3. รถกระเช้า Class C'
              : r.vehicleCategory === 'crane_truck'
              ? '2. รถบรรทุกติดเครนไฮดรอลิค'
              : '1. ยานพาหนะทั่วไป';

          return {
            'ลำดับ': idx + 1,
            'รหัสเอกสาร': r.id,
            'วันที่ตรวจ': dateStr,
            'เวลาที่ตรวจ': timeStr,
            'ทะเบียนรถ': r.vehicleLicensePlate,
            'ยี่ห้อ - รุ่น': `${r.brand} ${r.model}`.trim(),
            'การไฟฟ้าสังกัด': r.peaBranch || 'กฟภ. สำนักงานใหญ่',
            'กลุ่มประเภทรถ': catLabel,
            'ผู้ตรวจเช็ค': r.inspectorName,
            'เบอร์ติดต่อ': r.inspectorPhone || '-',
            'สังกัด/แผนก': r.department || '-',
            'ภารกิจ/งานที่ปฏิบัติ': r.workDescription || '-',
            'เลขไมล์ (กม.)': r.odometer,
            'ผลการตรวจรวม': statusLabel,
            'ผ่าน (ข้อ)': passCount,
            'ข้อบกพร่อง (ข้อ)': failCount,
            'รายละเอียดข้อบกพร่องที่พบ': failedItems || '-',
            'ความเห็นเพิ่มเติม/สั่งการ': r.summaryRemarks || '-',
          };
        });

        const wsDetails = XLSX.utils.json_to_sheet(detailRows);
        wsDetails['!cols'] = [
          { wch: 6 },
          { wch: 16 },
          { wch: 14 },
          { wch: 12 },
          { wch: 14 },
          { wch: 18 },
          { wch: 22 },
          { wch: 22 },
          { wch: 20 },
          { wch: 14 },
          { wch: 18 },
          { wch: 24 },
          { wch: 14 },
          { wch: 18 },
          { wch: 10 },
          { wch: 14 },
          { wch: 30 },
          { wch: 25 },
        ];
        XLSX.utils.book_append_sheet(wb, wsDetails, 'บันทึกการตรวจละเอียด');
      }

      // Construct filename
      const startTag = startDate || 'ทั้งหมด';
      const endTag = endDate || 'ปัจจุบัน';
      const fileName = `PEA_รายงานตรวจสภาพยานพาหนะ_${startTag}_ถึง_${endTag}.xlsx`;

      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Export Excel failed:', err);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUninspectedToLine = () => {
    if (uninspectedVehicles.length === 0) return;
    const branchLabel =
      selectedBranches.length === 0
        ? 'ทุกการไฟฟ้า'
        : selectedBranches.length === 1
        ? selectedBranches[0]
        : `${selectedBranches.join(', ')} (${selectedBranches.length} การไฟฟ้า)`;

    const periodLabel =
      startDate || endDate
        ? `ช่วงวันที่ ${startDate || 'เริ่มต้น'} ถึง ${endDate || 'ปัจจุบัน'}`
        : datePreset === 'today'
        ? 'ประจำวันนี้'
        : datePreset === 'yesterday'
        ? 'ประจำเมื่อวาน'
        : datePreset === 'last7'
        ? '7 วันล่าสุด'
        : datePreset === 'last30'
        ? '30 วันล่าสุด'
        : datePreset === 'this_month'
        ? 'เดือนนี้'
        : 'ทั้งหมด';

    const systemUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0].split('#')[0] : '';

    const lines = [
      `📢 รายชื่อยานพาหนะที่ "ยังไม่ได้รับการตรวจสภาพ" (${branchLabel}):`,
      `📅 รอบรายงาน: ${periodLabel}`,
      `⚠️ ยังไม่ตรวจ: ${uninspectedVehicles.length} คัน (ไม่รวมรถส่งซ่อม/ห้ามปฏิบัติงาน)`,
      `----------------------------------------`,
      ...uninspectedVehicles.map((u, i) => {
        const catName =
          u.vehicle.category === 'bucket_truck_class_c'
            ? 'รถกระเช้า Class C'
            : u.vehicle.category === 'crane_truck'
            ? 'รถบรรทุกติดเครน'
            : 'ทั่วไป';
        return `${i + 1}. [${u.vehicle.peaBranch || 'กฟภ.'}] ทะเบียน ${u.vehicle.licensePlate} (${u.vehicle.brand} ${u.vehicle.model}) [${catName}] - ${u.vehicle.department || '-'}`;
      }),
      `----------------------------------------`,
      `*กรุณาตรวจสภาพรถตามแบบฟอร์มก่อนนำรถออกปฏิบัติงาน เพื่อความปลอดภัยสูงสุด*`,
      ...(systemUrl
        ? [
            ``,
            `🔗 เข้าสู่ระบบตรวจสภาพยานพาหนะได้ที่:`,
            systemUrl,
          ]
        : []),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedUninspectedLine(true);
    setTimeout(() => setCopiedUninspectedLine(false), 3000);
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

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={(filteredRecords.length === 0 && uninspectedVehicles.length === 0) || isExporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer"
            title="ส่งออกรายงานสรุปความถี่และรายละเอียดการตรวจเช็คเป็นไฟล์ Excel (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'กำลังสร้างไฟล์...' : 'ส่งออกรายงาน Excel (.xlsx)'}</span>
          </button>

          {canOpenSpreadsheet && isSheetsConnected && onOpenSheets && (
            <button
              onClick={onOpenSheets}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium text-xs rounded-xl transition-all"
              title="เปิดสเปรดชีต Google Sheets (เฉพาะผู้ดูแลระบบ)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              เปิดสเปรดชีต Google Sheets
            </button>
          )}
        </div>
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

          <div className="relative" ref={branchDropdownRef}>
            <button
              type="button"
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-200 text-indigo-900 font-bold rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              aria-expanded={isBranchDropdownOpen}
              title="เลือกการไฟฟ้า (เลือกได้มากกว่า 1 แห่ง)"
            >
              <span className="truncate mr-1 text-left">
                {selectedBranches.length === 0 ? (
                  <span>⚡ ทุกการไฟฟ้า</span>
                ) : selectedBranches.length === 1 ? (
                  <span>⚡ {selectedBranches[0]}</span>
                ) : (
                  <span>⚡ เลือก {selectedBranches.length} การไฟฟ้า</span>
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-200 ${
                  isBranchDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Native multiple select for standard DOM selector & compatibility */}
            <select
              multiple
              value={selectedBranches}
              onChange={(e) => {
                const vals = Array.from(e.target.selectedOptions, (opt) => opt.value);
                setSelectedBranches(vals.filter((v) => v !== 'all'));
              }}
              className="sr-only"
              aria-label="ตัวกรองการไฟฟ้า (เลือกได้มากกว่า 1 แห่ง)"
            >
              <option value="all">⚡ ทุกการไฟฟ้า</option>
              {availableBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>

            {/* Dropdown Menu */}
            {isBranchDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                  <span className="text-[11px] font-bold text-slate-700">
                    รายชื่อการไฟฟ้า (เลือกได้มากกว่า 1 แห่ง)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedBranches([])}
                      className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all ${
                        selectedBranches.length === 0
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ทั้งหมด
                    </button>
                    {selectedBranches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBranches([])}
                        className="text-[10px] px-2 py-0.5 rounded-lg font-bold bg-rose-50 text-rose-600 hover:bg-rose-100"
                      >
                        ล้างค่า
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {/* All option */}
                  <button
                    type="button"
                    onClick={() => setSelectedBranches([])}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                      selectedBranches.length === 0
                        ? 'bg-indigo-50 text-indigo-950 font-bold border border-indigo-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] ${
                          selectedBranches.length === 0
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selectedBranches.length === 0 && <Check className="w-3 h-3" />}
                      </div>
                      <span>⚡ ทุกการไฟฟ้า</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({records.length} รายการ)
                    </span>
                  </button>

                  {/* Individual branches */}
                  {availableBranches.map((branch) => {
                    const isChecked = selectedBranches.includes(branch);
                    const count = records.filter(
                      (r) => (r.peaBranch || 'กฟภ. สำนักงานใหญ่') === branch
                    ).length;

                    return (
                      <button
                        key={branch}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedBranches(selectedBranches.filter((b) => b !== branch));
                          } else {
                            setSelectedBranches([...selectedBranches, branch]);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors text-left ${
                          isChecked
                            ? 'bg-indigo-50/80 text-indigo-950 font-bold border border-indigo-200'
                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] shrink-0 ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <span className="truncate">{branch}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-1">
                          ({count} รายการ)
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
              <option value="not_used">ไม่มีการใช้งานในวันนี้</option>
            </select>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Calendar className="w-4 h-4 text-blue-600" />
              กรองตามวันที่ตรวจ:
            </span>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1">
              {[
                { id: 'today', label: 'วันนี้' },
                { id: 'yesterday', label: 'เมื่อวาน' },
                { id: 'last7', label: '7 วันล่าสุด' },
                { id: 'last30', label: '30 วันล่าสุด' },
                { id: 'this_month', label: 'เดือนนี้' },
                { id: 'all', label: 'ทั้งหมด' },
              ].map((item) => {
                const isActive =
                  item.id === 'all'
                    ? datePreset === 'all' && !startDate && !endDate
                    : datePreset === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDatePresetSelect(item.id)}
                    className={`px-2.5 py-1 text-xs rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Pickers */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="shrink-0 font-medium">ตั้งแต่</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                title="เลือกวันที่เริ่มต้น"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="shrink-0 font-medium">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                title="เลือกวันที่สิ้นสุด"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleDatePresetSelect('all')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-medium transition-colors"
                title="ล้างตัวกรองวันที่"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างวันที่</span>
              </button>
            )}
          </div>
        </div>

        {(searchTerm || selectedBranches.length > 0 || selectedCategoryFilter !== 'all' || selectedVehicleFilter !== 'all' || selectedStatusFilter !== 'all' || startDate || endDate || datePreset !== 'all') && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-slate-600">
                แสดง <strong className="text-blue-600">{filteredRecords.length}</strong> รายการ จากทั้งหมด {records.length} รายการ
              </span>
              {selectedBranches.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-medium text-xs">
                  <span>⚡ การไฟฟ้า ({selectedBranches.length === 1 ? selectedBranches[0] : `${selectedBranches.length} แห่ง`})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedBranches([])}
                    className="text-indigo-500 hover:text-indigo-800"
                    title="ล้างตัวกรองการไฟฟ้า"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-medium text-xs">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  {startDate && endDate && startDate === endDate
                    ? `วันที่ ${new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH')}`
                    : `${startDate ? new Date(startDate + 'T00:00:00').toLocaleDateString('th-TH') : 'เริ่มต้น'} - ${endDate ? new Date(endDate + 'T00:00:00').toLocaleDateString('th-TH') : 'ปัจจุบัน'}`}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedBranches([]);
                setSelectedCategoryFilter('all');
                setSelectedVehicleFilter('all');
                setSelectedStatusFilter('all');
                setDatePreset('all');
                setStartDate('');
                setEndDate('');
              }}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        )}
      </div>

      {/* Overview KPI Cards for Selected Reporting Period */}
      {(filteredRecords.length > 0 || uninspectedVehicles.length > 0 || maintenanceVehicles.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Inspected count */}
          <button
            type="button"
            onClick={() => {
              setSummaryTab('inspected');
              setIsSummaryCollapsed(false);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              summaryTab === 'inspected' && !isSummaryCollapsed
                ? 'bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">ตรวจแล้วในรอบนี้</span>
                <div className="text-lg font-bold text-slate-900">
                  {vehicleSummaries.length}{' '}
                  <span className="text-xs font-normal text-slate-500">คัน</span>
                </div>
              </div>
            </div>
          </button>

          {/* Card 2: Uninspected count */}
          <button
            type="button"
            onClick={() => {
              setSummaryTab('uninspected');
              setIsSummaryCollapsed(false);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              summaryTab === 'uninspected' && !isSummaryCollapsed
                ? 'bg-amber-50/90 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                : uninspectedVehicles.length > 0
                ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300 hover:shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  uninspectedVehicles.length > 0
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {uninspectedVehicles.length > 0 ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  {uninspectedVehicles.length > 0 ? 'ยังไม่ตรวจสภาพ' : 'ตรวจครบแล้ว'}
                </span>
                <div
                  className={`text-lg font-bold ${
                    uninspectedVehicles.length > 0 ? 'text-amber-900' : 'text-emerald-700'
                  }`}
                >
                  {uninspectedVehicles.length}{' '}
                  <span className="text-xs font-normal text-slate-500">คัน</span>
                </div>
              </div>
            </div>
          </button>

          {/* Card 3: Maintenance / Prohibited count */}
          <button
            type="button"
            onClick={() => {
              setSummaryTab('maintenance');
              setIsSummaryCollapsed(false);
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              summaryTab === 'maintenance' && !isSummaryCollapsed
                ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                : maintenanceVehicles.length > 0
                ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300 hover:shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  maintenanceVehicles.length > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Wrench className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-500 block truncate">
                  ส่งซ่อม/ห้ามใช้
                </span>
                <div
                  className={`text-lg font-bold ${
                    maintenanceVehicles.length > 0 ? 'text-rose-900' : 'text-slate-700'
                  }`}
                >
                  {maintenanceVehicles.length}{' '}
                  <span className="text-xs font-normal text-slate-500">คัน</span>
                </div>
              </div>
            </div>
          </button>

          {/* Card 4: Days with inspections */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">วันที่มีการตรวจ</span>
              <div className="text-lg font-bold text-indigo-900">
                {totalUniqueDaysInPeriod}{' '}
                <span className="text-xs font-normal text-slate-500">วัน</span>
              </div>
            </div>
          </div>

          {/* Card 5: Total inspection count */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">จำนวนครั้งที่ตรวจรวม</span>
              <div className="text-lg font-bold text-emerald-900">
                {filteredRecords.length}{' '}
                <span className="text-xs font-normal text-slate-500">ครั้ง</span>
              </div>
            </div>
          </div>

          {/* Card 6: Result status breakdown */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-slate-500 block truncate">สรุปสถานะผลตรวจ</span>
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold mt-0.5">
                <span className="text-emerald-600" title="พร้อมใช้งาน">✓ {totalReadyCount}</span>
                {totalIssueCount > 0 && (
                  <span className="text-amber-600" title="มีข้อสังเกต / ห้ามปฏิบัติงาน">⚠️ {totalIssueCount}</span>
                )}
                {totalNotUsedCount > 0 && (
                  <span className="text-slate-500" title="ไม่มีการใช้งานในวันนี้">⏸️ {totalNotUsedCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Inspection Frequency & Status Summary */}
      {(filteredRecords.length > 0 || uninspectedVehicles.length > 0 || maintenanceVehicles.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
          {/* Section Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    สรุปสถานะและการตรวจเช็ครายคันตามช่วงเวลา
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    รวม {vehicleSummaries.length + uninspectedVehicles.length + maintenanceVehicles.length} คัน
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ตรวจสอบความถี่การตรวจของรถแต่ละคัน (ตรวจกี่วัน ตรวจกี่ครั้ง) รถที่ยังไม่ตรวจสภาพ และรถที่ส่งซ่อม/ห้ามใช้
                </p>
              </div>
            </div>

            {/* Controls: Sorting, View Toggle, Excel Export, Collapse */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {/* Sort Selector (only relevant for inspected list) */}
              {summaryTab === 'inspected' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                  <span className="text-[11px] font-medium text-slate-500 pl-1.5 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    เรียง:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSummarySortBy('times')}
                    className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      summarySortBy === 'times'
                        ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="เรียงตามจำนวนครั้งที่ตรวจมากที่สุด"
                  >
                    จำนวนครั้ง
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummarySortBy('days')}
                    className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      summarySortBy === 'days'
                        ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="เรียงตามจำนวนวันที่ตรวจมากที่สุด"
                  >
                    จำนวนวัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummarySortBy('plate')}
                    className={`px-2 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      summarySortBy === 'plate'
                        ? 'bg-white text-indigo-700 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="เรียงตามทะเบียนรถ"
                  >
                    ทะเบียน
                  </button>
                </div>
              )}

              {/* View Mode Toggle: Table / Cards */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSummaryViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    summaryViewMode === 'table'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="มุมมองตารางสรุป"
                >
                  <Table className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ตาราง</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryViewMode('cards')}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    summaryViewMode === 'cards'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="มุมมองการ์ดสรุป"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">การ์ด</span>
                </button>
              </div>

              {/* Excel Export Quick Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={(filteredRecords.length === 0 && uninspectedVehicles.length === 0 && maintenanceVehicles.length === 0) || isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="ส่งออกรายงานและสถิตินี้เป็น Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isExporting ? 'กำลังส่งออก...' : 'ส่งออก Excel'}</span>
              </button>

              {/* Collapse/Expand Toggle */}
              <button
                type="button"
                onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isSummaryCollapsed ? 'ขยายส่วนสรุปรายคัน' : 'ย่อส่วนสรุปรายคัน'}
              >
                {isSummaryCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Subheader Tabs: ตรวจแล้วในรอบนี้ vs ยังไม่ได้ตรวจสภาพ vs รถที่ส่งซ่อม/ห้ามใช้ */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSummaryTab('inspected');
                  setIsSummaryCollapsed(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  summaryTab === 'inspected'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200 ring-2 ring-indigo-500/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>รถที่ตรวจแล้วในรอบนี้</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    summaryTab === 'inspected'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {vehicleSummaries.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSummaryTab('uninspected');
                  setIsSummaryCollapsed(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  summaryTab === 'uninspected'
                    ? 'bg-amber-500 text-white shadow-xs border border-amber-600 ring-2 ring-amber-500/20'
                    : uninspectedVehicles.length > 0
                    ? 'bg-amber-100/80 text-amber-900 border border-amber-300 hover:bg-amber-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
                }`}
              >
                <AlertCircle
                  className={`w-3.5 h-3.5 ${
                    summaryTab === 'uninspected'
                      ? 'text-white'
                      : uninspectedVehicles.length > 0
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}
                />
                <span>รถที่ยังไม่ได้ตรวจสภาพ</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    summaryTab === 'uninspected'
                      ? 'bg-white/30 text-white'
                      : uninspectedVehicles.length > 0
                      ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {uninspectedVehicles.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSummaryTab('maintenance');
                  setIsSummaryCollapsed(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  summaryTab === 'maintenance'
                    ? 'bg-rose-600 text-white shadow-xs border border-rose-700 ring-2 ring-rose-500/20'
                    : maintenanceVehicles.length > 0
                    ? 'bg-rose-100/80 text-rose-900 border border-rose-300 hover:bg-rose-100'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-transparent'
                }`}
              >
                <Wrench
                  className={`w-3.5 h-3.5 ${
                    summaryTab === 'maintenance'
                      ? 'text-white'
                      : maintenanceVehicles.length > 0
                      ? 'text-rose-700'
                      : 'text-slate-500'
                  }`}
                />
                <span>รถที่ส่งซ่อม/ห้ามใช้</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    summaryTab === 'maintenance'
                      ? 'bg-white/30 text-white'
                      : maintenanceVehicles.length > 0
                      ? 'bg-rose-200 text-rose-950 ring-1 ring-rose-300'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {maintenanceVehicles.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
              {summaryTab === 'inspected' ? (
                <span>
                  แสดงรถที่บันทึกผลตรวจแล้ว <strong className="text-slate-800 font-semibold">{vehicleSummaries.length}</strong> คัน
                </span>
              ) : summaryTab === 'uninspected' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    แสดงรถที่ยังไม่มีการตรวจสภาพ <strong className="text-amber-800 font-bold">{uninspectedVehicles.length}</strong> คัน
                    <span className="text-[10px] text-slate-400 ml-1 font-normal">(ไม่รวมรถส่งซ่อม / ห้ามปฏิบัติงาน)</span>
                  </span>
                  {uninspectedVehicles.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyUninspectedToLine}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        copiedUninspectedLine
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                      title="คัดลอกรายชื่อรถที่ยังไม่ตรวจสภาพพร้อมลิงก์ระบบเพื่อส่งแจ้งเตือนใน LINE"
                    >
                      {copiedUninspectedLine ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>คัดลอกส่ง LINE แล้ว!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>คัดลอกส่ง LINE</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    แสดงรถที่ส่งซ่อมหรือห้ามปฏิบัติงาน <strong className="text-rose-800 font-bold">{maintenanceVehicles.length}</strong> คัน
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section Body */}
          {!isSummaryCollapsed && (
            <div className="p-4 sm:p-5">
              {/* TAB 1: Inspected Vehicles */}
              {summaryTab === 'inspected' && (
                vehicleSummaries.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-700">ไม่พบรถที่ตรวจสภาพในช่วงเวลาที่เลือก</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      ยังไม่มีการบันทึกตรวจเช็คยานพาหนะใดๆ ในช่วงเวลาหรือเงื่อนไขการกรองนี้
                    </p>
                    {uninspectedVehicles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSummaryTab('uninspected')}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>ดูรายชื่อรถที่ยังไม่ได้ตรวจสภาพ ({uninspectedVehicles.length} คัน)</span>
                      </button>
                    )}
                  </div>
                ) : summaryViewMode === 'table' ? (
                  /* Table View */
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-3 px-3.5 text-center w-12">ลำดับ</th>
                        <th className="py-3 px-3.5">ทะเบียนรถ / ยี่ห้อ - รุ่น</th>
                        <th className="py-3 px-3.5">สังกัดการไฟฟ้า</th>
                        <th className="py-3 px-3.5 text-center bg-blue-50/50">
                          <span className="inline-flex items-center gap-1 text-blue-800 font-bold">
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                            ตรวจกี่วัน
                          </span>
                        </th>
                        <th className="py-3 px-3.5 text-center bg-emerald-50/50">
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-bold">
                            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
                            ตรวจกี่ครั้ง
                          </span>
                        </th>
                        <th className="py-3 px-3.5">ผลการตรวจสภาพ</th>
                        <th className="py-3 px-3.5">ตรวจล่าสุด</th>
                        <th className="py-3 px-3.5 text-center">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vehicleSummaries.map((s, idx) => {
                        const isFiltered = selectedVehicleFilter === s.vehicleId;
                        return (
                          <tr
                            key={s.vehicleId}
                            className={`transition-colors ${
                              isFiltered ? 'bg-indigo-50/60 font-medium' : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-md shadow-2xs">
                                  {s.licensePlate}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {s.brand} {s.model}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-semibold text-[11px]">
                                  ⚡ {s.peaBranch}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {s.category === 'bucket_truck_class_c'
                                    ? 'กระเช้า C'
                                    : s.category === 'crane_truck'
                                    ? 'ติดเครน'
                                    : 'รถทั่วไป'}
                                </span>
                              </div>
                            </td>
                            {/* Days Count */}
                            <td className="py-3 px-3.5 text-center bg-blue-50/30">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100/90 text-blue-900 font-extrabold text-xs shadow-2xs">
                                <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                                {s.daysCount} วัน
                              </span>
                            </td>
                            {/* Times Count */}
                            <td className="py-3 px-3.5 text-center bg-emerald-50/30">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/90 text-emerald-900 font-extrabold text-xs shadow-2xs">
                                <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700" />
                                {s.timesCount} ครั้ง
                              </span>
                            </td>
                            {/* Status Breakdown */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                                {s.readyCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
                                    ✓ ผ่าน {s.readyCount}
                                  </span>
                                )}
                                {s.conditionalCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-semibold">
                                    ⚠️ สังเกต {s.conditionalCount}
                                  </span>
                                )}
                                {s.notReadyCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-semibold">
                                    ✕ ห้ามใช้ {s.notReadyCount}
                                  </span>
                                )}
                                {s.notUsedCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-medium">
                                    ⏸️ ไม่ได้ใช้ {s.notUsedCount}
                                  </span>
                                )}
                              </div>
                            </td>
                            {/* Latest Inspection */}
                            <td className="py-3 px-3.5 text-slate-600">
                              <div className="text-[11px] font-medium text-slate-800">
                                {s.lastDateStr} {s.lastTimeString}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                โดย {s.lastInspector} • {s.lastOdometer.toLocaleString()} กม.
                              </div>
                            </td>
                            {/* Actions */}
                            <td className="py-3 px-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedVehicleFilter === s.vehicleId) {
                                    setSelectedVehicleFilter('all');
                                  } else {
                                    setSelectedVehicleFilter(s.vehicleId);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  selectedVehicleFilter === s.vehicleId
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                                title={
                                  selectedVehicleFilter === s.vehicleId
                                    ? 'คลิกเพื่อแสดงรถทุกคัน'
                                    : 'คลิกเพื่อกรองดูประวัติการตรวจเฉพาะคันนี้'
                                }
                              >
                                {selectedVehicleFilter === s.vehicleId ? 'แสดงทั้งหมด' : 'ดูประวัติคันนี้'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Cards View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vehicleSummaries.map((s) => {
                    const isFiltered = selectedVehicleFilter === s.vehicleId;
                    return (
                      <div
                        key={s.vehicleId}
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isFiltered
                            ? 'bg-indigo-50/70 border-indigo-300 shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-xs'
                        }`}
                      >
                        {/* Top: Plate & Branch */}
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                              {s.licensePlate}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-semibold text-[11px] truncate">
                              ⚡ {s.peaBranch}
                            </span>
                          </div>
                          <div className="mt-1 font-bold text-slate-800 text-sm">
                            {s.brand} {s.model}
                          </div>
                        </div>

                        {/* Frequency Metrics Highlight: ตรวจกี่วัน / ตรวจกี่ครั้ง */}
                        <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200/80">
                          <div className="bg-blue-50/70 p-2 rounded-lg text-center border border-blue-100">
                            <span className="text-[10px] font-semibold text-blue-700 flex items-center justify-center gap-1">
                              <CalendarDays className="w-3 h-3 text-blue-600" />
                              ตรวจกี่วัน
                            </span>
                            <div className="text-base font-extrabold text-blue-900 mt-0.5">
                              {s.daysCount} <span className="text-xs font-semibold text-blue-600">วัน</span>
                            </div>
                          </div>

                          <div className="bg-emerald-50/70 p-2 rounded-lg text-center border border-emerald-100">
                            <span className="text-[10px] font-semibold text-emerald-700 flex items-center justify-center gap-1">
                              <ClipboardCheck className="w-3 h-3 text-emerald-600" />
                              ตรวจกี่ครั้ง
                            </span>
                            <div className="text-base font-extrabold text-emerald-900 mt-0.5">
                              {s.timesCount} <span className="text-xs font-semibold text-emerald-600">ครั้ง</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Breakdown & Last Inspection */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            {s.readyCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-semibold">
                                ✓ พร้อม {s.readyCount}
                              </span>
                            )}
                            {s.conditionalCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200 font-semibold">
                                ⚠️ สังเกต {s.conditionalCount}
                              </span>
                            )}
                            {s.notReadyCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200 font-semibold">
                                ✕ ห้ามใช้ {s.notReadyCount}
                              </span>
                            )}
                            {s.notUsedCount > 0 && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 font-medium">
                                ⏸️ ไม่ได้ใช้ {s.notUsedCount}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                            <span>ล่าสุด: {s.lastDateStr}</span>
                            <span className="font-mono">{s.lastOdometer.toLocaleString()} กม.</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedVehicleFilter === s.vehicleId) {
                              setSelectedVehicleFilter('all');
                            } else {
                              setSelectedVehicleFilter(s.vehicleId);
                            }
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                            selectedVehicleFilter === s.vehicleId
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {selectedVehicleFilter === s.vehicleId ? (
                            <>
                              <X className="w-3.5 h-3.5" />
                              ล้างตัวกรอง (แสดงทั้งหมด)
                            </>
                          ) : (
                            <>
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              กรองดูประวัติคันนี้
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* TAB 2: Uninspected Vehicles (รถที่ยังไม่ได้ตรวจสภาพ) */}
            {summaryTab === 'uninspected' && (
              uninspectedVehicles.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/60 rounded-xl border border-dashed border-emerald-300">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-900">ยอดเยี่ยม! ตรวจสภาพยานพาหนะครบทุกคันแล้ว</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    ยานพาหนะทุกคันที่ตรงกับเงื่อนไขการกรอง ได้รับการตรวจเช็คสภาพครบถ้วนเรียบร้อยแล้วในช่วงเวลานี้
                  </p>
                </div>
              ) : summaryViewMode === 'table' ? (
                /* Uninspected Table View */
                <div className="overflow-x-auto border border-amber-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-amber-50 text-amber-950 font-bold border-b border-amber-200">
                        <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-3.5">ทะเบียนรถ</th>
                        <th className="py-2.5 px-3.5">ยี่ห้อ - รุ่น</th>
                        <th className="py-2.5 px-3.5">การไฟฟ้าสังกัด</th>
                        <th className="py-2.5 px-3.5">กลุ่มประเภทรถ</th>
                        <th className="py-2.5 px-3.5">สังกัด/แผนก</th>
                        <th className="py-2.5 px-3.5">ตรวจล่าสุดในระบบ</th>
                        <th className="py-2.5 px-3 text-right">เลขไมล์</th>
                        <th className="py-2.5 px-3.5 text-center">สถานะในรอบนี้</th>
                        <th className="py-2.5 px-3.5 text-center w-36">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100/60">
                      {uninspectedVehicles.map((u, idx) => (
                        <tr key={u.vehicle.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-md shadow-2xs">
                              {u.vehicle.licensePlate}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-800">
                            {u.vehicle.brand} {u.vehicle.model}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-semibold text-[11px]">
                              ⚡ {u.vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.vehicle.category === 'bucket_truck_class_c'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : u.vehicle.category === 'crane_truck'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {u.vehicle.category === 'bucket_truck_class_c'
                                ? '3. รถกระเช้า Class C'
                                : u.vehicle.category === 'crane_truck'
                                ? '2. รถติดเครน'
                                : '1. รถทั่วไป'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            {u.vehicle.department || '-'}
                          </td>
                          <td className="py-3 px-3.5">
                            {u.neverInspected ? (
                              <span className="text-[11px] text-slate-400 italic">
                                ยังไม่เคยตรวจในระบบ
                              </span>
                            ) : (
                              <div>
                                <div className="text-[11px] font-medium text-slate-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {u.lastInspectionDateStr} {u.lastInspectionTimeStr}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {u.lastInspector ? `โดย ${u.lastInspector}` : ''}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                            {u.lastOdometer > 0 ? `${u.lastOdometer.toLocaleString()} กม.` : '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              ยังไม่ตรวจสภาพ
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {onStartInspection ? (
                              <button
                                type="button"
                                onClick={() => onStartInspection(u.vehicle.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                title="เริ่มตรวจเช็คสภาพยานพาหนะคันนี้ทันที"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                <span>ตรวจเช็คคันนี้</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">รอการตรวจ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Uninspected Cards View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {uninspectedVehicles.map((u) => (
                    <div
                      key={u.vehicle.id}
                      className="p-4 rounded-2xl border border-amber-200 bg-amber-50/20 hover:bg-amber-50/40 hover:border-amber-300 transition-all flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                            {u.vehicle.licensePlate}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-semibold text-[11px] truncate">
                            ⚡ {u.vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่'}
                          </span>
                        </div>
                        <div className="mt-1.5 font-bold text-slate-800 text-sm">
                          {u.vehicle.brand} {u.vehicle.model}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.vehicle.category === 'bucket_truck_class_c'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : u.vehicle.category === 'crane_truck'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {u.vehicle.category === 'bucket_truck_class_c'
                              ? '3. รถกระเช้า Class C'
                              : u.vehicle.category === 'crane_truck'
                              ? '2. รถติดเครน'
                              : '1. รถทั่วไป'}
                          </span>
                          {u.vehicle.department && (
                            <span className="text-[11px] text-slate-500 truncate">
                              • {u.vehicle.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Notice */}
                      <div className="p-2.5 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div className="text-xs min-w-0">
                          <span className="font-bold text-amber-900 block">ยังไม่ได้ตรวจสภาพในรอบนี้</span>
                          <span className="text-[10px] text-amber-700 block truncate">
                            {u.neverInspected
                              ? 'ยังไม่เคยมีบันทึกตรวจเช็คในระบบ'
                              : `ตรวจล่าสุด: ${u.lastInspectionDateStr} (${u.lastOdometer.toLocaleString()} กม.)`}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      {onStartInspection && (
                        <button
                          type="button"
                          onClick={() => onStartInspection(u.vehicle.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                          <span>ตรวจเช็คสภาพคันนี้ทันที</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* TAB 3: Maintenance Vehicles (รถที่ส่งซ่อม/ห้ามใช้) */}
            {summaryTab === 'maintenance' && (
              maintenanceVehicles.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/60 rounded-xl border border-dashed border-emerald-300">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-emerald-900">ไม่มีรถที่อยู่ในสถานะส่งซ่อมหรือห้ามใช้</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    ยานพาหนะทุกคันในระบบพร้อมใช้งานตามปกติ ไม่มีรถคันใดระงับใช้หรือมีผลตรวจไม่พร้อมใช้งาน
                  </p>
                </div>
              ) : summaryViewMode === 'table' ? (
                /* Maintenance Table View */
                <div className="overflow-x-auto border border-rose-200/80 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-rose-50 text-rose-950 font-bold border-b border-rose-200">
                        <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-3.5">ทะเบียนรถ</th>
                        <th className="py-2.5 px-3.5">ยี่ห้อ - รุ่น</th>
                        <th className="py-2.5 px-3.5">การไฟฟ้าสังกัด</th>
                        <th className="py-2.5 px-3.5">กลุ่มประเภทรถ</th>
                        <th className="py-2.5 px-3.5">สังกัด/แผนก</th>
                        <th className="py-2.5 px-3.5 text-center">สาเหตุ / สถานะ</th>
                        <th className="py-2.5 px-3.5">บันทึกล่าสุดในระบบ</th>
                        <th className="py-2.5 px-3 text-right">เลขไมล์</th>
                        <th className="py-2.5 px-3.5">รายละเอียดข้อบกพร่อง / สาเหตุ</th>
                        <th className="py-2.5 px-3.5 text-center w-36">ดำเนินการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100/70">
                      {maintenanceVehicles.map((m, idx) => (
                        <tr key={m.vehicle.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-md shadow-2xs">
                              {m.vehicle.licensePlate}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-bold text-slate-800">
                            {m.vehicle.brand} {m.vehicle.model}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-semibold text-[11px]">
                              ⚡ {m.vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              m.vehicle.category === 'bucket_truck_class_c'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : m.vehicle.category === 'crane_truck'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {m.vehicle.category === 'bucket_truck_class_c'
                                ? '3. รถกระเช้า Class C'
                                : m.vehicle.category === 'crane_truck'
                                ? '2. รถติดเครน'
                                : '1. รถทั่วไป'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-slate-600">
                            {m.vehicle.department || '-'}
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {m.reason === 'both' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-[11px] font-bold">
                                <Wrench className="w-3 h-3 text-rose-600" />
                                ส่งซ่อม & ห้ามใช้
                              </span>
                            ) : m.reason === 'not_ready_inspection' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded-full text-[11px] font-bold">
                                <XCircle className="w-3 h-3 text-red-600" />
                                ไม่พร้อมปฏิบัติงาน
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-100 text-orange-800 border border-orange-300 rounded-full text-[11px] font-bold">
                                <Wrench className="w-3 h-3 text-orange-600" />
                                ส่งซ่อม/ระงับใช้
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            {m.lastRecord ? (
                              <div>
                                <div className="text-[11px] font-medium text-slate-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  {m.lastInspectionDateStr} {m.lastInspectionTimeStr}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {m.lastInspector ? `โดย ${m.lastInspector}` : ''}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">
                                ยังไม่มีบันทึกในระบบ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-700">
                            {m.lastOdometer > 0 ? `${m.lastOdometer.toLocaleString()} กม.` : '-'}
                          </td>
                          <td className="py-3 px-3.5 max-w-xs">
                            <p className="text-xs text-rose-900 font-medium truncate" title={m.issueDetails || 'ระงับการใช้งานเพื่อตรวจสอบ/ซ่อมแซม'}>
                              {m.issueDetails || 'ระงับการใช้งานเพื่อตรวจสอบ/ซ่อมแซม'}
                            </p>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (selectedVehicleFilter === m.vehicle.id) {
                                    setSelectedVehicleFilter('all');
                                  } else {
                                    setSelectedVehicleFilter(m.vehicle.id);
                                  }
                                }}
                                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                  selectedVehicleFilter === m.vehicle.id
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-50'
                                }`}
                                title="กรองดูประวัติการตรวจเช็คย้อนหลังของคันนี้"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>{selectedVehicleFilter === m.vehicle.id ? 'ล้างกรอง' : 'ดูประวัติ'}</span>
                              </button>
                              {onStartInspection && (
                                <button
                                  type="button"
                                  onClick={() => onStartInspection(m.vehicle.id)}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                  title="ตรวจเช็คสภาพใหม่/อัปเดตสภาพ"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5" />
                                  <span>ตรวจใหม่</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Maintenance Cards View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {maintenanceVehicles.map((m) => (
                    <div
                      key={m.vehicle.id}
                      className="p-4 rounded-2xl border border-rose-200 bg-rose-50/20 hover:bg-rose-50/40 hover:border-rose-300 transition-all flex flex-col justify-between gap-3 shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                            {m.vehicle.licensePlate}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md font-semibold text-[11px] truncate">
                            ⚡ {m.vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่'}
                          </span>
                        </div>
                        <div className="mt-1.5 font-bold text-slate-800 text-sm">
                          {m.vehicle.brand} {m.vehicle.model}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            m.vehicle.category === 'bucket_truck_class_c'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : m.vehicle.category === 'crane_truck'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {m.vehicle.category === 'bucket_truck_class_c'
                              ? '3. รถกระเช้า Class C'
                              : m.vehicle.category === 'crane_truck'
                              ? '2. รถติดเครน'
                              : '1. รถทั่วไป'}
                          </span>
                          {m.vehicle.department && (
                            <span className="text-[11px] text-slate-500 truncate">
                              • {m.vehicle.department}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason & Defect Box */}
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-900">
                            {m.reason === 'both' ? (
                              <>
                                <Wrench className="w-3.5 h-3.5 text-rose-600" />
                                ส่งซ่อม & ห้ามใช้
                              </>
                            ) : m.reason === 'not_ready_inspection' ? (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                ไม่พร้อมปฏิบัติงาน
                              </>
                            ) : (
                              <>
                                <Wrench className="w-3.5 h-3.5 text-orange-600" />
                                ส่งซ่อม/ระงับใช้
                              </>
                            )}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {m.lastOdometer > 0 ? `${m.lastOdometer.toLocaleString()} กม.` : ''}
                          </span>
                        </div>
                        {m.issueDetails && (
                          <p className="text-xs text-rose-800 bg-white/70 p-2 rounded-lg border border-rose-100 leading-relaxed font-medium">
                            {m.issueDetails}
                          </p>
                        )}
                        <div className="text-[10px] text-slate-500 pt-0.5">
                          {m.lastRecord ? (
                            <span>บันทึกล่าสุด: {m.lastInspectionDateStr} {m.lastInspectionTimeStr} {m.lastInspector ? `(${m.lastInspector})` : ''}</span>
                          ) : (
                            <span>ยังไม่มีประวัติตรวจเช็คในระบบ</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedVehicleFilter === m.vehicle.id) {
                              setSelectedVehicleFilter('all');
                            } else {
                              setSelectedVehicleFilter(m.vehicle.id);
                            }
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedVehicleFilter === m.vehicle.id
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-white border border-rose-200 text-rose-800 hover:bg-rose-50'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{selectedVehicleFilter === m.vehicle.id ? 'แสดงทั้งหมด' : 'ประวัติคันนี้'}</span>
                        </button>
                        {onStartInspection ? (
                          <button
                            type="button"
                            onClick={() => onStartInspection(m.vehicle.id)}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>ตรวจสภาพใหม่</span>
                          </button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
          )}
        </div>
      )}

      {/* Detailed Records Log Feed Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
            รายการบันทึกการตรวจเช็คสภาพละเอียด
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700">
              {filteredRecords.length} รายการ
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ใบบันทึกผลการตรวจเช็คสภาพยานพาหนะพร้อมรายละเอียดรายการตรวจและข้อบกพร่อง
          </p>
        </div>
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

                    {isAdmin && (
                      <button
                        onClick={() => setDeletingRecordId(rec.id)}
                        title="ลบรายการตรวจนี้ (เฉพาะผู้ดูแลระบบ)"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
              {activeRecord.overallStatus === 'not_used' || activeRecord.items.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center mx-auto">
                    <PauseCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">ไม่มีการใช้งานยานพาหนะในวันนี้ (จอดประจำการ)</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    ได้รับการบันทึกสถานะไม่มีการใช้งาน โดยไม่ต้องตรวจเช็คสภาพอุปกรณ์ย่อย
                  </p>
                </div>
              ) : (
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
              )}

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
          if (deletingRecordId && isAdmin) {
            onDeleteRecord(deletingRecordId);
            setDeletingRecordId(null);
          }
        }}
        onCancel={() => setDeletingRecordId(null)}
      />
    </div>
  );
};
