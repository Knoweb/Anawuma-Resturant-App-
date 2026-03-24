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

// Fetch the currency for the restaurant
$currencyQuery = "
    SELECT c.currency 
    FROM restaurant_tbl r
    JOIN currency_types_tbl c ON r.currency_id = c.currency_id
    WHERE r.restaurant_id = ?";
$stmtCurrency = $conn->prepare($currencyQuery);
$stmtCurrency->bind_param("i", $restaurant_id);
$stmtCurrency->execute();
$stmtCurrency->bind_result($restaurantCurrency);
$stmtCurrency->fetch();
$stmtCurrency->close();

// Default to ৳ if no currency found
if (!$restaurantCurrency) {
    $restaurantCurrency = '৳';
}

// Get selected month and year (default to current month)
$current_year = date('Y');
$current_month = date('m');

$selected_year = isset($_GET['year']) ? intval($_GET['year']) : $current_year;
$selected_month = isset($_GET['month']) ? intval($_GET['month']) : $current_month;

// Create date range for the selected month
$start_date = date('Y-m-01', mktime(0, 0, 0, $selected_month, 1, $selected_year));
$end_date = date('Y-m-t', mktime(0, 0, 0, $selected_month, 1, $selected_year));

// Fetch monthly sales reports
$report_query = "SELECT 
                    r.report_id,
                    DATE(r.sales_date) as sales_date,
                    r.food_items_name,
                    r.category_name,
                    SUM(r.quantity) as total_quantity,
                    SUM(r.total_price) as total_price,
                    COUNT(*) as item_count
                FROM reports_tbl r
                WHERE r.restaurant_id = ? AND DATE(r.sales_date) BETWEEN ? AND ?
                GROUP BY DATE(r.sales_date), r.category_name
                ORDER BY sales_date DESC";

$report_stmt = $conn->prepare($report_query);
$report_stmt->bind_param("iss", $restaurant_id, $start_date, $end_date);
$report_stmt->execute();
$report_result = $report_stmt->get_result();

// Calculate totals
$total_quantity = 0;
$total_sales = 0;
$total_items = 0;
$daily_summary = [];
$category_summary = [];

$report_stmt2 = $conn->prepare($report_query);
$report_stmt2->bind_param("iss", $restaurant_id, $start_date, $end_date);
$report_stmt2->execute();
$temp_result = $report_stmt2->get_result();

while ($row = $temp_result->fetch_assoc()) {
    $total_quantity += $row['total_quantity'];
    $total_sales += $row['total_price'];
    $total_items += $row['item_count'];
    
    $date = $row['sales_date'];
    if (!isset($daily_summary[$date])) {
        $daily_summary[$date] = [
            'quantity' => 0,
            'total' => 0,
            'count' => 0
        ];
    }
    $daily_summary[$date]['quantity'] += $row['total_quantity'];
    $daily_summary[$date]['total'] += $row['total_price'];
    $daily_summary[$date]['count']++;
    
    // Group by category
    if (!isset($category_summary[$row['category_name']])) {
        $category_summary[$row['category_name']] = [
            'quantity' => 0,
            'total' => 0,
            'count' => 0
        ];
    }
    $category_summary[$row['category_name']]['quantity'] += $row['total_quantity'];
    $category_summary[$row['category_name']]['total'] += $row['total_price'];
    $category_summary[$row['category_name']]['count']++;
}
$report_stmt2->close();

// Get detailed data for daily breakdown
$daily_detail_query = "SELECT 
                        DATE(r.sales_date) as sales_date,
                        r.food_items_name,
                        r.category_name,
                        SUM(r.quantity) as total_quantity,
                        AVG(r.unit_price) as avg_price,
                        SUM(r.total_price) as total_price
                    FROM reports_tbl r
                    WHERE r.restaurant_id = ? AND DATE(r.sales_date) BETWEEN ? AND ?
                    GROUP BY DATE(r.sales_date), r.food_items_name, r.category_name
                    ORDER BY sales_date DESC, total_price DESC";

$daily_detail_stmt = $conn->prepare($daily_detail_query);
$daily_detail_stmt->bind_param("iss", $restaurant_id, $start_date, $end_date);
$daily_detail_stmt->execute();
$daily_detail_result = $daily_detail_stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Sales Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css" />
    <style>
        body {
            background-color: #f8f9fa;
            padding: 20px;
        }
        .report-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            padding: 25px;
            margin-bottom: 20px;
        }
        .report-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 15px;
        }
        .report-header h2 {
            color: #007bff;
            margin: 0;
        }
        .month-filter {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        .month-filter input,
        .month-filter select,
        .month-filter button {
            min-height: 38px;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .summary-card {
           background-color: #d2d2d2;;
            color: black;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card h5 {
            margin: 0 0 10px 0;
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.9;
        }
        .summary-card .number {
            font-size: 28px;
            font-weight: bold;
        }
        .summary-card.total-sales {
            background-color: #d2d2d2;
        }
        .summary-card.total-items {
            background-color: #d2d2d2;  
        }
        .summary-card.total-quantity {
            background-color: #d2d2d2;
        }
        .table-section h4 {
            color: #333;
            margin-top: 30px;
            margin-bottom: 15px;
            border-left: 4px solid #007bff;
            padding-left: 10px;
        }
        .table-responsive {
            border-radius: 8px;
            overflow: hidden;
        }
        table {
            margin-bottom: 0;
        }
        table thead {
            background-color: #007bff;
            color: white;
        }
        table tbody tr:hover {
            background-color: #f5f5f5;
        }
        .category-badge {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 12px;
            margin: 2px;
        }
        .no-data {
            text-align: center;
            padding: 40px;
            color: #999;
        }
        .no-data i {
            font-size: 48px;
            margin-bottom: 15px;
            opacity: 0.5;
        }
        .print-btn {
            background-color: #28a745;
        }
        .print-btn:hover {
            background-color: #218838;
        }
        .daily-section {
            background-color: #f9f9f9;
            padding: 15px;
            margin: 10px 0;
            border-left: 3px solid #007bff;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h2><i class="fas fa-chart-bar"></i> Monthly Sales Report</h2>
            <div class="month-filter">
                <select id="monthSelect" class="form-select" style="width: 150px;">
                    <?php for ($m = 1; $m <= 12; $m++) : ?>
                        <option value="<?php echo $m; ?>" <?php echo ($m == $selected_month) ? 'selected' : ''; ?>>
                            <?php echo date('F', mktime(0, 0, 0, $m, 1)); ?>
                        </option>
                    <?php endfor; ?>
                </select>
                <select id="yearSelect" class="form-select" style="width: 120px;">
                    <?php for ($y = date('Y') - 5; $y <= date('Y'); $y++) : ?>
                        <option value="<?php echo $y; ?>" <?php echo ($y == $selected_year) ? 'selected' : ''; ?>>
                            <?php echo $y; ?>
                        </option>
                    <?php endfor; ?>
                </select>
                <button class="btn btn-primary" onclick="filterByMonth()">Filter</button>
                <div class="dropdown">
                    <button class="btn btn-success dropdown-toggle" type="button" id="downloadDropdown" data-bs-toggle="dropdown">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <ul class="dropdown-menu" aria-labelledby="downloadDropdown">
                        <li><a class="dropdown-item" href="javascript:downloadReport('csv')"><i class="fas fa-file-csv"></i> CSV Format</a></li>
                        <li><a class="dropdown-item" href="javascript:downloadReport('excel')"><i class="fas fa-file-excel"></i> Excel Format</a></li>
                    </ul>
                </div>
                <button class="btn print-btn" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
            </div>
        </div>

        <?php if ($total_items > 0) : ?>
            <!-- Summary Cards -->
            <div class="summary-cards">
                <div class="summary-card total-sales">
                    <h5>Total Sales</h5>
                    <div class="number"><?php echo $restaurantCurrency; ?><?php echo number_format($total_sales, 2); ?></div>
                </div>
                <div class="summary-card total-quantity">
                    <h5>Total Quantity</h5>
                    <div class="number"><?php echo $total_quantity; ?></div>
                </div>
            </div>

            <!-- Category Summary -->
            <div class="table-section">
                <h4><i class="fas fa-layer-group"></i> Sales by Category</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Total Quantity</th>
                                <th>Total Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($category_summary as $category => $data) : ?>
                                <tr>
                                    <td><span class="category-badge"><?php echo htmlspecialchars($category); ?></span></td>
                                    <td><?php echo $data['quantity']; ?></td>
                                    <td><strong><?php echo $restaurantCurrency; ?><?php echo number_format($data['total'], 2); ?></strong></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Daily Breakdown -->
            <div class="table-section">
                <h4><i class="fas fa-calendar-day"></i> Daily Breakdown</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Total Quantity</th>
                                <th>Items Sold</th>
                                <th>Daily Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($daily_summary as $date => $data) : ?>
                                <tr>
                                    <td><strong><?php echo date('M d, Y', strtotime($date)); ?></strong></td>
                                    <td><?php echo $data['quantity']; ?></td>
                                    <td><?php echo $data['count']; ?></td>
                                    <td><?php echo $restaurantCurrency; ?><?php echo number_format($data['total'], 2); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Detailed Item Report -->
            <div class="table-section">
                <h4><i class="fas fa-list"></i> Item-wise Sales Detail</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Total Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            while ($row = $daily_detail_result->fetch_assoc()) : 
                            ?>
                                <tr>
                                    <td><?php echo date('M d', strtotime($row['sales_date'])); ?></td>
                                    <td><span class="category-badge"><?php echo htmlspecialchars($row['category_name']); ?></span></td>
                                    <td><?php echo $row['total_quantity']; ?></td>
                                    <td><strong><?php echo $restaurantCurrency; ?><?php echo number_format($row['total_price'], 2); ?></strong></td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        <?php else : ?>
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <p>No sales data available for <?php echo date('F Y', mktime(0, 0, 0, $selected_month, 1, $selected_year)); ?></p>
            </div>
        <?php endif; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function filterByMonth() {
            const month = document.getElementById('monthSelect').value;
            const year = document.getElementById('yearSelect').value;
            window.location.href = 'monthly_report.php?month=' + month + '&year=' + year;
        }

        function downloadReport(format) {
            const month = document.getElementById('monthSelect').value;
            const year = document.getElementById('yearSelect').value;
            const url = 'download_report.php?type=monthly&format=' + format + '&month=' + month + '&year=' + year;
            window.location.href = url;
        }
    </script>
</body>
</html>

<?php
$daily_detail_stmt->close();
$conn->close();
?>
