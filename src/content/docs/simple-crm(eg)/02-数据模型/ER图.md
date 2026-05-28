# ER 图

```mermaid
erDiagram
  USER ||--o{ CUSTOMER : "负责"
  USER ||--o{ FOLLOWUP : "记录"
  CUSTOMER ||--o{ CONTACT : "拥有"
  CUSTOMER ||--o{ FOLLOWUP : "拥有"
  CUSTOMER ||--o{ OPPORTUNITY : "产生"
  CUSTOMER ||--o{ CONTRACT : "签订"

  OPPORTUNITY ||--o| CONTRACT : "转化"
  CONTRACT ||--o{ PAYMENT : "计划"

  USER {
    uuid id PK
    string name
    string email
    string role
  }
  CUSTOMER {
    uuid id PK
    string name
    string company
    string status
    uuid owner_id FK
  }
  CONTACT {
    uuid id PK
    uuid customer_id FK
    string name
    string title
  }
  FOLLOWUP {
    uuid id PK
    uuid customer_id FK
    text content
    datetime created_at
  }
  OPPORTUNITY {
    uuid id PK
    uuid customer_id FK
    decimal amount
    string stage
  }
  CONTRACT {
    uuid id PK
    uuid customer_id FK
    decimal total_amount
    datetime sign_date
  }
  PAYMENT {
    uuid id PK
    uuid contract_id FK
    decimal amount
    string status
  }
```

## 核心关系说明

| 关系 | 类型 | 说明 |
| --- | --- | --- |
| USER → CUSTOMER | 一对多 | 一个销售负责多个客户 |
| CUSTOMER → CONTACT | 一对多 | 一个客户有多个联系人 |
| CUSTOMER → FOLLOWUP | 一对多 | 一个客户有多次跟进 |
| CUSTOMER → OPPORTUNITY | 一对多 | 一个客户产生多个商机 |
| CONTRACT → PAYMENT | 一对多 | 一个合同有多个回款计划 |