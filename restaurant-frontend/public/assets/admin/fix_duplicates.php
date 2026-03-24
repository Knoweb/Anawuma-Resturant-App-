<?php
// Update reports_tbl to add order tracking and prevent duplicates
session_start();

include_once '../db.php';

// Step 1: Create the table with improved schema (if it doesn't exist)
$sql_create = "CREATE TABLE IF NOT EXISTS reports_tbl (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id INT NOT NULL,
    order_id INT,
    is_room_order BOOLEAN DEFAULT FALSE,
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
    FOREIGN KEY (restaurant_id) REFERENCES restaurant_tbl(restaurant_id) ON DELETE CASCADE,
    UNIQUE KEY unique_order (restaurant_id, order_id, is_room_order),
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_sales_date (sales_date),
    INDEX idx_sales_time (sales_time),
    INDEX idx_category (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

// Step 2: Check if the table exists
$check_table = "SHOW TABLES LIKE 'reports_tbl'";
$table_result = $conn->query($check_table);

if ($table_result->num_rows > 0) {
    // Table exists, check if it has order_id column
    $check_column = "SHOW COLUMNS FROM reports_tbl LIKE 'order_id'";
    $column_result = $conn->query($check_column);
    
    if ($column_result->num_rows == 0) {
        // Add order_id column
        $alter_sql = "ALTER TABLE reports_tbl ADD COLUMN order_id INT AFTER restaurant_id, ADD COLUMN is_room_order BOOLEAN DEFAULT FALSE AFTER order_id";
        $conn->query($alter_sql);
    }
    
    // Add unique constraint if it doesn't exist
    $check_constraint = "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'reports_tbl' AND CONSTRAINT_NAME = 'unique_order'";
    $constraint_result = $conn->query($check_constraint);
    
    if ($constraint_result->num_rows == 0) {
        $add_constraint = "ALTER TABLE reports_tbl ADD UNIQUE KEY unique_order (restaurant_id, order_id, is_room_order)";
        $conn->query($add_constraint);
    }
    
    $status = "success";
    $message = "✅ Database schema updated successfully! Duplicate prevention enabled.";
} else {
    // Create table
    if ($conn->query($sql_create) === TRUE) {
        $status = "success";
        $message = "✅ reports_tbl table created with duplicate prevention!";
    } else {
        $status = "error";
        $message = "❌ Error: " . $conn->error;
    }
}

// Delete existing duplicates before enabling the constraint
if ($status === "success") {
    $delete_duplicates = "DELETE r1 FROM reports_tbl r1
                         INNER JOIN reports_tbl r2 
                         WHERE r1.report_id > r2.report_id 
                         AND r1.restaurant_id = r2.restaurant_id
                         AND r1.order_id = r2.order_id
                         AND r1.is_room_order = r2.is_room_order";
    
    $conn->query($delete_duplicates);
    $duplicate_count = $conn->affected_rows;
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Update Database Schema</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            border: none;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
        }
        .card-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 15px 15px 0 0;
            padding: 30px;
            text-align: center;
        }
        .card-header h1 {
            font-size: 28px;
            margin: 0;
            font-weight: bold;
        }
        .card-body {
            padding: 30px;
        }
        .alert {
            border-radius: 10px;
            border: none;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .info-box {
            background-color: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .button-group {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .button-group a {
            flex: 1;
            text-align: center;
        }
        .btn-custom {
            padding: 12px 20px;
            border-radius: 8px;
            border: none;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary-custom {
            background-color: #667eea;
            color: white;
        }
        .btn-primary-custom:hover {
            background-color: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            color: white;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="card-header">
            <h1>🔧 Update Database Schema</h1>
        </div>
        <div class="card-body">
            <div class="alert alert-<?php echo $status; ?>" role="alert">
                <strong><?php echo $message; ?></strong>
            </div>

            <?php if ($status === "success") : ?>
                <div class="info-box">
                    <strong>✓ What was fixed:</strong>
                    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>Added order_id tracking column</li>
                        <li>Added unique constraint to prevent duplicates</li>
                        <li><?php echo isset($duplicate_count) && $duplicate_count > 0 ? "Removed " . $duplicate_count . " duplicate record(s)" : "No duplicates found"; ?></li>
                        <li>Orders won't be saved twice anymore</li>
                    </ul>
                </div>

                <div class="info-box">
                    <strong>📋 How it works now:</strong>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>When an order is marked "complete", it's recorded with its order_id</li>
                        <li>The database prevents the same order from being saved twice</li>
                        <li>Each order appears exactly once in reports</li>
                        <li>Duplicates are prevented at the database level</li>
                    </ol>
                </div>

                <div class="button-group">
                    <a href="daily_report.php" class="btn btn-primary-custom">
                        📊 View Daily Report
                    </a>
                    <a href="monthly_report.php" class="btn btn-primary-custom">
                        📈 View Monthly Report
                    </a>
                </div>

            <?php endif; ?>
        </div>
    </div>
</body>
</html>
