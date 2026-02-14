# LINE Login 與 LIFF 多租戶架構規劃

## 1. 核心問題：單一 LINE Login Channel vs 多個官方帳號 (OA)

在 SaaS 模式下，我們需要解決「一個 SaaS 平台如何服務多個美業店家，且每個店家可能有自己的官方帳號」的問題。

### 架構選項比較

| 特性 | 選項 A：單一 Channel (SaaS 統一入口) | 選項 B：多 Channel (每個店家獨立申請) |
| :--- | :--- | :--- |
| **LIFF ID** | 只有一個 (例如：`https://liff.line.me/123456-Abcde`) | 每個店家不同 (例如：`.../123-A`, `.../456-B`) |
| **用戶登入體驗** | 用戶授權給「SaaS 平台名稱」 | 用戶授權給「店家名稱」 |
| **開發維護成本** | **低** (只需維護一組 Key/Secret) | **極高** (需管理 N 組 Key，且需店家配合申請) |
| **好友關係** | 無法直接強制加店家 OA 好友 (需額外引導) | 可在授權頁勾選「加入好友」 (Linked OA) |
| **適用場景** | **平台型 SaaS (如 inline, Ocard)** | 專案型外包 (為單一客戶客製) |

### 推薦方案：選項 A (SaaS 統一入口) + 動態路由

我們採用 **單一 LINE Login Channel** 搭配 **動態 Tenant ID** 的方式。

**運作流程：**
1.  店家 A 的預約連結：`https://liff.line.me/{LIFF_ID}/liff/tenant-a/booking`
2.  店家 B 的預約連結：`https://liff.line.me/{LIFF_ID}/liff/tenant-b/booking`
3.  用戶點擊連結 -> LINE Login (授權給平台) -> 導回 LIFF 頁面。
4.  LIFF 頁面讀取 URL 中的 `tenant_id`，顯示對應店家的內容。

---

## 2. 關於您的提問：是否需要兩個官方帳號？

**是的，為了模擬真實的開發與測試情境，建議準備：**

1.  **SaaS 平台官方帳號 (Provider)**
    *   **角色**：代表您的 SaaS 系統本身。
    *   **用途**：申請 LINE Login Channel 和 LIFF Channel。
    *   **設定**：
        *   建立一個 LINE Developer Provider (例如：`Salon SaaS Provider`)。
        *   在此 Provider 下建立一個 LINE Login Channel。
        *   在此 Channel 中開啟 LIFF 功能，並設定 Endpoint URL 指向您的開發環境 (如 `https://xxxx.ngrok-free.app/liff`).

2.  **模擬美業店家官方帳號 (Tenant OA)**
    *   **角色**：代表一個使用您系統的店家 (例如：`Amy 美甲沙龍`)。
    *   **用途**：測試「加好友」、「推播訊息 (Messaging API)」功能。
    *   **設定**：
        *   只需一般的 LINE 官方帳號 (免費版即可)。
        *   **關鍵**：此帳號**不需要**申請 LIFF，它只是被「串接」的對象。
        *   在 SaaS 後台 (我們做的 B 端)，會有一個欄位填寫此 OA 的 `Channel Access Token` (未來進階功能)。

### 總結您的準備清單

1.  **一個 LINE Developer 帳號** (您個人的 LINE 帳號即可登入)。
2.  **建立一個 Provider** (在 LINE Developers Console)。
3.  **建立一個 LINE Login Channel** (用於 LIFF)。
    *   這就是您的「SaaS 平台」身分。
4.  **準備一個測試用的 LINE 官方帳號** (可選，若暫時只做 LIFF 登入，這個還不用急，但若要測「預約成功發送 LINE 通知」就需要)。

---

## 3. 開發階段的 LINE Login 模擬

由於 LINE Login 必須在 HTTPS 環境下運作，且需要真實的 LINE App 互動，**Localhost 開發會有困難**。

**解決方案：**

1.  **使用 ngrok (推薦)**：
    *   將本機 `localhost:5173` 穿透到公網 HTTPS URL。
    *   將此 URL 填入 LINE Login Channel 的 LIFF Endpoint。
2.  **開發環境模擬登入 (Dev Login)**：
    *   我們已經實作了 `MockAuthProvider`。
    *   在開發階段 (`NODE_ENV=development`)，我們跳過真實 LINE Login，直接模擬一個 User ID。
    *   **優點**：不需要每次改 Code 都推到線上或用手機測。
    *   **缺點**：無法測試真實的「取得個資 (Profile)」與「好友狀態」。

### 下一步建議

如果您想開始做「C 端 LINE 登入」，我們先做 **Mock 登入的完整流程**，確保：
1.  進入 `liff/:tenantId` 頁面。
2.  檢查是否有 User 資料。
3.  若無，跳轉登入 (或自動 Mock 登入)。
4.  登入後，將 User 資料寫入 `customers` 表 (如果不存在)。
5.  預約時，自動帶入該 User。
