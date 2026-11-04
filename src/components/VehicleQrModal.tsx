import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  QrCode, 
  Car, 
  ShieldCheck, 
  Building, 
  Wrench, 
  Zap, 
  Sparkles,
  Layers,
  Filter,
  Loader2
} from 'lucide-react';
import { Vehicle } from '../types/vehicle';
import { VEHICLE_CATEGORY_META } from './VehicleManager';

interface VehicleQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicles: Vehicle[];
  initialVehicle?: Vehicle | null;
  peaBranches?: string[];
}

// Helper to escape HTML in generated print templates
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Generate self-contained HTML for an individual sticker (printable in iframe or standalone)
function generateStickerHtml(
  vehicle: Vehicle,
  qrDataUrl: string,
  categoryBadge: string
): string {
  const branchName = vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่';
  const deptName = vehicle.department || 'งานยานพาหนะ';
  const province = vehicle.province || 'ประเทศไทย';
  const brandModel = `${vehicle.brand} ${vehicle.model}`;

  return `
    <div class="sticker-card">
      <!-- Top Header -->
      <div class="sticker-header">
        <div class="pea-logo-box">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#fde047" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="header-text">
          <div class="pea-title">การไฟฟ้าส่วนภูมิภาค (PEA)</div>
          <div class="pea-subtitle">ตรวจสภาพยานพาหนะก่อนปฏิบัติงาน</div>
        </div>
      </div>

      <!-- Branch & Category Row -->
      <div class="meta-row">
        <span class="badge branch-badge">
          🏢 ${escapeHtml(branchName)}
        </span>
        <span class="badge cat-badge">
          ${escapeHtml(categoryBadge)}
        </span>
      </div>

      <!-- License Plate Banner -->
      <div class="plate-box">
        <div class="plate-label">หมายเลขทะเบียนรถ</div>
        <div class="plate-number">${escapeHtml(vehicle.licensePlate)}</div>
        <div class="plate-sub">${escapeHtml(province)} • ${escapeHtml(brandModel)}</div>
      </div>

      <!-- QR Code Container -->
      <div class="qr-container">
        <div class="qr-frame">
          <img src="${qrDataUrl}" width="160" height="160" alt="QR Code" style="display:block;width:160px;height:160px;" />
        </div>
        <div class="qr-instruction">
          📱 <strong>สแกนเพื่อตรวจสภาพรถคันนี้</strong>
        </div>
        <div class="qr-dept">
          สังกัด: ${escapeHtml(deptName)}
        </div>
      </div>

      <!-- Card Footer -->
      <div class="sticker-footer">
        <span>PEA FLEET SAFETY</span>
        <span style="font-family: monospace; font-size: 8px;">ID: ${escapeHtml(vehicle.id)}</span>
      </div>
    </div>
  `;
}

// Standalone CSS for isolated print iframe (exact dimensions and guaranteed color printing)
const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700;800&display=swap');

  @page {
    size: A4 portrait;
    margin: 8mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #0f172a;
    font-family: 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .print-page-container {
    width: 100%;
    max-width: 194mm;
    margin: 0 auto;
  }

  .sticker-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    justify-items: center;
  }

  .sticker-single {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 6mm;
  }

  .sticker-card {
    width: 90mm;
    background: #ffffff;
    border: 2px solid #3730a3;
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-inside: avoid;
    break-inside: avoid;
    margin-bottom: 12px;
    box-sizing: border-box;
  }

  .sticker-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 2px solid #4f46e5;
  }

  .pea-logo-box {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: linear-gradient(135deg, #6b21a8, #4338ca);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .header-text {
    flex: 1;
    min-width: 0;
  }

  .pea-title {
    font-size: 10px;
    font-weight: 800;
    color: #581c87;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .pea-subtitle {
    font-size: 11px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.2;
  }

  .meta-row {
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px;
    border-radius: 5px;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }

  .branch-badge {
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    color: #312e81;
    max-width: 140px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cat-badge {
    background: #f3e8ff;
    border: 1px solid #e9d5ff;
    color: #6b21a8;
  }

  .plate-box {
    margin-top: 8px;
    background: #0f172a;
    color: #ffffff;
    border-radius: 10px;
    padding: 6px 10px;
    text-align: center;
    border: 1px solid #334155;
  }

  .plate-label {
    font-size: 9px;
    color: #94a3b8;
    font-weight: 500;
  }

  .plate-number {
    font-size: 20px;
    font-weight: 900;
    font-family: monospace, 'Prompt';
    color: #fde047;
    letter-spacing: 1px;
    line-height: 1.1;
    margin-top: 1px;
  }

  .plate-sub {
    font-size: 9px;
    color: #cbd5e1;
    margin-top: 1px;
    font-weight: 500;
  }

  .qr-container {
    margin-top: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .qr-frame {
    background: #ffffff;
    padding: 6px;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .qr-instruction {
    margin-top: 6px;
    font-size: 10px;
    font-weight: 700;
    color: #1e1b4b;
    text-align: center;
  }

  .qr-dept {
    font-size: 8px;
    color: #64748b;
    margin-top: 1px;
    text-align: center;
  }

  .sticker-footer {
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px dashed #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 8px;
    color: #94a3b8;
  }
`;

export const VehicleQrModal: React.FC<VehicleQrModalProps> = ({
  isOpen,
  onClose,
  vehicles,
  initialVehicle = null,
  peaBranches = [],
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    initialVehicle?.id || (vehicles[0]?.id || '')
  );
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');
  const [singleCopies, setSingleCopies] = useState<1 | 4>(1);
  const [batchBranch, setBatchBranch] = useState<string>('all');
  const [batchCategory, setBatchCategory] = useState<string>('all');
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [isCopied, setIsCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync initial vehicle when modal opens
  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.id);
      setViewMode('single');
    }
  }, [initialVehicle, isOpen]);

  // Construct inspection URL for a given vehicle
  const getInspectUrl = (vehicleId: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?inspect=${encodeURIComponent(vehicleId)}`;
  };

  // Generate QR codes using `qrcode`
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generateAll = async () => {
      const urls: Record<string, string> = {};
      for (const v of vehicles) {
        try {
          const url = getInspectUrl(v.id);
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'M',
          });
          urls[v.id] = dataUrl;
        } catch (err) {
          console.error('Failed to generate QR for vehicle', v.licensePlate, err);
        }
      }
      if (isMounted) {
        setQrCodeDataUrls(urls);
      }
    };

    generateAll();

    return () => {
      isMounted = false;
    };
  }, [isOpen, vehicles]);

  if (!isOpen) return null;

  const currentVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  // Filter vehicles for batch printing
  const batchVehicles = vehicles.filter((v) => {
    const matchBranch = batchBranch === 'all' || (v.peaBranch || 'กฟภ. สำนักงานใหญ่') === batchBranch;
    const matchCat = batchCategory === 'all' || v.category === batchCategory;
    return matchBranch && matchCat;
  });

  const handleCopyLink = (vehicleId: string) => {
    const url = getInspectUrl(vehicleId);
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSingle = (vehicle: Vehicle) => {
    const dataUrl = qrCodeDataUrls[vehicle.id];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-ตรวจสภาพ-${vehicle.licensePlate}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Robust printing using an isolated iframe to guarantee no blank pages or CSS clipping
  const executeIframePrint = (targets: Vehicle[], isSingleMode: boolean) => {
    try {
      // Remove any previous print frame
      const oldFrame = document.getElementById('pea-qr-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'pea-qr-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        setIsPrinting(false);
        return;
      }

      // Generate HTML for stickers
      const cardsHtml = targets
        .map((v) => {
          const qrUrl = qrCodeDataUrls[v.id] || '';
          const catMeta = VEHICLE_CATEGORY_META[v.category] || VEHICLE_CATEGORY_META.general;
          return generateStickerHtml(v, qrUrl, catMeta.badgeLabel);
        })
        .join('');

      const containerClass = (isSingleMode && targets.length === 1) ? 'sticker-single' : 'sticker-grid';

      const fullHtml = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>พิมพ์สติกเกอร์ตรวจสภาพยานพาหนะ PEA</title>
  <style>
    ${PRINT_CSS}
  </style>
</head>
<body>
  <div class="print-page-container">
    <div class="${containerClass}">
      ${cardsHtml}
    </div>
  </div>
</body>
</html>`;

      doc.open();
      doc.write(fullHtml);
      doc.close();

      // Wait for all images inside iframe to be loaded
      const images = Array.from(doc.images);
      Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      ).then(() => {
        setTimeout(() => {
          setIsPrinting(false);
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error('Iframe print failed, falling back to window.print():', e);
            window.print();
          }

          // Clean up iframe after print dialog finishes
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 3000);
        }, 200);
      });
    } catch (err) {
      console.error('Print failed:', err);
      setIsPrinting(false);
      window.print();
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);

    if (viewMode === 'single') {
      if (!currentVehicle) {
        setIsPrinting(false);
        return;
      }
      // If user selected 4 copies, repeat current vehicle 4 times for a full A4 sheet
      const targets = singleCopies === 4 
        ? [currentVehicle, currentVehicle, currentVehicle, currentVehicle]
        : [currentVehicle];
      executeIframePrint(targets, singleCopies === 1);
    } else {
      if (batchVehicles.length === 0) {
        setIsPrinting(false);
        return;
      }
      executeIframePrint(batchVehicles, false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible print:h-auto">
      {/* Inline Print Styles for direct Ctrl+P */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          header, footer, nav, .no-print {
            display: none !important;
          }
          .fixed.inset-0 {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            overflow: visible !important;
            padding: 0 !important;
            height: auto !important;
            display: block !important;
          }
          .max-w-4xl {
            max-width: 100% !important;
            width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #pea-vehicle-qr-print-zone {
            position: static !important;
            overflow: visible !important;
            height: auto !important;
            padding: 5mm !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:h-auto print:overflow-visible print:border-none print:shadow-none print:w-full">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                คิวอาร์โค้ดสติกเกอร์ติดหน้ารถ
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-medium hidden sm:inline-block">
                  สแกนตรวจสภาพทันที
                </span>
              </h3>
              <p className="text-xs text-purple-200 mt-0.5">
                นำ QR Code ติดหน้ารถเพื่อให้ผู้ปฏิบัติงานใช้มือถือสแกนเข้าหน้าตรวจสภาพของรถคันนั้นได้ทันที
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab & Controls Bar */}
        <div className="p-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'single'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              คันนี้คันเดียว
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'batch'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              พิมพ์ชุดสติกเกอร์หลายคัน ({vehicles.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-white font-medium text-xs sm:text-sm rounded-xl shadow-xs transition-all active:scale-98 ${
                isPrinting 
                  ? 'bg-indigo-400 cursor-wait' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
              title="สั่งพิมพ์สติกเกอร์ (A4 พร้อมพิมพ์คมชัดระดับสูง)"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังเตรียมพิมพ์...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์สติกเกอร์ (Print)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Controls for Batch or Single */}
        {viewMode === 'single' ? (
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs no-print shrink-0">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Car className="w-4 h-4 text-blue-600" />
              เลือกรถที่ต้องการแสดง QR:
            </span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} ({v.brand} {v.model}) - {v.peaBranch || 'กฟภ.'}
                </option>
              ))}
            </select>

            {/* Copies selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <span className="text-[11px] text-slate-500 px-1 font-medium">จำนวนพิมพ์:</span>
              <button
                type="button"
                onClick={() => setSingleCopies(1)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  singleCopies === 1
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 ดวง
              </button>
              <button
                type="button"
                onClick={() => setSingleCopies(4)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  singleCopies === 4
                    ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="พิมพ์ 4 ดวง บนกระดาษสติกเกอร์ A4 แผ่นเดียว สำหรับติดหลายจุดหรือสำรอง"
              >
                4 ดวง (เต็มแผ่น A4)
              </button>
            </div>

            {currentVehicle && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(currentVehicle.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                  title="คัดลอกลิงก์ตรงสำหรับเปิดตรวจสภาพรถคันนี้"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์'}</span>
                </button>
                <button
                  onClick={() => handleDownloadSingle(currentVehicle)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors"
                  title="บันทึกภาพ QR Code เป็นไฟล์ PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลดรูป QR</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs no-print shrink-0">
            <span className="font-bold text-slate-700 flex items-center gap-1">
              <Filter className="w-4 h-4 text-indigo-600" />
              กรองรถสำหรับพิมพ์:
            </span>
            <select
              value={batchBranch}
              onChange={(e) => setBatchBranch(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none"
            >
              <option value="all">⚡ ทุกการไฟฟ้า ({vehicles.length} คัน)</option>
              {Array.from(new Set(vehicles.map((v) => v.peaBranch || 'กฟภ. สำนักงานใหญ่'))).map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            <select
              value={batchCategory}
              onChange={(e) => setBatchCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none"
            >
              <option value="all">ทุกกลุ่มประเภท (3 กลุ่ม)</option>
              <option value="general">1. ยานพาหนะทั่วไป</option>
              <option value="crane_truck">2. รถบรรทุกติดเครนไฮดรอลิค</option>
              <option value="bucket_truck_class_c">3. รถกระเช้า Class C</option>
            </select>
            <span className="text-slate-500 font-medium ml-auto">
              พร้อมพิมพ์ {batchVehicles.length} สติกเกอร์ (แนะนำขนาด A4 พิมพ์ 4-6 คัน/แผ่น)
            </span>
          </div>
        )}

        {/* Printable & Preview Area */}
        <div 
          ref={printAreaRef}
          id="pea-vehicle-qr-print-zone"
          className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 print:p-0 print:bg-white"
        >
          {viewMode === 'single' ? (
            /* Single Vehicle Sticker Card View */
            currentVehicle ? (
              <div className="flex flex-col items-center justify-center py-4">
                <VehicleStickerCard 
                  vehicle={currentVehicle} 
                  qrDataUrl={qrCodeDataUrls[currentVehicle.id]} 
                  inspectUrl={getInspectUrl(currentVehicle.id)}
                />
                
                <div className="mt-4 text-center text-xs text-slate-500 no-print max-w-md">
                  💡 <strong>คำแนะนำการใช้งาน:</strong> พิมพ์ลงบนกระดาษสติกเกอร์กันน้ำหรือกระดาษโฟโต้ แล้วเคลือบฟิล์มใสใส นำไปติดบริเวณคอนโซลหน้าหรือมุมกระจกหน้ารถด้านใน เพื่อให้พนักงานขับรถหรือผู้ตรวจสามารถใช้กล้องโทรศัพท์สแกนเปิดแบบฟอร์มได้ทันที
                </div>
              </div>
            ) : null
          ) : (
            /* Batch Multi-Vehicle Stickers Grid */
            <div className="space-y-6">
              {batchVehicles.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                  <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">ไม่พบยานพาหนะตามตัวกรองที่เลือก</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
                  {batchVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="flex justify-center">
                      <VehicleStickerCard 
                        vehicle={vehicle} 
                        qrDataUrl={qrCodeDataUrls[vehicle.id]} 
                        inspectUrl={getInspectUrl(vehicle.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between no-print shrink-0">
          <div className="text-xs text-slate-500">
            ระบบจะเปิดหน้าตรวจเช็คสภาพยานพาหนะและเลือกรถคันนี้ให้อัตโนมัติเมื่อสแกน
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Official PEA Windshield / Dashboard Inspection Sticker
interface VehicleStickerCardProps {
  vehicle: Vehicle;
  qrDataUrl?: string;
  inspectUrl: string;
}

const VehicleStickerCard: React.FC<VehicleStickerCardProps> = ({
  vehicle,
  qrDataUrl,
  inspectUrl,
}) => {
  const categoryInfo = VEHICLE_CATEGORY_META[vehicle.category] || VEHICLE_CATEGORY_META.general;

  return (
    <div className="w-[330px] sm:w-[350px] bg-white rounded-2xl border-2 border-indigo-700 shadow-md p-4 flex flex-col justify-between text-slate-900 relative overflow-hidden print:shadow-none print:break-inside-avoid print:border-indigo-900 print:mb-4">
      {/* Top Header Badge */}
      <div className="flex items-center gap-2.5 pb-2.5 border-b-2 border-indigo-600">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
          <ShieldCheck className="w-5 h-5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-purple-900 tracking-wide uppercase">
              การไฟฟ้าส่วนภูมิภาค (PEA)
            </span>
          </div>
          <h4 className="text-xs font-bold text-slate-800 leading-tight truncate">
            ตรวจสภาพยานพาหนะก่อนปฏิบัติงาน
          </h4>
        </div>
      </div>

      {/* PEA Branch & Category Ribbon */}
      <div className="mt-2.5 flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-bold truncate max-w-[170px]">
          <Building className="w-3 h-3 text-indigo-600 shrink-0" />
          <span className="truncate">{vehicle.peaBranch || 'กฟภ. สำนักงานใหญ่'}</span>
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${categoryInfo.bg}`}>
          {categoryInfo.icon}
          <span>{categoryInfo.badgeLabel}</span>
        </span>
      </div>

      {/* Big License Plate Banner */}
      <div className="mt-3 bg-slate-900 text-white rounded-xl py-2 px-3 text-center shadow-inner border border-slate-700">
        <div className="text-[10px] text-slate-300 tracking-wider font-medium">หมายเลขทะเบียนรถ</div>
        <div className="text-xl sm:text-2xl font-black font-mono tracking-wider leading-none mt-0.5 text-amber-300">
          {vehicle.licensePlate}
        </div>
        <div className="text-[10px] text-slate-300 mt-0.5 font-medium">
          {vehicle.province || 'ประเทศไทย'} • {vehicle.brand} {vehicle.model}
        </div>
      </div>

      {/* QR Code Container */}
      <div className="mt-3 flex flex-col items-center justify-center p-2.5 bg-gradient-to-b from-indigo-50/50 to-purple-50/40 rounded-xl border border-indigo-100">
        <div className="bg-white p-2 rounded-xl shadow-xs border border-slate-200">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code ${vehicle.licensePlate}`}
              width={176}
              height={176}
              className="w-44 h-44 object-contain block"
            />
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
              กำลังสร้าง QR...
            </div>
          )}
        </div>
        
        {/* Instruction underneath QR */}
        <div className="mt-2 text-center">
          <p className="text-[11px] font-bold text-indigo-950 flex items-center justify-center gap-1">
            <span>📱 สแกนเพื่อตรวจสภาพรถคันนี้</span>
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">
            สังกัด: {vehicle.department || 'งานยานพาหนะ'}
          </p>
        </div>
      </div>

      {/* Card Footer URL reference */}
      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
        <span>PEA FLEET SAFETY</span>
        <span className="font-mono text-[8px] text-slate-400 truncate max-w-[180px]">
          ID: {vehicle.id}
        </span>
      </div>
    </div>
  );
};
