# Glow 美學 2026：產品願景與架構藍圖 (Product Vision & Architecture)

> 最後更新日期：2026-02-12
> 文件狀態：核心指導原則 (Core Principles)

本文檔記錄了項目核心戰略目標與技術架構原則，作為後續開發的最高指導。

## 1. 核心戰略目標 (Strategic Pillars)

### 1.1 多租戶 SaaS 架構 (Multi-Tenancy First)
*   **原則**：系統從 Day 1 起必須設計為多租戶架構。
*   **執行**：
    *   資料庫設計必須包含 `tenant_id` (商戶ID) 欄位，實施嚴格的 Row-Level Security (RLS)。
    *   支援 "單店 (Studio)" 到 "連鎖總部 (Head Office)" 的彈性權限模型。
    *   資料隔離是最高優先級，確保 B 端商戶資料絕對安全。

### 1.2 全場景 B 端覆蓋 (Scalable B-Side)
*   **原則**：一套代碼，適配不同規模。
*   **執行**：
    *   **微型工作室**：提供 "Lite 模式"，隱藏庫存、薪資等複雜功能，強調 "開箱即用"。
    *   **大型連鎖店**：提供 "Pro 模式"，解鎖多店管理、員工分級權限、複雜報表。
    *   透過 Feature Flags (功能開關) 控制介面複雜度。

### 1.3 C 端 LINE 生態深度整合 (LINE-First C-Side)
*   **原則**：C 端 "零下載"、"零門檻"。
*   **執行**：
    *   **Invisible App**：C 端介面完全基於 LINE LIFF (LINE Front-end Framework) 構建。
    *   **一鍵接入**：B 端後台提供 "Connect LINE OA" 按鈕，授權後自動對接 Messaging API。
    *   **體驗流程**：顧客掃碼 -> 加入官方帳號 -> 自動彈出 LIFF 預約介面 -> 預約成功收到 LINE 通知。

### 1.4 智能行事曆 (Smart Calendar)
*   **原則**：以 "Glow 行事曆" 為核心，雙向同步外部日曆。
*   **執行**：
    *   **自研日曆引擎**：處理美容業特有的 "服務時長"、"設備資源佔用"、"緩衝時間"。
    *   **Google Calendar 雙向同步**：
        *   *Pull*: 自動拉取美容師私人行程（如 "看牙醫"），在 Glow 中自動鎖定時段。
        *   *Push*: 將 Glow 預約寫入 Google Calendar，方便美容師查看。

---

## 2. AI Native 2.0 融合策略 (AI Integration)

結合上述四大支柱，引入 AI Agent 提升效率：

### 2.1 LINE AI 預約助理
*   **場景**：C 端顧客在 LINE 中直接打字 "我想約下週五晚上"，而非點擊 LIFF 表單。
*   **技術**：LLM 意圖識別 -> 調用 Glow Calendar API -> 回覆 "下週五 19:00 有空位，要幫您保留嗎？"。

### 2.2 智能排程衝突解決 (AI Conflict Solver)
*   **場景**：當 Google Calendar 同步發生衝突（如私人行程與預約重疊）時。
*   **機制**：AI 分析優先級（如 "老客預約" vs "私人健身"），自動建議 "是否要聯繫顧客改期？" 或 "自動拒絕私人行程？"。

### 2.3 多租戶數據洞察 (SaaS Intelligence)
*   **場景**：基於去識別化的全平台數據，為 B 端提供建議。
*   **範例**："您的客單價 ($1,200) 低於同地區同業平均 ($1,500)，建議推出組合課程。"
