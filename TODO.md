# 待辦事項清單 (Project TODOs)

## 金流與支付整合 (Payment Integration)

- [ ] **Line Pay 整合 (Line Pay Integration)**
    - **說明**: 提供自動化 Line Pay 支付功能，作為加值服務 (Add-on Service)。
    - **前置需求**:
        - 商家需擁有商業登記 (Business Registration)。
        - 申請 Line Pay Merchant ID。
    - **功能規劃**:
        - 預約時直接透過 Line Pay 支付訂金或全額。
        - 支付成功後自動更新預約狀態為 `confirmed`。
        - 整合退款流程 (Refund API)。
    - **商業模式**:
        - 設定費 (Setup Fee) + 交易手續費 (Transaction Fee)。
        - 需開發「金流設定頁面」供店家輸入 API Key。

## 其他待辦 (Others)

- [x] **訂金功能 MVP (Deposit Feature MVP)**
    - [x] 店家後台：訂金金額、日期範圍、匯款資訊設定。
    - [x] 預約流程：檢查訂金規則，顯示匯款資訊，狀態標記為 `pending_deposit`。
    - [x] 紀錄頁面：顯示 `待付訂金` 狀態與提示。
