<?php
// Start the session
session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];

// Include the database connection file
include_once '../db.php';
include_once 'db_report_sync.php';

$sync_message = '';
$sync_status = '';

// Check if sync is requested
if (isset($_POST['sync_data'])) {
    $days = isset($_POST['days']) ? intval($_POST['days']) : 90;
    $result = syncCompletedOrders($conn, $restaurant_id, $days);
    
    if ($result['success']) {
        $sync_status = 'success';
        $sync_message = 'Synced ' . $result['synced'] . ' orders to reports!';
    } else {
        $sync_status = 'error';
        $sync_message = $result['message'];
    }
}

// Get report statistics
$stats_query = "SELECT 
                COUNT(*) as total_records,
                COUNT(DISTINCT DATE(sales_date)) as days_with_data,
                SUM(total_price) as total_sales,
                SUM(quantity) as total_quantity
                FROM reports_tbl
                WHERE restaurant_id = ?";

$stats_stmt = $conn->prepare($stats_query);
$stats_stmt->bind_param("i", $restaurant_id);
$stats_stmt->execute();
$stats_result = $stats_stmt->get_result();
$stats = $stats_result->fetch_assoc();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Reports Data</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css" />
    <style>
        body {
            background-color: #f8f9fa;
            padding: 20px;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            padding: 30px;
            margin-top: 20px;
        }
        .section-title {
            color: #007bff;
            margin-bottom: 20px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin-bottom: 15px;
        }
        .stat-card h6 {
            margin: 0 0 10px 0;
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.9;
        }
        .stat-card .number {
            font-size: 24px;
            font-weight: bold;
        }
        .form-section {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2><i class="fas fa-sync"></i> Sync Reports Data</h2>
        
        <?php if ($sync_message) : ?>
            <div class="alert alert-<?php echo ($sync_status == 'success') ? 'success' : 'danger'; ?> alert-dismissible fade show" role="alert">
                <?php echo htmlspecialchars($sync_message); ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        <?php endif; ?>

        <div class="section-title">Current Report Statistics</div>
        <div class="row">
            <div class="col-md-3">
                <div class="stat-card">
                    <h6>Total Records</h6>
                    <div class="number"><?php echo $stats['total_records'] ?? 0; ?></div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
                    <h6>Total Sales</h6>
                    <div class="number">৳<?php echo number_format($stats['total_sales'] ?? 0, 0); ?></div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
                    <h6>Days with Data</h6>
                    <div class="number"><?php echo $stats['days_with_data'] ?? 0; ?></div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">
                    <h6>Total Quantity</h6>
                    <div class="number"><?php echo $stats['total_quantity'] ?? 0; ?></div>
                </div>
            </div>
        </div>

        <div class="form-section">
            <div class="section-title">Sync Completed Orders</div>
            <p>This tool will synchronize all completed orders from the past N days into the reports table. This is useful for generating accurate sales reports.</p>
            
            <form method="POST" class="needs-validation">
                <div class="mb-3">
                    <label for="days" class="form-label">Sync orders from the past:</label>
                    <div class="input-group">
                        <input type="number" class="form-control" id="days" name="days" value="90" min="1" max="365" required>
                        <span class="input-group-text">days</span>
                    </div>
                    <small class="form-text text-muted">Enter the number of days to look back for completed orders.</small>
                </div>

                <button type="submit" name="sync_data" class="btn btn-primary btn-lg">
                    <i class="fas fa-sync"></i> Start Synchronization
                </button>
            </form>
        </div>

        <div class="form-section">
            <div class="section-title">Instructions</div>
            <ul>
                <li>Click the "Start Synchronization" button to sync all completed orders into the reports table.</li>
                <li>The synchronization will only add orders that don't already exist in the reports table.</li>
                <li>This process may take some time if you have many orders.</li>
                <li>Once synced, your reports will show accurate sales data.</li>
            </ul>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

<?php
$stats_stmt->close();
$conn->close();
?>
