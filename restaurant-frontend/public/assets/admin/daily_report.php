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

// Get filter type and dates
$filter_type = isset($_GET['filter_type']) ? $_GET['filter_type'] : 'single';
$selected_date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$from_date = isset($_GET['from_date']) ? $_GET['from_date'] : date('Y-m-d', strtotime('-30 days'));
$to_date = isset($_GET['to_date']) ? $_GET['to_date'] : date('Y-m-d');

// Build the WHERE clause based on filter type
$where_clause = "r.restaurant_id = ?";
$bind_types = "i";
$bind_params = [$restaurant_id];

if ($filter_type === 'range') {
    $where_clause .= " AND DATE(r.sales_date) BETWEEN ? AND ?";
    $bind_types .= "ss";
    $bind_params[] = $from_date;
    $bind_params[] = $to_date;
} else {
    $where_clause .= " AND DATE(r.sales_date) = ?";
    $bind_types .= "s";
    $bind_params[] = $selected_date;
}

// Fetch daily sales reports
$report_query = "SELECT 
                    r.report_id,
                    r.sales_date,
                    r.sales_time,
                    r.food_items_name,
                    r.category_name,
                    r.quantity,
                    r.unit_price,
                    r.total_price,
                    r.payment_method,
                    r.customer_name,
                    r.order_type,
                    r.table_or_room_number
                FROM reports_tbl r
                WHERE {$where_clause}
                ORDER BY r.sales_date DESC, r.sales_time DESC";

$report_stmt = $conn->prepare($report_query);
$report_stmt->bind_param($bind_types, ...$bind_params);
$report_stmt->execute();
$report_result = $report_stmt->get_result();

// Calculate totals
$total_quantity = 0;
$total_sales = 0;
$total_items = 0;
$total_orders = 0;
$category_summary = [];
$payment_method_summary = [];

while ($row = $report_result->fetch_assoc()) {
    $total_quantity += $row['quantity'];
    $total_sales += $row['total_price'];
    $total_items++;
    
    // Count unique orders
    $total_orders++;
    
    // Group by category
    if (!isset($category_summary[$row['category_name']])) {
        $category_summary[$row['category_name']] = [
            'quantity' => 0,
            'total' => 0,
            'count' => 0
        ];
    }
    $category_summary[$row['category_name']]['quantity'] += $row['quantity'];
    $category_summary[$row['category_name']]['total'] += $row['total_price'];
    $category_summary[$row['category_name']]['count']++;
    
    // Group by payment method
    $payment_method = $row['payment_method'] ?: 'Unknown';
    if (!isset($payment_method_summary[$payment_method])) {
        $payment_method_summary[$payment_method] = [
            'quantity' => 0,
            'total' => 0
        ];
    }
    $payment_method_summary[$payment_method]['quantity']++;
    $payment_method_summary[$payment_method]['total'] += $row['total_price'];
}

$report_stmt->close();

// Fetch all available report dates for history
$dates_query = "SELECT DISTINCT DATE(sales_date) as report_date 
                FROM reports_tbl 
                WHERE restaurant_id = ?
                ORDER BY report_date DESC
                LIMIT 100";
$dates_stmt = $conn->prepare($dates_query);
$dates_stmt->bind_param("i", $restaurant_id);
$dates_stmt->execute();
$dates_result = $dates_stmt->get_result();
$available_dates = [];
while ($row = $dates_result->fetch_assoc()) {
    $available_dates[] = $row['report_date'];
}
$dates_stmt->close();

// Reset for fetching again
$report_stmt = $conn->prepare($report_query);
$report_stmt->bind_param($bind_types, ...$bind_params);
$report_stmt->execute();
$report_result = $report_stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Sales Report</title>
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
            flex-wrap: wrap;
            gap: 15px;
        }
        .report-header h2 {
            color: #007bff;
            margin: 0;
        }
        .filter-controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
        }
        .filter-tabs {
            display: flex;
            gap: 5px;
            margin-bottom: 20px;
            border-bottom: 2px solid #dee2e6;
        }
        .filter-tabs button {
            background: none;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            color: #6c757d;
            font-weight: 500;
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
        }
        .filter-tabs button.active {
            color: #007bff;
            border-bottom-color: #007bff;
        }
        .filter-tabs button:hover {
            color: #0056b3;
        }
        .filter-section {
            display: none;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .filter-section.active {
            display: block;
        }
        .date-filter {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        .history-section {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .history-dropdown {
            max-height: 300px;
            overflow-y: auto;
        }
        .history-item {
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #dee2e6;
        }
        .history-item:hover {
            background-color: #e9ecef;
        }
        .history-item.active {
            background-color: #007bff;
            color: white;
        }
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .summary-card {
           background-color: #d2d2d2;
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
        .summary-card.total-orders {
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
        .payment-badge {
            display: inline-block;
            background-color: #28a745;
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
        .range-indicator {
            font-size: 13px;
            color: #6c757d;
            margin-top: 5px;
        }
        @media print {
            .filter-controls, .filter-tabs, .filter-section, .print-btn, .btn-primary {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h2><i class="fas fa-chart-line"></i> Sales Reports</h2>
            <div class="filter-controls">
                <button class="btn btn-success" onclick="downloadReport('csv')"><i class="fas fa-file-csv"></i> Download CSV</button>
                <button class="btn print-btn" onclick="window.print()"><i class="fas fa-print"></i> Print</button>
            </div>
        </div>

        <!-- Filter Tabs -->
        <div class="filter-tabs">
            <button class="<?php echo $filter_type === 'single' ? 'active' : ''; ?>" onclick="switchFilter('single')">
                <i class="fas fa-calendar-day"></i> Single Date
            </button>
            <button class="<?php echo $filter_type === 'range' ? 'active' : ''; ?>" onclick="switchFilter('range')">
                <i class="fas fa-calendar-alt"></i> Date Range
            </button>
            <button onclick="switchFilter('history')">
                <i class="fas fa-history"></i> Report History
            </button>
        </div>

        <!-- Single Date Filter -->
        <div id="single-filter" class="filter-section <?php echo $filter_type === 'single' ? 'active' : ''; ?>">
            <div class="date-filter">
                <label class="form-label mb-0">Select Date:</label>
                <input type="date" id="dateFilter" class="form-control" style="width: 200px;" value="<?php echo $selected_date; ?>">
                <button class="btn btn-primary" onclick="filterByDate()"><i class="fas fa-search"></i> Filter</button>
            </div>
        </div>

        <!-- Date Range Filter -->
        <div id="range-filter" class="filter-section <?php echo $filter_type === 'range' ? 'active' : ''; ?>">
            <div class="date-filter">
                <label class="form-label mb-0">From:</label>
                <input type="date" id="fromDate" class="form-control" style="width: 200px;" value="<?php echo $from_date; ?>">
                <label class="form-label mb-0">To:</label>
                <input type="date" id="toDate" class="form-control" style="width: 200px;" value="<?php echo $to_date; ?>">
                <button class="btn btn-primary" onclick="filterByRange()"><i class="fas fa-search"></i> Filter</button>
            </div>
        </div>

        <!-- Report History Filter -->
        <div id="history-filter" class="filter-section <?php echo $filter_type === 'history' ? 'active' : ''; ?>">
            <div class="history-section">
                <label class="form-label mb-0">Select from history:</label>
                <div class="dropdown">
                    <button class="btn btn-outline-primary dropdown-toggle" type="button" id="historyDropdown" data-bs-toggle="dropdown">
                        <i class="fas fa-list"></i> Available Reports
                    </button>
                    <ul class="dropdown-menu history-dropdown" aria-labelledby="historyDropdown" id="historyList">
                        <?php foreach ($available_dates as $date) : ?>
                            <li><a class="dropdown-item history-item <?php echo $date === $selected_date ? 'active' : ''; ?>" href="daily_report.php?date=<?php echo $date; ?>&filter_type=single">
                                <?php echo date('M d, Y (D)', strtotime($date)); ?>
                            </a></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            </div>
        </div>

        <!-- Display Range Info -->
        <?php if ($filter_type === 'range') : ?>
            <div class="range-indicator">
                <i class="fas fa-info-circle"></i> Showing reports from <strong><?php echo date('M d, Y', strtotime($from_date)); ?></strong> to <strong><?php echo date('M d, Y', strtotime($to_date)); ?></strong>
            </div>
        <?php else : ?>
            <div class="range-indicator">
                <i class="fas fa-info-circle"></i> Showing reports for <strong><?php echo date('M d, Y (l)', strtotime($selected_date)); ?></strong>
            </div>
        <?php endif; ?>

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
                <div class="summary-card total-orders">
                    <h5>Total Orders</h5>
                    <div class="number"><?php echo $total_orders; ?></div>
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
                                <th>Items Count</th>
                                <th>Total Sales</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($category_summary as $category => $data) : ?>
                                <tr>
                                    <td><span class="category-badge"><?php echo htmlspecialchars($category); ?></span></td>
                                    <td><?php echo $data['quantity']; ?></td>
                                    <td><?php echo $data['count']; ?></td>
                                    <td><strong><?php echo $restaurantCurrency; ?><?php echo number_format($data['total'], 2); ?></strong></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            

            <!-- Detailed Sales Report -->
            <div class="table-section">
                <h4><i class="fas fa-receipt"></i> Detailed Sales Report</h4>
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Category</th>
                                <th>Item Name</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Total Price</th>
                                <th>Location</th>
                                <th>Customer</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php 
                            while ($row = $report_result->fetch_assoc()) : 
                            ?>
                                <tr>
                                    <td><?php echo date('M d, H:i', strtotime($row['sales_date'] . ' ' . $row['sales_time'])); ?></td>
                                    <td><span class="category-badge"><?php echo htmlspecialchars($row['category_name']); ?></span></td>
                                    <td><?php echo htmlspecialchars($row['food_items_name']); ?></td>
                                    <td><?php echo $row['quantity']; ?></td>
                                    <td><?php echo $restaurantCurrency; ?><?php echo number_format($row['unit_price'], 2); ?></td>
                                    <td><strong><?php echo $restaurantCurrency; ?><?php echo number_format($row['total_price'], 2); ?></strong></td>
                                    <td><?php echo htmlspecialchars($row['table_or_room_number'] ?: 'N/A'); ?></td>
                                    <td><?php echo htmlspecialchars($row['customer_name'] ?? 'N/A'); ?></td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            </div>

        <?php else : ?>
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <p>No sales data available for the selected period</p>
            </div>
        <?php endif; ?>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        function switchFilter(type) {
            // Hide all filter sections
            document.getElementById('single-filter').classList.remove('active');
            document.getElementById('range-filter').classList.remove('active');
            document.getElementById('history-filter').classList.remove('active');
            
            // Remove active class from all tabs
            document.querySelectorAll('.filter-tabs button').forEach(btn => btn.classList.remove('active'));
            
            // Show selected filter section
            if (type === 'single') {
                document.getElementById('single-filter').classList.add('active');
                event.target.classList.add('active');
            } else if (type === 'range') {
                document.getElementById('range-filter').classList.add('active');
                event.target.classList.add('active');
            } else if (type === 'history') {
                document.getElementById('history-filter').classList.add('active');
                event.target.classList.add('active');
            }
        }

        function filterByDate() {
            const date = document.getElementById('dateFilter').value;
            if (date) {
                window.location.href = 'daily_report.php?date=' + date + '&filter_type=single';
            }
        }

        function filterByRange() {
            const fromDate = document.getElementById('fromDate').value;
            const toDate = document.getElementById('toDate').value;
            
            if (!fromDate || !toDate) {
                alert('Please select both from and to dates');
                return;
            }
            
            if (new Date(fromDate) > new Date(toDate)) {
                alert('From date cannot be after To date');
                return;
            }
            
            window.location.href = 'daily_report.php?from_date=' + fromDate + '&to_date=' + toDate + '&filter_type=range';
        }

        // Allow Enter key to trigger filter
        document.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const activeFilter = document.querySelector('.filter-section.active');
                if (activeFilter.id === 'single-filter') {
                    filterByDate();
                } else if (activeFilter.id === 'range-filter') {
                    filterByRange();
                }
            }
        });

        function downloadReport(format) {
            const filterType = '<?php echo $filter_type; ?>';
            let url = 'download_report.php?type=daily&format=' + format + '&filter_type=' + filterType;
            
            if (filterType === 'range') {
                const fromDate = document.getElementById('fromDate').value || '<?php echo $from_date; ?>';
                const toDate = document.getElementById('toDate').value || '<?php echo $to_date; ?>';
                url += '&from_date=' + fromDate + '&to_date=' + toDate;
            } else {
                const date = document.getElementById('dateFilter').value || '<?php echo $selected_date; ?>';
                url += '&date=' + date;
            }
            
            window.location.href = url;
        }
    </script>
</body>
</html>

<?php
$report_stmt->close();
$conn->close();
?>
