# Reports System Setup Guide

## Overview
The Reports System allows restaurant admins to view daily and monthly sales reports with detailed breakdowns by item, category, and time.

## Features
- **Daily Reports**: View sales for a specific date with hourly breakdown
- **Monthly Reports**: View aggregated sales for an entire month
- **Sales Metrics**: Track quantity sold, revenue, categories, and items
- **Automatic Sync**: Orders are automatically added to reports when marked as completed
- **Manual Sync**: Option to synchronize historical data

## Database Setup

### 1. Create the Reports Table
The `reports_tbl` table stores all sales data. It's created automatically, but you can also run:

```php
// Access this file once to create the table:
http://your-domain/knoweb/restaurant-app/menus/admin/create_reports_table.php
```

Or manually run this SQL query in your database:

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## File Structure

### New Files Created:
- `menus/admin/daily_report.php` - Daily sales report page
- `menus/admin/monthly_report.php` - Monthly sales report page
- `menus/admin/sync_reports.php` - Manual sync utility page
- `menus/db_report_sync.php` - Backend sync functions
- `menus/admin/create_reports_table.php` - Table creation script

### Modified Files:
- `menus/admin/index.php` - Added Reports menu with Daily and Monthly Report tabs
- `menus/admin/admin_kitchen.php` - Added automatic report sync when orders are completed

## How It Works

### Automatic Report Generation
1. When an order is marked as "complete" in the Kitchen dashboard, it automatically adds the order to `reports_tbl`
2. The `addOrderToReport()` function extracts:
   - Sales date and time
   - Food item name
   - Category
   - Quantity
   - Unit price and total price
   - Customer name
   - Payment method
   - Order type (table or room)

### Data Sync
Two sync methods are available:

#### 1. Manual Sync via Sync Page
- Access: Admin Dashboard → Reports → Sync Reports (add a link to sync_reports.php)
- Allows syncing orders from the past N days
- Useful for initial data population

#### 2. Automatic Sync on Order Completion
- Triggers when orders are marked complete in the kitchen
- No user action needed
- Works for both table orders and room orders

## Usage

### Accessing Reports

1. **Daily Report**
   - Navigate to: Admin Dashboard → Reports → Daily Report
   - Select a date using the date picker
   - View sales metrics and detailed breakdown for that day
   - Export: Print button for PDF export

2. **Monthly Report**
   - Navigate to: Admin Dashboard → Reports → Monthly Report
   - Select month and year
   - View aggregated sales metrics
   - See daily breakdown and item-wise sales detail
   - Export: Print button for PDF export

### Viewing Metrics

Each report shows:
- **Total Sales**: Combined revenue for the period
- **Total Items Sold**: Number of distinct items sold
- **Total Quantity**: Total units sold
- **Sales by Category**: Breakdown by food category
- **Detailed Breakdown**: Item-by-item sales data with timestamps

## Report Columns

### Daily Report Table
- Time: Hour:minute format
- Item Name: Name of the food item
- Category: Category of the item
- Quantity: Number of units sold
- Unit Price: Price per unit
- Total Price: Total for this item
- Type: Table or Room order
- Location: Table/Room number
- Customer: Customer name (if recorded)
- Payment Method: How payment was made

### Monthly Report Tables
1. **Sales by Category** - Aggregated by category
2. **Daily Breakdown** - Aggregated by date
3. **Item-wise Sales Detail** - Detailed item breakdown for the month

## Backend Functions

### db_report_sync.php Functions

#### addOrderToReport($conn, $order_id, $restaurant_id, $table_number, $is_room_order)
Inserts a single completed order into reports_tbl.
- **Parameters**:
  - `$conn`: Database connection
  - `$order_id`: Order ID
  - `$restaurant_id`: Restaurant ID
  - `$table_number`: Table/Room number
  - `$is_room_order`: Boolean (true for room orders, false for table orders)
- **Returns**: Array with success status and message

#### syncCompletedOrders($conn, $restaurant_id, $days)
Syncs all completed orders from the past N days.
- **Parameters**:
  - `$conn`: Database connection
  - `$restaurant_id`: Restaurant ID
  - `$days`: Number of days to look back (default: 30)
- **Returns**: Array with success status and count of synced orders

## Troubleshooting

### No data appears in reports
1. Ensure the `reports_tbl` table has been created
2. Check that orders have been marked as "complete" in the kitchen
3. Run the manual sync from the sync_reports.php page

### Reports show old data only
- Run manual sync to populate recent completed orders that haven't been synced yet

### Date filters not working
- Ensure PHP date/time settings are correct
- Check browser's timezone settings

## Security Notes
- All reports are restaurant-specific (filtered by restaurant_id)
- Only authenticated admins can access reports
- SQL injection prevention through prepared statements
- All user input is validated and sanitized

## Performance Optimization Tips
1. Index columns in `reports_tbl` for faster queries (already included in table creation)
2. For large datasets, consider archiving old reports monthly
3. Add pagination for monthly reports if data exceeds 1000 records

## Future Enhancements
- Excel/CSV export functionality
- Advanced filtering by date range, category, item
- Graphical charts and analytics
- Revenue vs. cost analysis
- Staff performance metrics
- Inventory tracking integration

## Support
For issues or questions, contact the development team.
