# Bill Action Tracking API Documentation

## Overview
This API tracks bill-related actions: PDF downloads, bill printing, and WhatsApp sends. Each action is recorded with timestamp, user info, device info, and IP address for audit purposes.

## Database Schema

### Table: `bill_actions`
Tracks each action performed on a bill.

```sql
CREATE TABLE bill_actions (
  bill_action_id CHAR(36) PRIMARY KEY,   -- UUID
  invoice_id INT NOT NULL,                -- Links to invoices table
  order_id INT NOT NULL,                  -- Quick lookup by order
  restaurant_id INT NOT NULL,             -- Data isolation
  action_type ENUM(...) NOT NULL,         -- PDF_DOWNLOADED, BILL_PRINTED, WHATSAPP_SENT
  user_id INT NULL,                       -- User who performed action
  device_info VARCHAR(255) NULL,          -- Browser/device user agent
  ip_address VARCHAR(50) NULL,            -- Client IP
  notes TEXT NULL,                        -- Additional notes
  created_at TIMESTAMP DEFAULT NOW()      -- When recorded
);
```

## API Endpoints

### 1. Record Bill Action
**Endpoint:** `POST /api/billing/bill-actions`

**Request Body:**
```json
{
  "invoiceId": 123,
  "orderId": 456,
  "actionType": "PDF_DOWNLOADED",  // or "BILL_PRINTED", "WHATSAPP_SENT"
  "deviceInfo": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",  // optional
  "notes": "First attempt successful"  // optional
}
```

**Response:**
```json
{
  "billActionId": "550e8400-e29b-41d4-a716-446655440000",
  "invoiceId": 123,
  "orderId": 456,
  "restaurantId": 1,
  "actionType": "PDF_DOWNLOADED",
  "userId": 10,
  "deviceInfo": "Mozilla/5.0...",
  "ipAddress": "192.168.1.100",
  "notes": null,
  "createdAt": "2026-03-17T14:30:00Z"
}
```

### 2. Get Bill Action History
**Endpoint:** `GET /api/billing/bill-actions/order/:orderId`

**Description:** Retrieves all bill actions for a specific order.

**Response:**
```json
[
  {
    "billActionId": "550e8400-e29b-41d4-a716-446655440000",
    "invoiceId": 123,
    "orderId": 456,
    "actionType": "PDF_DOWNLOADED",
    "userId": 10,
    "deviceInfo": "Mozilla/5.0...",
    "createdAt": "2026-03-17T14:30:00Z",
    "notes": null
  },
  {
    "billActionId": "550e8400-e29b-41d4-a716-446655440001",
    "invoiceId": 123,
    "orderId": 456,
    "actionType": "BILL_PRINTED",
    "userId": 10,
    "deviceInfo": "Mozilla/5.0...",
    "createdAt": "2026-03-17T14:32:00Z",
    "notes": null
  },
  {
    "billActionId": "550e8400-e29b-41d4-a716-446655440002",
    "invoiceId": 123,
    "orderId": 456,
    "actionType": "WHATSAPP_SENT",
    "userId": 10,
    "deviceInfo": "Mozilla/5.0...",
    "createdAt": "2026-03-17T14:35:00Z",
    "notes": null
  }
]
```

### 3. Get Bill Action Summary
**Endpoint:** `GET /api/billing/bill-actions/invoice/:invoiceId/summary`

**Description:** Retrieves a summary of all actions for a specific invoice grouped by action type.

**Response:**
```json
{
  "invoiceId": 123,
  "pdfDownloads": [
    {
      "billActionId": "...",
      "invoiceId": 123,
      "actionType": "PDF_DOWNLOADED",
      "createdAt": "2026-03-17T14:30:00Z"
    }
  ],
  "prints": [
    {
      "billActionId": "...",
      "invoiceId": 123,
      "actionType": "BILL_PRINTED",
      "createdAt": "2026-03-17T14:32:00Z"
    }
  ],
  "whatsappSends": [
    {
      "billActionId": "...",
      "invoiceId": 123,
      "actionType": "WHATSAPP_SENT",
      "createdAt": "2026-03-17T14:35:00Z"
    }
  ],
  "totalActions": 3,
  "allActions": [...]
}
```

## Frontend Integration Example

### In KitchenKDS.js - Record PDF Download
```javascript
// After successful PDF download
await apiClient.post('/billing/bill-actions', {
  invoiceId: order.invoiceId,
  orderId: order.orderId,
  actionType: 'PDF_DOWNLOADED',
  deviceInfo: navigator.userAgent,
  notes: 'Downloaded via html2pdf library'
});
```

### In KitchenKDS.js - Record Bill Print
```javascript
// After print dialog completes
await apiClient.post('/billing/bill-actions', {
  invoiceId: order.invoiceId,
  orderId: order.orderId,
  actionType: 'BILL_PRINTED',
  deviceInfo: navigator.userAgent
});
```

### In KitchenKDS.js - Record WhatsApp Send
```javascript
// Before/after opening WhatsApp
await apiClient.post('/billing/bill-actions', {
  invoiceId: order.invoiceId,
  orderId: order.orderId,
  actionType: 'WHATSAPP_SENT',
  deviceInfo: navigator.userAgent
});
```

### Get Bill Action Summary
```javascript
// To check if bill has been printed/downloaded before sending WhatsApp
const summary = await apiClient.get(`/billing/bill-actions/invoice/${order.invoiceId}/summary`);

console.log('PDF Downloads:', summary.pdfDownloads.length);
console.log('Prints:', summary.prints.length);
console.log('WhatsApp Sends:', summary.whatsappSends.length);
```

## Database Query Examples

### Get all bill actions for past 24 hours
```sql
SELECT * FROM bill_actions
WHERE created_at >= NOW() - INTERVAL 24 HOUR
ORDER BY created_at DESC;
```

### Get summary by action type for a restaurant
```sql
SELECT 
  action_type,
  COUNT(*) as count,
  MAX(created_at) as last_action
FROM bill_actions
WHERE restaurant_id = 1 AND created_at >= NOW() - INTERVAL 7 DAY
GROUP BY action_type;
```

### Check if an invoice has been printed and sent via WhatsApp
```sql
SELECT 
  action_type,
  COUNT(*) as count
FROM bill_actions
WHERE invoice_id = 123
GROUP BY action_type;
```

## Key Features
1. **Immutable Audit Trail** - All actions are recorded and cannot be modified
2. **User Tracking** - Stores user ID to know who performed each action
3. **Device/IP Tracking** - Records browser user agent and IP for security
4. **Time-Series Data** - Timestamps allow tracking of workflow timeline
5. **Restaurant Isolation** - Data is isolated by restaurant_id for multi-tenant security
6. **Efficient Queries** - Indexed on invoice_id, order_id, restaurant_id for fast lookups

## Migration Steps
1. Run the SQL migration: `src/billing/migrations/001_create_bill_actions_table.sql`
2. The BillAction entity is auto-loaded by TypeORM (autoLoadEntities: true)
3. Use the new endpoints to record and track bill actions

## Security Notes
- All endpoints require JWT authentication
- Role-based access control (ADMIN, SUPER_ADMIN, KITCHEN, CASHIER)
- Restaurant data is isolated via restaurantId
- IP addresses and user agents are logged for audit purposes
