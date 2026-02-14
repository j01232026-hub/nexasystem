# 未來功能規劃與構想 (Future Features & Ideas)

本文檔用於記錄尚未開發但已討論過的功能構想、設計草案與技術評估，作為未來產品迭代的參考依據。

## 1. 營運數據匯出中心 (Operations Data Export)

**狀態**：`已提案 (Proposed)`
**最後更新**：2026-02-13
**目的**：提供營運結算 (Payroll) 與 排班備份 (Schedule) 所需的原始數據。

### 功能設計 (Design Draft)
- **入口**：行事曆頁面右上角「匯出」按鈕。
- **彈窗選項**：
  - **日期範圍**：本月、上個月、自訂範圍。
  - **匯出對象**：全體員工 / 特定設計師。
  - **資料類型**：
    - `預約記錄 (Appointments)`：含金額、服務項目 (算薪水用)。
    - `排班/鎖定 (Locks)`：含休假、鎖定時段 (看出勤用)。
- **技術方案**：前端直接生成 (Client-side Export)，使用 `SheetJS` 生成 `.xlsx` 檔案，保障隱私且零後端成本。

### 欄位定義 (Schema)
| 欄位 | 說明 |
| :--- | :--- |
| 日期 | YYYY-MM-DD |
| 時間 | HH:mm - HH:mm |
| 員工 | 姓名 |
| 類型 | 預約 / 鎖定 |
| 客戶 | 姓名 + 電話 |
| 項目 | 服務內容 |
| 金額 | $ (營收計算關鍵) |
| 狀態 | 完成 / 取消 / 鎖定 |

---

## 2. 智慧空檔行銷助手 (Smart Availability Marketing)

**狀態**：`設計定案 (Design Approved)`
**最後更新**：2026-02-13
**目的**：協助店家將「閒置時段」轉化為「營收機會」，發布至社群媒體 (FB/IG/LINE) 吸引預約。

### 核心痛點 (Pain Points)
- 店家需要手動整理空檔，耗時且容易出錯。
- LINE 官方帳號推播訊息成本高，不適合頻繁發送無效資訊。
- 純文字的空檔列表在社群上缺乏吸引力。

### 解決方案構想 (Concept)
**「AI 驅動的自動化行銷工廠」**

#### A. 功能流程
1. **篩選 (Filter)**：選擇未來 N 天 (如下週)、特定設計師 (或全店)。
2. **生成 (Generate)**：
   - 系統自動計算空檔時段。
   - **AI 介入**：根據店家風格 (高級/親民/潮流) 與時段特性 (週末/平日晚)，自動撰寫文案。
3. **輸出 (Output)**：提供多種尺寸圖片與動態連結。

#### B. 輸出格式 (Output Formats)

**1. 多尺寸 AI 視覺卡片 (Multi-Size Visual Cards)**
- **IG Story / Reels 尺寸 (9:16)**：滿版直式，適合手機全螢幕瀏覽，重點突顯「剩餘名額」。
- **LINE 圖文選單 / FB 貼文 (1:1 或 4:3)**：正方形或橫式，適合在對話視窗中預覽。
- **技術實現**：前端使用 `html2canvas` 搭配動態 CSS 模板渲染，無需後端 GPU 資源。

**2. 動態空檔看板 (Live Availability Board)**
- **概念**：產生一個專屬的「唯讀網頁連結」，可嵌入 LINE 官方帳號的圖文選單。
- **優勢**：解決「圖片發出後時段被搶走」的資訊落差問題。
- **內容**：只顯示「目前還空的時段」，點擊時段直接跳轉預約。

**3. AI 智慧文案 (AI Copywriting)**
- 自動生成適合 FB/IG 的文字，帶有 Emoji 與行動呼籲。
- *範例*：「🔥 急救髮型！Alice 下週釋出少量空檔：週四 14:00、週五 16:00。點擊下方連結搶先預約！👇」

### 價值主張 (Value Proposition)
- **省時**：30秒內完成原本需要 30 分鐘的製圖寫文工作。
- **精準**：只推播真正有空的時間，避免客戶問了又沒位子的尷尬。
- **省錢**：用圖片/文字取代昂貴的 LINE 互動訊息，提高觸及效率。

---

## 3. 下一步開發計劃 (Implementation Roadmap)

1.  **優先實作**：`html2canvas` 圖片生成引擎 (前端)。
2.  **設計模板**：建立 2-3 款基礎 CSS 模板 (極簡黑白、溫暖大地色、時尚霓虹)。
3.  **整合 AI**：串接 LLM API (如 Gemini Nano 或 OpenAI) 用於文案潤飾 (Optional)。

---

## 5. 智慧行銷助手技術規格 (Technical Spec)

**狀態**：`技術規劃中 (Technical Planning)`
**目的**：實作「圖片生成」與「動態看板」的核心邏輯。

### A. 空檔計算演算法 (Availability Algorithm)
基於「負向排班」邏輯，計算特定日期的空檔。

**輸入 (Input)**：
- `TargetDate`: 目標日期 (e.g., 2026-02-14)
- `StaffId`: 設計師 ID (Optional, 若無則全店)
- `StoreHours`: 店家營業時間 (e.g., 10:00 - 20:00)

**流程 (Process)**：
1.  **初始化時段**：建立一個完整的 `TimeSlots` 陣列 (每 30 分鐘一格)，範圍為 `StoreHours`。
    - *Example*: `[10:00, 10:30, ..., 19:30]`
2.  **獲取障礙物 (Fetch Obstacles)**：從 `appointments` 表撈取當日所有資料。
    - `Booking`: 一般預約 (status != 'cancelled')
    - `Block`: 鎖定時段 (lock_mode = 'time' OR 'batch')
3.  **剔除時段 (Filter)**：
    - 遍歷所有 `Obstacles`。
    - 若某個 TimeSlot 與 Obstacle 時間重疊，將其標記為 `Unavailable`。
4.  **合併連續空檔 (Merge)**：
    - 將剩餘的連續 `Available` 時段合併。
    - *Example*: `[14:00, 14:30, 15:00]` -> `14:00 - 15:30`

**輸出 (Output)**：
- JSON 格式的空檔列表：
  ```json
  {
    "date": "2026-02-14",
    "staff": "Alice",
    "slots": ["14:00-15:30", "18:00-20:00"]
  }
  ```

### B. 圖片生成引擎 (Image Generation Engine)
前端純客戶端生成，無需後端渲染服務。

1.  **隱藏渲染區 (Hidden Container)**：
    - 在 DOM 中建立一個使用者看不見的 `div` (`position: absolute; left: -9999px`)。
    - 根據選擇的模板 (IG Story / Post)，將上述 JSON 資料填入 HTML 結構。
2.  **截圖 (Capture)**：
    - 使用 `html2canvas` 針對該 `div` 進行截圖。
    - 設定 `scale: 2` 或 `scale: 3` 確保視網膜螢幕清晰度。
3.  **下載 (Download)**：
    - 將 Canvas 轉為 `Blob` (image/png)。
    - 觸發瀏覽器下載行為 (`<a>` tag download attribute)。

### C. 動態看板連結 (Live Board Link)
1.  **路由設計**：`/availability/:storeId?view=week`
2.  **頁面邏輯**：
    - 這是一個公開頁面 (Public Page)，無需登入。
    - 載入時執行上述 **A. 空檔計算演算法**。
    - 以「唯讀模式」顯示行事曆，僅標示「可預約」時段。
    - 點擊時段 -> 跳轉至 C 端預約頁面 (帶入 `date`, `time`, `staff` 參數)。



