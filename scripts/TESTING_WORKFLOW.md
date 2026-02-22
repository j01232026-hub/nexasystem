# 員工權限系統測試流程

## 測試前準備

### 步驟 1: 備份現有資料（重要！）
```sql
-- 在 Supabase SQL Editor 執行
CREATE TABLE staff_backup AS SELECT * FROM staff;
CREATE TABLE staff_services_backup AS SELECT * FROM staff_services;
```

### 步驟 2: 清理並重新建立
```sql
-- 執行 reset-and-setup.sql
-- 這會：
-- 1. 刪除現有 staff 記錄（保留 staff_services 關聯）
-- 2. 建立 roles 表和 3 種角色
-- 3. 擴展 staff 表欄位
-- 4. 為現有 profiles 創建 staff 記錄（設為老闆）
```

### 步驟 3: 創建測試資料
```sql
-- 執行 seed-test-data.sql
-- 這會創建：
-- - 店長（林小美）
-- - 美容師（陳大文）
-- - 待邀請員工（張雅琪）
-- - 離職員工（王小明）
```

---

## 測試場景

### 場景 1: 老闆登入
**預期結果：**
- 可以看到「員工與權限管理」
- 可以看到「邀請員工」按鈕
- 可以看到所有員工資料

### 場景 2: 新增員工
1. 點擊「新增員工」
2. 填寫：
   - 真實姓名：測試員工
   - 顯示名稱：Test 老師
   - Email：test@example.com
   - 電話：0912-345-678
   - 角色：員工
3. 儲存

**預期結果：**
- 員工出現在列表中
- 顯示 Email 和電話
- 狀態為「未綁定」

### 場景 3: 邀請員工
1. 點擊「邀請員工」
2. 填寫：
   - 姓名：邀請測試
   - Email：invite@example.com
   - 角色：員工
3. 發送邀請

**預期結果：**
- 顯示邀請連結
- 可以複製連結
- 員工狀態為「等待邀請」

### 場景 4: 接受邀請
1. 開啟無痕視窗
2. 訪問邀請連結：`/invite?token=xxx`
3. 設定密碼
4. 完成註冊

**預期結果：**
- 註冊成功
- 自動跳轉到登入頁
- 員工狀態變為「已綁定帳號」

### 場景 5: 員工登入
1. 使用新帳號登入
2. 進入「管理中心」

**預期結果：**
- 只能看到有限的功能
- 無法進入「員工與權限管理」

---

## 常見問題

### Q: 執行 SQL 後看不到員工？
A: 檢查：
1. profiles 表是否有資料
2. tenant_id 是否正確設置
3. 執行 `SELECT * FROM staff` 查看結果

### Q: 邀請連結無效？
A: 檢查：
1. invite_token 是否正確
2. invite_expires_at 是否過期
3. 網址格式是否正確：`/invite?token=xxx`

### Q: 權限檢查失效？
A: 檢查：
1. staff.role_id 是否正確設置
2. roles 表是否有資料
3. usePermission Hook 是否正常運作

---

## 回滾方式

如果測試出問題，可以恢復備份：
```sql
-- 恢復 staff 資料
TRUNCATE staff;
INSERT INTO staff SELECT * FROM staff_backup;

-- 恢復 staff_services 資料
TRUNCATE staff_services;
INSERT INTO staff_services SELECT * FROM staff_services_backup;
```
