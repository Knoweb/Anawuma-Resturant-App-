<?php
// Direct table creation script - creates the table immediately
session_start();

include_once '../db.php';

// SQL to create the reports_tbl table
$sql = "CREATE TABLE IF NOT EXISTS reports_tbl (
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
    FOREIGN KEY (restaurant_id) REFERENCES restaurant_tbl(restaurant_id) ON DELETE CASCADE,
    INDEX idx_restaurant (restaurant_id),
    INDEX idx_sales_date (sales_date),
    INDEX idx_sales_time (sales_time),
    INDEX idx_category (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$result = $conn->query($sql);

if ($result === TRUE) {
    $message = "✅ SUCCESS! reports_tbl table has been created successfully!";
    $status = "success";
} else {
    $message = "❌ Error: " . $conn->error;
    $status = "error";
}

$conn->close();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Reports Table</title>
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
        .alert-success {
            background-color: #d4edda;
            color: #155724;
        }
        .alert-danger {
            background-color: #f8d7da;
            color: #721c24;
        }
        .table-schema {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.6;
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
        .btn-secondary-custom {
            background-color: #6c757d;
            color: white;
        }
        .btn-secondary-custom:hover {
            background-color: #5a6268;
            transform: translateY(-2px);
            color: white;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="card-header">
            <h1>📊 Reports Table Creation</h1>
        </div>
        <div class="card-body">
            <div class="alert alert-<?php echo $status; ?>" role="alert">
                <strong><?php echo $message; ?></strong>
            </div>

            <?php if ($status === "success") : ?>
                <div style="text-align: center; margin: 20px 0;">
                    <h5 style="color: #28a745; margin-bottom: 20px;">✅ Table Ready!</h5>
                    <p style="color: #666; margin-bottom: 20px;">
                        The reports_tbl table has been successfully created in your database with all required columns.
                    </p>
                </div>

                <div class="table-schema">
                    <strong>Created Table Structure:</strong><br><br>
                    reports_tbl<br>
                    ├── report_id (INT, Auto-increment)<br>
                    ├── restaurant_id (INT, Foreign Key)<br>
                    ├── sales_date (DATE)<br>
                    ├── sales_time (TIME)<br>
                    ├── sales_item_id (INT)<br>
                    ├── food_items_name (VARCHAR)<br>
                    ├── category_name (VARCHAR)<br>
                    ├── quantity (INT)<br>
                    ├── unit_price (DECIMAL)<br>
                    ├── total_price (DECIMAL)<br>
                    ├── payment_method (VARCHAR)<br>
                    ├── customer_name (VARCHAR)<br>
                    ├── order_type (ENUM: 'table', 'room')<br>
                    ├── table_or_room_number (VARCHAR)<br>
                    └── created_at (TIMESTAMP)<br>
                </div>

                <div class="button-group">
                    <a href="daily_report.php" class="btn btn-primary-custom" style="flex: 1;">
                        📊 Daily Report
                    </a>
                    <a href="monthly_report.php" class="btn btn-primary-custom" style="flex: 1;">
                        📈 Monthly Report
                    </a>
                </div>

                <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-left: 4px solid #007bff; border-radius: 5px;">
                    <strong style="color: #007bff;">✓ Next Steps:</strong>
                    <ol style="margin: 10px 0 0 20px; color: #333;">
                        <li>Go to Admin Dashboard</li>
                        <li>Complete an order in the Kitchen</li>
                        <li>Mark it as "Complete"</li>
                        <li>View it in Daily or Monthly Reports</li>
                    </ol>
                </div>

            <?php else : ?>
                <div style="margin: 20px 0;">
                    <strong>Error Details:</strong>
                    <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin-top: 10px; font-family: monospace; font-size: 12px;">
                        <?php echo htmlspecialchars($message); ?>
                    </div>
                </div>

                <div class="button-group">
                    <button class="btn btn-secondary-custom" onclick="location.reload()">
                        🔄 Try Again
                    </button>
                    <button class="btn btn-secondary-custom" onclick="history.back()">
                        ← Go Back
                    </button>
                </div>
            <?php endif; ?>
        </div>
    </div>
</body>
</html>
