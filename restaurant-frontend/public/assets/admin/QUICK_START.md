# 🚀 QUICK START GUIDE - Reports System

## ⚡ 3-Step Setup (5 minutes)

### Step 1️⃣: Create Database Table (1 minute)
**Option A: Automatic**
```
Visit: http://localhost/knoweb/restaurant-app/menus/admin/create_reports_table.php
Click: Create Table
```

**Option B: Manual SQL**
```sql
CREATE TABLE IF NOT EXISTS reports_tbl (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    sales_date DATE NOT NULL,
    sales_time TIME NOT NULL,
    sales_item_id INT NOT NULL,
    food_items_name VARCHAR(255) NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(100),
    customer_name VARCHAR(255),
    order_type ENUM('table', 'room') DEFAULT 'table',
    table_or_room_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (restaurant_id) REFERENCES restaurant_tbl(restaurant_id),
    INDEX (restaurant_id),
    INDEX (sales_date),
    INDEX (sales_time),
    INDEX (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### Step 2️⃣: Populate Historical Data (2-3 minutes) - OPTIONAL
If you have past orders to sync:

```
Visit: http://localhost/knoweb/restaurant-app/menus/admin/sync_reports.php
Enter: Number of days (e.g., 90)
Click: Start Synchronization
```

---

### Step 3️⃣: Start Using Reports! (Immediate)

**Access Daily Report:**
```
1. Login to Admin Dashboard
2. Click "Reports" in sidebar
3. Click "Daily Report"
4. Select a date
5. View your sales data!
```

**Access Monthly Report:**
```
1. Login to Admin Dashboard
2. Click "Reports" in sidebar
3. Click "Monthly Report"
4. Select month and year
5. View monthly analytics!
```

---

## 📊 What You'll See

### Daily Report Shows:
- Total sales for the selected date
- Sales by category
- Item-by-item breakdown with:
  - Time of sale
  - Item name
  - Quantity sold
  - Price information
  - Customer details
  - Payment method

### Monthly Report Shows:
- Total sales for the entire month
- Daily breakdown
- Category-wise sales
- Item-wise analytics
- Comparison across days

---

## 🔄 Automatic Data Sync

**No manual action needed!** When you complete an order in the kitchen:
```
Kitchen Order marked "Complete"
         ↓
Automatically added to reports_tbl
         ↓
Appears in Daily/Monthly Reports
```

---

## 🎨 Features at a Glance

| Feature | Daily Report | Monthly Report |
|---------|:------------:|:---------------:|
| Date Filtering | ✅ | ✅ |
| Summary Cards | ✅ | ✅ |
| Category Breakdown | ✅ | ✅ |
| Item Details | ✅ | ✅ |
| Print to PDF | ✅ | ✅ |
| Daily Aggregation | ✅ | ✅ |
| Time Tracking | ✅ | ❌ |
| Multi-Month View | ❌ | ✅ |

---

## 💡 Tips & Tricks

### Print Reports as PDF
```
1. View any report
2. Click "Print" button
3. Choose "Save as PDF" in print dialog
4. Done! You have a PDF report
```

### Filter by Date
```
Daily Report:
- Use calendar icon to pick any date
- View same-day sales only

Monthly Report:
- Select month and year
- View entire month's sales
```

### Export Data
```
Print → Save as PDF → Share with team
```

---

## 🐛 Troubleshooting

### No data in reports?
```
✓ Check if orders were marked "complete" in kitchen
✓ Run manual sync from sync_reports.php
✓ Ensure reports_tbl table was created
```

### Report page shows error?
```
✓ Check database connection
✓ Verify reports_tbl exists
✓ Clear browser cache
✓ Try different date
```

### Table or dates not showing?
```
✓ Verify admin privileges
✓ Check restaurant_id in session
✓ Ensure orders exist in database
```

---

## 📁 Files & Locations

| File | Purpose | Location |
|------|---------|----------|
| daily_report.php | Daily sales view | /menus/admin/ |
| monthly_report.php | Monthly sales view | /menus/admin/ |
| sync_reports.php | Manual sync utility | /menus/admin/ |
| db_report_sync.php | Backend sync logic | /menus/ |
| setup_checklist.php | Verify installation | /menus/admin/ |

---

## 🔗 Quick Links

```
Dashboard:
http://localhost/knoweb/restaurant-app/menus/admin/index.php

Daily Report:
http://localhost/knoweb/restaurant-app/menus/admin/daily_report.php

Monthly Report:
http://localhost/knoweb/restaurant-app/menus/admin/monthly_report.php

Sync Data:
http://localhost/knoweb/restaurant-app/menus/admin/sync_reports.php

Setup Checklist:
http://localhost/knoweb/restaurant-app/menus/admin/setup_checklist.php
```

---

## ✅ Checklist

Before using reports:
- [ ] Database table created
- [ ] Can see "Reports" in admin sidebar
- [ ] Completed at least one order
- [ ] Can open daily report
- [ ] Can open monthly report
- [ ] Print function works

---

## 🎯 Next Steps

1. ✅ Create the database table
2. ✅ Complete an order in kitchen
3. ✅ View it in Daily Report
4. ✅ Print and share reports
5. ✅ Use monthly reports for analytics

---

## 📞 Need Help?

Check these files for more info:
- **README_REPORTS.md** - Feature overview
- **REPORTS_SETUP.md** - Detailed documentation
- **IMPLEMENTATION_SUMMARY.md** - Technical details
- **setup_checklist.php** - Installation verification

---

## 🎉 You're All Set!

Your reports system is ready to use. Start tracking sales data today!

**Happy reporting! 📊**
