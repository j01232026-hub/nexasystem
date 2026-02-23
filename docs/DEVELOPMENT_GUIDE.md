# NEXA 美業 SaaS 開發指南

**版本**: v1.0  
**更新日期**: 2026-02-23  
**適用對象**: 開發人員、系統管理員

---

## 📁 目錄結構

```
salon/
├── docs/                          # 文件目錄
│   ├── DEVELOPMENT_GUIDE.md       # 本文件 - 開發指南
│   ├── TESTING_GUIDE.md           # 測試指南
│   ├── B_SIDE_CORE_SPEC_v1.md     # B端核心規格
│   ├── PRODUCT_VISION_2026.md     # 產品願景
│   ├── architecture/              # 架構文件
│   │   ├── tenant_permission_model.md    # 多租戶權限模型
│   │   ├── line_login_plan.md            # LINE 登入規劃
│   │   └── liff_multitenancy.md          # LIFF 多租戶
│   └── future_features/           # 未來功能規劃
│       └── export_and_marketing.md       # 匯出與行銷
│
├── scripts/                       # 資料庫腳本
│   ├── schema/                    # 結構定義
│   │   ├── apply-schema.sql              # 主要 schema（推薦）
│   │   └── staff_permissions_schema.sql  # 權限系統 schema
│   │
│   ├── fixes/                     # 修復腳本
│   │   ├── fix-staff-columns.sql         # 修復 staff 欄位
│   │   ├── fix-profiles-columns.sql      # 修復 profiles 欄位
│   │   ├── fix-staff-rls.sql             # 修復 staff RLS
│   │   └── fix-rls-recursion.sql         # 修復 RLS 循環引用
│   │
│   ├── reset/                     # 重置腳本
│   │   ├── reset-all-data.sql            # 清除資料（保留結構）
│   │   └── complete-reset.sql            # 完全重置（⚠️ 刪除所有）
│   │
│   └── seed/                      # 測試資料
│       ├── seed-test-data.sql            # 基礎測試資料
│       ├── seed_beauty_data.sql          # 美業測試資料
│       └── init_dev_data.js              # 開發環境初始化
│
├── src/
│   ├── lib/                       # 工具庫
│   │   └── supabaseClient.js      # Supabase 客戶端
│   │
│   ├── hooks/                     # React Hooks
│   │   └── usePermission.js       # 權限檢查 Hook
│   │
│   ├── components/                # 元件
│   │   ├── ProtectedRoute.jsx     # 受保護路由
│   │   ├── PermissionGuard.jsx    # 權限守衛
│   │   └── ui/                    # UI 元件
│   │
│   └── pages/                     # 頁面
│       ├── LoginPage.jsx          # 登入頁
│       ├── StaffOnboardingPage.jsx # 員工資料完善
│       ├── InvitePage.jsx         # 邀請註冊
│       ├── StaffManagementPage.jsx # 員工管理
│       └── ManagerProfilePage.jsx # 個人資料
│
└── README.md                      # 專案說明
```

---

## 🔐 權限系統說明

### 角色定義

| 角色 | 名稱 | 權限範圍 |
|------|------|----------|
| `admin` | 老闆 | 全部權限：設定、員工、預約、客戶、報表、分店管理 |
| `manager` | 店長 | 日常營運：員工、預約、客戶、報表（不可刪除資料、不可管理分店） |
| `staff` | 員工 | 僅查看自己的預約，無管理權限 |

### 權限對照表

| 功能 | 老闆 | 店長 | 員工 |
|------|:----:|:----:|:----:|
| 系統設定 | ✅ | ❌ | ❌ |
| 管理員工 | ✅ | ✅ | ❌ |
| 管理預約 | ✅ | ✅ | 僅自己的 |
| 管理客戶 | ✅ | ✅ | ❌ |
| 查看報表 | ✅ | ✅ | ❌ |
| 刪除資料 | ✅ | ❌ | ❌ |
| 分店管理 | ✅ | ❌ | ❌ |

### 特殊權限規則

1. **動態角色分配**
   - 單人工作室：老闆自動擁有 `admin` 角色
   - 多員工店家：可指定店長和員工

2. **資料隔離**
   - 所有資料依 `tenant_id` 隔離
   - 員工只能查看自己 `user_id` 的資料

3. **邀請機制**
   - 只有老闆和店長可以發送邀請
   - 邀請連結包含 Token，有效期 7 天

---

## 🚀 快速開始

### 1. 環境設置

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

### 2. 資料庫初始化

在 Supabase SQL Editor 依序執行：

```sql
-- 步驟 1: 建立基礎結構
\i scripts/schema/apply-schema.sql

-- 步驟 2: 添加欄位（如果表已存在）
\i scripts/fixes/fix-staff-columns.sql
\i scripts/fixes/fix-profiles-columns.sql

-- 步驟 3: 修復 RLS 政策
\i scripts/fixes/fix-rls-recursion.sql
```

### 3. 測試資料

```sql
-- 載入測試資料
\i scripts/seed/seed-test-data.sql
```

---

## 🧪 測試流程

### 完整註冊流程測試

#### 場景 1: 老闆註冊

1. **註冊帳號**
   - 訪問 `/login`
   - 點擊「註冊」
   - 填寫 Email、密碼

2. **完善個人資料**
   - 自動導向個人資料頁
   - 填寫：姓名、電話、店名

3. **完善公司資料**
   - 填寫：公司地址、營業時間、服務項目

4. **進入系統**
   - 導向 `/home`
   - 顯示管理中心

#### 場景 2: 員工邀請

1. **老闆發送邀請**
   - 管理中心 → 員工與權限管理
   - 點擊「邀請員工」
   - 填寫：姓名、Email、角色
   - 複製邀請連結

2. **員工接受邀請**
   - 開啟邀請連結 `/invite?token=xxx`
   - 設定密碼
   - 自動註冊並登入

3. **員工完善資料**
   - 自動導向 `/staff-onboarding`
   - 填寫：姓名、電話、職稱、專長
   - 提交後進入系統

---

## 🔧 常見問題修復

### 問題 1: 缺少欄位

**錯誤**: `column staff.job_title does not exist`

**修復**:
```sql
\i scripts/fixes/fix-staff-columns.sql
```

### 問題 2: RLS 權限錯誤

**錯誤**: `new row violates row-level security policy`

**修復**:
```sql
\i scripts/fixes/fix-rls-recursion.sql
```

### 問題 3: 無限循環

**錯誤**: `infinite recursion detected in policy`

**修復**:
```sql
\i scripts/fixes/fix-rls-recursion.sql
```

---

## 🔄 重置資料

### 選項 A: 清除資料（推薦）

保留資料表結構，只刪除資料：

```sql
\i scripts/reset/reset-all-data.sql
```

**適用情境**:
- 測試完整註冊流程
- 清理測試帳號
- 重新開始但不重建資料庫

### 選項 B: 完全重置

⚠️ **警告**: 刪除所有資料表！

```sql
\i scripts/reset/complete-reset.sql
-- 然後重新執行 schema
\i scripts/schema/apply-schema.sql
```

---

## 📋 開發規範

### 新增欄位流程

1. 修改 `scripts/schema/apply-schema.sql`
2. 創建修復腳本 `scripts/fixes/fix-xxx.sql`
3. 更新相關頁面程式碼
4. 測試新舊資料相容性

### 新增權限流程

1. 在 `roles` 表添加新權限到 `permissions` JSON
2. 在 `usePermission.js` 添加檢查函數
3. 在 UI 元件使用 `PermissionGuard` 包裹
4. 更新本文件的權限對照表

### 提交規範

```bash
# 功能開發
git commit -m "feat: 新增員工邀請功能"

# 錯誤修復
git commit -m "fix: 修復 RLS 無限循環問題"

# 文件更新
git commit -m "docs: 更新權限系統說明"
```

---

## 🎯 未來開發方向

### 短期（v1.1）

- [ ] 優化邀請流程（Email 通知）
- [ ] 員工排班功能
- [ ] 更細緻的權限控制（功能級別）

### 中期（v1.2）

- [ ] **店家規模問卷**
  - 註冊時詢問：1人工作室 / 小型店家 / 中型店家 / 連鎖品牌
  - 根據規模推薦預設權限模板
  - 動態顯示/隱藏進階功能
- [ ] 分店管理完整功能
- [ ] 進階報表分析

### 長期（v2.0）

- [ ] 客戶歸屬權設定（公司 vs 個人）
- [ ] 跨店預約功能
- [ ] API 開放平台

---

## 📞 支援

- **技術問題**: 查看 `docs/architecture/` 架構文件
- **測試問題**: 查看 `TESTING_GUIDE.md`
- **產品規格**: 查看 `B_SIDE_CORE_SPEC_v1.md`

---

**最後更新**: 2026-02-23  
**維護者**: NEXA 開發團隊
