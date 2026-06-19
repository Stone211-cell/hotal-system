"use client";

import { cn } from "@/lib/utils";

// ─── 1. Circular Occupancy Progress Chart ────────────────
interface CircularProgressProps {
  value: number; // 0 - 100
  title: string;
  subtitle: string;
}

export function CircularProgressChart({ value, title, subtitle }: CircularProgressProps) {
  // คำนวณเส้นรอบวงวงกลม (Radius = 36, Circumference = 2 * PI * r = 226)
  const radius = 36;
  const strokeDasharray = 2 * Math.PI * radius;
  const strokeDashoffset = strokeDasharray - (value / 100) * strokeDasharray;

  return (
    <div className="flex flex-col items-center justify-center p-4 border rounded-2xl bg-card hover:shadow-md transition-shadow">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </p>
      
      <div className="relative flex items-center justify-center h-28 w-28">
        <svg className="w-full h-full transform -rotate-90">
          {/* วงแหวนสีพื้นหลัง */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-muted"
            strokeWidth="8"
            fill="transparent"
          />
          {/* วงแหวนแสดงค่าความก้าวหน้า */}
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-primary transition-all duration-1000 ease-out"
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        {/* ข้อความบอกเปอร์เซ็นต์ด้านใน */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{value}%</span>
          <span className="text-[10px] text-muted-foreground">เข้าพัก</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-2 font-medium">
        {subtitle}
      </p>
    </div>
  );
}

// ─── 2. Revenue vs Expenses Bar Chart ────────────────────
interface RevenueBarChartProps {
  income: number;
  expense: number;
}

export function RevenueBarChart({ income, expense }: RevenueBarChartProps) {
  const max = Math.max(income, expense, 1);
  const incomeHeight = (income / max) * 100;
  const expenseHeight = (expense / max) * 100;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-5 border rounded-2xl bg-card hover:shadow-md transition-shadow space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">เปรียบเทียบ รายรับ - รายจ่าย</h3>
        <p className="text-xs text-muted-foreground">ภาพรวมการเงินในช่วงเวลาที่เลือก</p>
      </div>

      <div className="flex items-end justify-around h-44 border-b pb-2 pt-4">
        {/* แท่งรายรับ */}
        <div className="flex flex-col items-center w-1/3 group">
          <p className="text-[10px] font-semibold text-green-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatCurrency(income)}
          </p>
          <div
            style={{ height: `${incomeHeight}%` }}
            className="w-12 bg-gradient-to-t from-green-600 to-green-400 rounded-t-xl transition-all duration-1000 shadow-lg shadow-green-500/10 hover:brightness-110 cursor-pointer"
          />
          <p className="text-xs font-semibold mt-2 text-foreground">รายรับ</p>
        </div>

        {/* แท่งรายจ่าย */}
        <div className="flex flex-col items-center w-1/3 group">
          <p className="text-[10px] font-semibold text-red-600 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatCurrency(expense)}
          </p>
          <div
            style={{ height: `${expenseHeight}%` }}
            className="w-12 bg-gradient-to-t from-red-600 to-red-400 rounded-t-xl transition-all duration-1000 shadow-lg shadow-red-500/10 hover:brightness-110 cursor-pointer"
          />
          <p className="text-xs font-semibold mt-2 text-foreground">รายจ่าย</p>
        </div>
      </div>

      {/* คำอธิบาย */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-muted-foreground">รายรับรวม</p>
            <p className="font-bold text-green-600 truncate">{formatCurrency(income)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-muted-foreground">รายจ่ายรวม</p>
            <p className="font-bold text-red-600 truncate">{formatCurrency(expense)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 3. Occupancy Trend Line Chart (SVG) ──────────────────
interface TrendLineChartProps {
  dataPoints?: number[]; // อัตราการเข้าพักย้อนหลัง เช่น [10, 25, 40, 30, 45, 60, 75]
  labels?: string[];
}

export function TrendLineChart({
  dataPoints = [30, 45, 35, 50, 65, 55, 75],
  labels = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]
}: TrendLineChartProps) {
  // สร้างจุดเชื่อมสำหรับการวาด SVG Path
  const width = 500;
  const height = 150;
  const padding = 25;

  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxVal = 100;
  const minVal = 0;

  // คำนวณพิกัด X, Y สำหรับแต่ละจุดข้อมูล
  const points = dataPoints.map((val, idx) => {
    const x = padding + (idx / Math.max(1, dataPoints.length - 1)) * chartWidth;
    const y = padding + chartHeight - (val / maxVal) * chartHeight;
    return { x, y, val };
  });

  // สร้างสตริง SVG Path d
  const pathD = points.reduce((path, pt, idx) => {
    return path + `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y} `;
  }, "");

  // สร้างสตริงสำหรับใส่สีแบบ Area ใต้เส้นกราฟ
  const areaD =
    points.length > 0
      ? `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : "";

  return (
    <div className="p-5 border rounded-2xl bg-card hover:shadow-md transition-shadow space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">แนวโน้มอัตราเข้าพักย้อนหลัง</h3>
        <p className="text-xs text-muted-foreground">อัตราการจองห้องพักในรอบ 7 วันที่ผ่านมา</p>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary, #6d28d9)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-primary, #6d28d9)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* เส้นตารางหลัง (Grid Lines) */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(150,150,150,0.1)" strokeDasharray="3" />
          <line x1={padding} y1={padding + chartHeight / 2} x2={width - padding} y2={padding + chartHeight / 2} stroke="rgba(150,150,150,0.1)" strokeDasharray="3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(150,150,150,0.15)" />

          {/* สีใต้เส้นกราฟ */}
          {areaD && <path d={areaD} fill="url(#chartGradient)" className="fill-primary/10" />}

          {/* เส้นกราฟหลัก */}
          {pathD && (
            <path
              d={pathD}
              fill="transparent"
              className="stroke-primary"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* จุดวงกลมบนจุดข้อมูลแต่ละจุด */}
          {points.map((pt, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                className="fill-background stroke-primary"
                strokeWidth="2.5"
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r="8"
                className="fill-primary opacity-0 hover:opacity-20 transition-opacity"
              />
              {/* Tooltip เมื่อชี้เมาส์ */}
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                className="text-[10px] font-bold fill-foreground opacity-0 hover:opacity-100 transition-opacity"
              >
                {pt.val}%
              </text>
            </g>
          ))}

          {/* ข้อความบอกวัน (Labels) */}
          {labels.map((lbl, idx) => {
            const x = padding + (idx / (labels.length - 1)) * chartWidth;
            return (
              <text
                key={idx}
                x={x}
                y={height - 5}
                textAnchor="middle"
                className="text-[10px] fill-muted-foreground font-medium"
              >
                {lbl}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
