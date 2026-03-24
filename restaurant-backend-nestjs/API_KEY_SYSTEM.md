# 🔐 API Key System Implementation - Complete

## ✅ Implementation Summary

The API key system has been successfully implemented for the public POST /orders endpoint. This prevents unauthorized order creation and eliminates the need to pass `restaurantId` in the request body.

## 🔑 Generated API Keys

**SAVE THESE KEYS - Required for QR code ordering and testing**

| Restaurant ID | API Key |
|--------------|---------|
| 1 | `9ef2e7e841f5e41dcad95882f5d4ca78bf8d70f7800ef220732d641e7fddef55` |
| 6 | `091b58747d84736476a0d7c7ec9cd556c6ffda5b4c7faa7ff25765b8d27eb2a7` |
| 8 | `4d0e4aa02daa2ae296bc1359a54b97d4b37ec2d2b3dc104ff5cb25069e064a23` |
| 9 | `a1cdd1c028d4de6404862fc3e32b8ee592d339dbb3f9768577644cdd671077ec` |

## 📋 Changes Made

### 1. Database Schema
- **File**: `migrations/add-api-key-to-restaurants.sql`
- Added `api_key VARCHAR(64) UNIQUE` column to `restaurant_tbl`
- Created index `idx_restaurant_api_key` for fast lookups

### 2. Backend Files Created/Modified

**Created:**
- `src/common/guards/api-key.guard.ts` - API key authentication guard
- `scripts/generate-restaurant-keys.js` - Key generation script

**Modified:**
- `src/restaurants/entities/restaurant.entity.ts` - Added `apiKey` field
- `src/restaurants/restaurants.service.ts` - Added `findByApiKey()` method
- `src/restaurants/restaurants.module.ts` - Added TypeORM import/export
- `src/orders/dto/create-order.dto.ts` - **REMOVED** `restaurantId` field
- `src/orders/orders.controller.ts` - Applied `@UseGuards(ApiKeyGuard)` to POST
- `src/orders/orders.module.ts` - Imported `RestaurantsModule`

## 🧪 Test Results

All 4 validation tests passed:

✅ **Test 1**: Valid API key (header) → Order created (Order ID: 50)  
✅ **Test 2**: Invalid API key → 401 Unauthorized  
✅ **Test 3**: No API key → 401 Unauthorized  
✅ **Test 4**: Valid API key (query param) → Order created (Order ID: 51)

## 📡 API Usage

### Method 1: Header (Recommended)
```bash
curl -X POST "http://localhost:3000/api/orders" \
  -H "Content-Type: application/json" \
  -H "x-api-key: 9ef2e7e841f5e41dcad95882f5d4ca78bf8d70f7800ef220732d641e7fddef55" \
  -d '{
    "tableNo": "T-5",
    "items": [
      {"foodItemId": 50, "qty": 2, "notes": "No ice"}
    ]
  }'
```

### Method 2: Query Parameter
```bash
curl -X POST "http://localhost:3000/api/orders?apiKey=9ef2e7e841f5e41dcad95882f5d4ca78bf8d70f7800ef220732d641e7fddef55" \
  -H "Content-Type: application/json" \
  -d '{
    "tableNo": "T-5",
    "items": [{"foodItemId": 50, "qty": 2}]
  }'
```

### PowerShell Example
```powershell
$apiKey = "9ef2e7e841f5e41dcad95882f5d4ca78bf8d70f7800ef220732d641e7fddef55"
Invoke-RestMethod -Method POST `
  -Uri "http://localhost:3000/api/orders" `
  -Headers @{"x-api-key"=$apiKey; "Content-Type"="application/json"} `
  -Body '{"tableNo":"T-5","items":[{"foodItemId":50,"qty":2}]}'
```

## 🎯 QR Code Integration

When generating QR codes for tables, embed the API key:

**QR Code URL Format:**
```
https://yourdomain.com/order?apiKey=9ef2e7e841f5e41dcad95882f5d4ca78bf8d70f7800ef220732d641e7fddef55&table=T-5
```

The frontend can extract the `apiKey` from the URL and include it in all order requests.

## 🔒 Security Features

✅ **Rate Limiting**: 10 requests per 60 seconds per IP (via Throttler)  
✅ **API Key Validation**: All requests require valid API key  
✅ **No ID Guessing**: Can't spam other restaurants by guessing IDs  
✅ **Key Rotation**: Keys can be regenerated if compromised  
✅ **Index Optimization**: Fast API key lookups via database index  

## 🔄 Key Rotation (If Compromised)

To regenerate keys for a specific restaurant:

```javascript
const crypto = require("crypto");
const newKey = crypto.randomBytes(32).toString("hex");

// Update in database
UPDATE restaurant_tbl 
SET api_key = '<newKey>' 
WHERE restaurant_id = 1;
```

Or re-run the generation script:
```bash
node scripts/generate-restaurant-keys.js
```

## 📊 Production Checklist

- [x] Database column added with unique constraint
- [x] API keys generated for all restaurants
- [x] Authentication guard implemented
- [x] Rate limiting active (10 req/60s)
- [x] Validation tests passed
- [ ] Update frontend QR code generator to include API keys
- [ ] Document API keys in secure password manager
- [ ] Set up key rotation schedule (optional)
- [ ] Monitor failed authentication attempts (future enhancement)

## 🚀 Next Steps

1. **Frontend QR Code Generator**: Update to embed API keys in QR codes
2. **Customer Ordering Page**: Extract `apiKey` from URL params and send with orders
3. **Admin Dashboard**: Allow restaurant owners to view/rotate their API keys
4. **Monitoring**: Add logging for failed authentication attempts

## 📝 Notes

- API keys are **64 characters** (256-bit hex)
- Keys are stored in `restaurant_tbl.api_key` column
- Guard checks both `x-api-key` header and `apiKey` query parameter
- `restaurantId` is automatically resolved from the API key
- Old test files with `restaurantId` in body will no longer work
