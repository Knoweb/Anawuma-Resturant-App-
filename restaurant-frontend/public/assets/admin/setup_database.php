<?php
// Database connection
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

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup Reports Database</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css" />
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .setup-card {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 40px;
            max-width: 500px;
            width: 100%;
        }
        .setup-title {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .setup-title i {
            font-size: 48px;
            color: #667eea;
            margin-bottom: 15px;
            display: block;
        }
        .setup-title h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        .setup-title p {
            color: #666;
            margin: 0;
        }
        .alert {
            margin-bottom: 20px;
        }
        .setup-button {
            width: 100%;
            padding: 12px;
            font-size: 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-setup {
            background-color: #667eea;
            color: white;
        }
        .btn-setup:hover {
            background-color: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        .success-message {
            display: none;
        }
        .loading-spinner {
            display: none;
            text-align: center;
            padding: 20px;
        }
        .spinner-border {
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="setup-card">
        <div class="setup-title">
            <i class="fas fa-database"></i>
            <h1>Setup Reports Database</h1>
            <p>Initialize the reports table</p>
        </div>

        <div id="loading-spinner" class="loading-spinner">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Creating table...</span>
            </div>
            <p style="margin-top: 15px; color: #666;">Creating reports_tbl table...</p>
        </div>

        <div id="setup-form">
            <div class="alert alert-info" role="alert">
                <i class="fas fa-info-circle"></i>
                <strong>About to create:</strong> The reports_tbl table which stores all sales data
            </div>

            <button class="setup-button btn-setup" onclick="setupDatabase()">
                <i class="fas fa-cogs"></i> Create Reports Table
            </button>
        </div>

        <div id="success-message" class="success-message">
            <div class="alert alert-success" role="alert">
                <i class="fas fa-check-circle"></i>
                <strong>Success!</strong> The reports_tbl table has been created successfully!
            </div>
            
            <div style="text-align: center;">
                <p style="color: #666; margin-bottom: 20px;">You can now use the Reports system.</p>
                <a href="daily_report.php" class="btn btn-primary" style="margin-right: 10px;">
                    <i class="fas fa-chart-line"></i> Daily Report
                </a>
                <a href="monthly_report.php" class="btn btn-primary">
                    <i class="fas fa-chart-bar"></i> Monthly Report
                </a>
            </div>
        </div>

        <div id="error-message" style="display: none;">
            <div class="alert alert-danger" role="alert" id="error-text"></div>
            <button class="setup-button btn-setup" onclick="location.reload()">
                <i class="fas fa-redo"></i> Try Again
            </button>
        </div>
    </div>

    <script>
        function setupDatabase() {
            document.getElementById('setup-form').style.display = 'none';
            document.getElementById('loading-spinner').style.display = 'block';

            // Make AJAX request to create the table
            fetch('create_reports_table.php', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                document.getElementById('loading-spinner').style.display = 'none';
                
                if (data.success) {
                    document.getElementById('success-message').style.display = 'block';
                } else {
                    showError(data.message);
                }
            })
            .catch(error => {
                document.getElementById('loading-spinner').style.display = 'none';
                showError('Error: ' + error.message);
            });
        }

        function showError(message) {
            document.getElementById('error-message').style.display = 'block';
            document.getElementById('error-text').innerHTML = '<strong>Error:</strong> ' + message;
        }
    </script>
</body>
</html>

<?php
$conn->close();
?>
