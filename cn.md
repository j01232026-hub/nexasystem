# Glow 美學 - 開發變更日誌

> 最後更新：2026-02-15

---

## 2026-02-15 - 預約狀態標籤功能

### 需求描述

針對每筆預約提供「狀態標籤」功能：

| 狀態 | 標籤名稱 | 說明 |
|------|----------|------|
| pending | 已預約 | C端或B端預約後的初始狀態 |
| confirmed | 已確認 | B端主動勾選或預約超過12小時後自動確認（已確認後無法改回已預約） |
| cancelled | 已取消 | B端點選按鈕取消（已取消的行程保留在資料庫） |
| no_show | NoShow | B端點選 NoShow |
| completed | 已完成 | B端點選完成服務 |

---

### Step 1: 數據庫遷移

**文件**: `db/migrations/007_appointment_status_enhancement.sql`

#### 1.1 新增 `confirmed_at` 欄位

```sql
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
```

#### 1.2 更新狀態約束

```sql
-- 舊狀態: scheduled, confirmed, completed, cancelled, no_show, blocked
-- 新狀態: pending, confirmed, completed, cancelled, no_show, blocked

ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked'));
```

#### 1.3 自動確認函數

```sql
CREATE OR REPLACE FUNCTION public.auto_confirm_appointments()
RETURNS void AS $$
BEGIN
  UPDATE public.appointments
  SET 
    status = 'confirmed',
    confirmed_at = NOW()
  WHERE status = 'pending'
    AND start_time > NOW()
    AND created_at < NOW() - INTERVAL '12 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 1.4 狀態回退保護 Trigger

```sql
CREATE OR REPLACE FUNCTION public.prevent_status_regression()
RETURNS TRIGGER AS $$
BEGIN
  -- 已確認無法改回已預約
  IF OLD.status = 'confirmed' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'Cannot change status from confirmed back to pending';
  END IF;
  
  -- 狀態變更為 confirmed 時，自動設置 confirmed_at
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_status_regression_trigger
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_status_regression();
```

#### 1.5 數據遷移

```sql
-- 將舊的 'scheduled' 狀態改為 'pending'
UPDATE public.appointments 
SET status = 'pending' 
WHERE status = 'scheduled';

-- 為已確認的預約設置 confirmed_at
UPDATE public.appointments 
SET confirmed_at = updated_at 
WHERE status = 'confirmed' AND confirmed_at IS NULL;
```

---

### Step 2: 更新 AppointmentDetailsModal 組件

**文件**: `src/components/AppointmentDetailsModal.jsx`

#### 2.1 新增圖標導入

```jsx
import { X, User, Calendar, Clock, Receipt, Note, Pencil, Trash, Lock, CheckCircle, Warning, Phone, Tag, Prohibit, HourglassMedium, CalendarCheck, XCircle, UserMinus } from '@phosphor-icons/react';
```

#### 2.2 更新狀態標籤函數

```jsx
const getStatusLabel = (status) => {
  const map = {
    'pending': '已預約',
    'scheduled': '已預約',
    'confirmed': '已確認',
    'completed': '已完成',
    'cancelled': '已取消',
    'no_show': 'NoShow',
    'blocked': '鎖定/休息'
  };
  return map[status] || status;
};

const getStatusColor = (status) => {
  const map = {
    'pending': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    'scheduled': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    'confirmed': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    'completed': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    'cancelled': 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 line-through',
    'no_show': 'bg-red-50 text-red-600 ring-1 ring-red-200',
    'blocked': 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
  };
  return map[status] || 'bg-gray-50 text-gray-600';
};

const getStatusIcon = (status) => {
  const map = {
    'pending': <HourglassMedium weight="fill" size={12} />,
    'scheduled': <HourglassMedium weight="fill" size={12} />,
    'confirmed': <CalendarCheck weight="fill" size={12} />,
    'completed': <CheckCircle weight="fill" size={12} />,
    'cancelled': <XCircle weight="fill" size={12} />,
    'no_show': <UserMinus weight="fill" size={12} />,
    'blocked': <Lock weight="fill" size={12} />
  };
  return map[status] || null;
};
```

#### 2.3 新增確認時間顯示

```jsx
{/* Confirmed At Info */}
{details.confirmed_at && (
  <div className="text-xs text-indigo-500 font-medium flex items-center gap-1.5 -mt-4 ml-1">
    <CalendarCheck size={12} weight="fill" />
    {format(parseISO(details.confirmed_at), 'yyyy/MM/dd HH:mm')} 確認
  </div>
)}
```

#### 2.4 新增狀態變更按鈕

```jsx
{/* Status Action Buttons */}
<div className="flex gap-2 flex-wrap">
  {/* Confirm Button (pending -> confirmed) */}
  {details.status === 'pending' && (
     <button 
       onClick={() => handleStatusChange('confirmed')}
       className="flex-1 min-w-[100px] bg-indigo-500 hover:bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
     >
       <CalendarCheck size={16} weight="bold" />
       確認預約
     </button>
  )}
  
  {/* Cancel Button (pending/confirmed -> cancelled) */}
  {(details.status === 'pending' || details.status === 'confirmed') && (
      <button 
        onClick={() => handleStatusChange('cancelled')}
        className="flex-1 min-w-[100px] bg-slate-500 hover:bg-slate-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <XCircle size={16} weight="bold" />
        取消預約
      </button>
  )}
  
  {/* NoShow Button (confirmed -> no_show) */}
  {details.status === 'confirmed' && (
      <button 
        onClick={() => handleStatusChange('no_show')}
        className="flex-1 min-w-[100px] bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <UserMinus size={16} weight="bold" />
        NoShow
      </button>
  )}
  
  {/* Complete Button (confirmed -> completed) */}
  {details.status === 'confirmed' && (
      <button 
        onClick={() => handleStatusChange('completed')}
        className="flex-1 min-w-[100px] bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <CheckCircle size={16} weight="bold" />
        完成服務
      </button>
  )}
</div>
```

---

### Step 3: 更新 CalendarPage 行事曆

**文件**: `src/pages/CalendarPage.jsx`

#### 3.1 新增狀態標籤工具函數

```jsx
const getStatusLabel = (status) => {
  const map = {
    'pending': '已預約',
    'scheduled': '已預約',
    'confirmed': '已確認',
    'completed': '已完成',
    'cancelled': '已取消',
    'no_show': 'NoShow',
    'blocked': '鎖定'
  };
  return map[status] || status;
};

const getStatusTagStyle = (status) => {
  const map = {
    'pending': 'bg-amber-500/90 text-white',
    'scheduled': 'bg-amber-500/90 text-white',
    'confirmed': 'bg-indigo-500/90 text-white',
    'completed': 'bg-emerald-500/90 text-white',
    'cancelled': 'bg-slate-400/90 text-white',
    'no_show': 'bg-red-500/90 text-white',
    'blocked': 'bg-slate-500/90 text-white'
  };
  return map[status] || 'bg-gray-500/90 text-white';
};
```

#### 3.2 日檢視卡片更新

```jsx
<div className="flex flex-col h-full justify-between px-2 py-1 overflow-hidden">
   <div className="flex items-start justify-between gap-1">
     <div className="font-bold text-sm text-slate-900 leading-tight truncate flex-1">
        {appt.customers?.name || '未知客'}
     </div>
     <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${getStatusTagStyle(appt.status)}`}>
        {getStatusLabel(appt.status)}
     </span>
   </div>
   <div className="text-xs opacity-90 truncate mt-0.5">
      {appt.services?.name}
   </div>
</div>
```

#### 3.3 週檢視卡片更新

```jsx
<div className="flex items-center justify-between gap-1">
  <div className="font-semibold truncate flex items-center gap-1 text-[10px] flex-1">
   <div className="w-1.5 h-1.5 rounded-full bg-white/80 shrink-0"></div>
   <span className="truncate">{appt.customers?.name}</span>
  </div>
  <span className={`text-[8px] px-1 py-0.5 rounded font-bold shrink-0 ${getStatusTagStyle(appt.status)}`}>
     {getStatusLabel(appt.status)}
  </span>
</div>
```

#### 3.4 月檢視顏色更新

```jsx
className={`text-[10px] border rounded px-1 py-0.5 truncate shadow-sm flex items-center gap-1 cursor-pointer hover:brightness-95
  ${appt.status === 'blocked' 
    ? 'bg-slate-100 border-slate-300 text-slate-600' 
    : appt.status === 'cancelled'
    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
    : appt.status === 'no_show'
    ? 'bg-red-50 border-red-200 text-red-600'
    : appt.status === 'completed'
    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
    : appt.status === 'pending'
    ? 'bg-amber-50 border-amber-200 text-amber-600'
    : 'bg-indigo-50 border-indigo-200 text-indigo-700'}
`}
```

---

### Step 4: 更新預約創建邏輯

#### 4.1 NewAppointmentModal (B端新增預約)

**文件**: `src/components/NewAppointmentModal.jsx`

```jsx
// 變更前
status: 'confirmed',

// 變更後
status: 'pending',
```

#### 4.2 LiffBookingPage (C端預約)

**文件**: `src/pages/liff/LiffBookingPage.jsx`

```jsx
// 變更前
let status = 'confirmed';

// 變更後
let status = 'pending';
```

---

### 狀態流程圖

```
┌─────────┐     B端確認 / 12hr自動      ┌───────────┐     服務完成     ┌───────────┐
│ pending │ ─────────────────────────→ │ confirmed │ ─────────────→ │ completed │
└────┬────┘                            └─────┬─────┘                └───────────┘
     │                                       │
     │ B端取消                               │ B端取消
     │                                       │
     ↓                                       ↓
┌───────────┐                         ┌───────────┐
│ cancelled │ ←───────────────────────│           │
└───────────┘     B端重新確認          │           │
     ↑            (可從 cancelled       │           │
     │             或 no_show 恢復)     │           │
     │                                 │           │
     │                                 │    B端    │
     └─────────────────────────────────│  NoShow   │
                                       │           │
                                       └───────────┘

⚠️ 重要約束：已確認 (confirmed) 無法改回已預約 (pending)
```

---

### 待執行操作

1. **執行數據庫遷移**
   - 在 Supabase SQL Editor 中執行 `db/migrations/007_appointment_status_enhancement.sql`

2. **設置定時任務**（可選）
   - 使用 Supabase pg_cron 或 Edge Functions 定時調用 `auto_confirm_appointments()`

---

### 測試清單

- [ ] 新建預約狀態為 `pending`
- [ ] B端可手動確認預約 (`pending` → `confirmed`)
- [ ] 已確認預約無法改回已預約
- [ ] B端可取消預約 (`pending`/`confirmed` → `cancelled`)
- [ ] B端可標記 NoShow (`confirmed` → `no_show`)
- [ ] B端可完成服務 (`confirmed` → `completed`)
- [ ] 已取消/NoShow 可重新確認
- [ ] 日曆卡片正確顯示狀態標籤
- [ ] 月檢視顯示不同狀態顏色

---

## 變更文件清單

| 文件 | 類型 | 說明 |
|------|------|------|
| `db/migrations/007_appointment_status_enhancement.sql` | 新增 | 數據庫遷移腳本 |
| `src/components/AppointmentDetailsModal.jsx` | 修改 | 狀態標籤與變更按鈕 |
| `src/pages/CalendarPage.jsx` | 修改 | 行事曆狀態顯示 |
| `src/components/NewAppointmentModal.jsx` | 修改 | 預設狀態改為 pending |
| `src/pages/liff/LiffBookingPage.jsx` | 修改 | 預設狀態改為 pending |

---

### Step 5: 部署到 GitHub

**日期**: 2026-02-15

**倉庫**: `https://github.com/j01232026-hub/nexasystem.git`

#### 5.1 Git 操作

```bash
# 查看狀態
git status

# 添加所有變更
git add .

# 提交變更
git commit -m "feat: 新增預約狀態標籤功能"

# 推送到 GitHub
git push origin main
```

#### 5.2 提交資訊

```
commit 22a2c97
feat: 新增預約狀態標籤功能

- 新增數據庫遷移：confirmed_at 欄位、自動確認函數、狀態回退保護
- 更新 AppointmentDetailsModal：狀態標籤顯示與變更按鈕
- 更新 CalendarPage：日/週/月檢視狀態標籤顯示
- 預約創建預設狀態改為 pending
- 新增 cn.md 開發變更日誌
```

#### 5.3 變更統計

- 6 files changed
- 620 insertions(+)
- 36 deletions(-)
- 2 new files created

---

### Step 6: 修復數據庫遷移錯誤

**日期**: 2026-02-15

**問題**: 執行遷移腳本時報錯
```
Error: Failed to run sql query: ERROR: 23514: check constraint "appointments_status_check" of relation "appointments" is violated by some row
```

**原因**: 執行順序錯誤 - 在數據更新前就添加了新的約束，導致現有數據不符合新約束。

**修正**: 調整執行順序，**先更新數據，再添加約束**

#### 6.1 修正後的執行順序

```sql
-- Step 1: 新增欄位
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Step 2: 刪除舊約束
ALTER TABLE public.appointments 
DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Step 3: 更新數據（在添加新約束之前）
UPDATE public.appointments 
SET status = 'pending' 
WHERE status = 'scheduled';

-- 處理任何非預期的狀態值
UPDATE public.appointments 
SET status = 'pending' 
WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked');

-- Step 4: 添加新約束（數據已更新完成）
ALTER TABLE public.appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'blocked'));
```

#### 6.2 關鍵修正點

| 原本 | 修正後 |
|------|--------|
| 先添加約束，後更新數據 | 先更新數據，後添加約束 |
| 無處理未知狀態值 | 新增處理未知狀態值的邏輯 |
