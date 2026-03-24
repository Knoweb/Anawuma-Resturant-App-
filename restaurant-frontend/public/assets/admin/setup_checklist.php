<?php
/**
 * QUICK SETUP CHECKLIST
 * 
 * This file provides a checklist to verify everything is set up correctly
 * for the Reports system.
 * 
 * To use this checklist:
 * 1. Visit: http://your-domain/knoweb/restaurant-app/menus/admin/setup_checklist.php
 * 2. Follow the steps and verify each item
 * 3. Once all items are green, the Reports system is ready to use
 */

session_start();

// Check authentication
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];
include_once '../db.php';

// Checklist items
$checklist = [
    'database_table' => [
        'name' => 'reports_tbl Database Table',
        'status' => false,
        'action' => 'create_reports_table.php'
    ],
    'daily_report_file' => [
        'name' => 'daily_report.php File',
        'status' => file_exists(__DIR__ . '/daily_report.php'),
        'action' => null
    ],
    'monthly_report_file' => [
        'name' => 'monthly_report.php File',
        'status' => file_exists(__DIR__ . '/monthly_report.php'),
        'action' => null
    ],
    'sync_file' => [
        'name' => 'db_report_sync.php File',
        'status' => file_exists(__DIR__ . '/../db_report_sync.php'),
        'action' => null
    ],
    'sync_reports_file' => [
        'name' => 'sync_reports.php File',
        'status' => file_exists(__DIR__ . '/sync_reports.php'),
        'action' => null
    ],
    'menu_updated' => [
        'name' => 'Admin Menu Updated with Reports',
        'status' => false,
        'action' => null
    ]
];

// Check if reports_tbl exists
$check_table = "SHOW TABLES LIKE 'reports_tbl'";
$result = $conn->query($check_table);
$checklist['database_table']['status'] = $result->num_rows > 0;

// Check if reports_tbl has data
if ($checklist['database_table']['status']) {
    $check_data = $conn->prepare("SELECT COUNT(*) as count FROM reports_tbl WHERE restaurant_id = ?");
    $check_data->bind_param("i", $restaurant_id);
    $check_data->execute();
    $data_result = $check_data->get_result();
    $data_row = $data_result->fetch_assoc();
    $record_count = $data_row['count'];
    $check_data->close();
}

// Check if menu is updated (look for 'Reports' in index.php)
$index_content = file_get_contents(__DIR__ . '/index.php');
$checklist['menu_updated']['status'] = strpos($index_content, 'collapseLayoutsReports') !== false;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reports Setup Checklist</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.3.0/css/all.min.css" />
    <style>
        body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            padding: 30px;
            max-width: 700px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            color: #333;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            margin: 0;
        }
        .checklist-item {
            display: flex;
            align-items: center;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #ddd;
            background-color: #f9f9f9;
            border-radius: 4px;
        }
        .checklist-item.complete {
            border-left-color: #28a745;
            background-color: #f0fdf4;
        }
        .checklist-item.incomplete {
            border-left-color: #ffc107;
            background-color: #fffbf0;
        }
        .checklist-item.error {
            border-left-color: #dc3545;
            background-color: #fdf8f8;
        }
        .status-icon {
            font-size: 24px;
            margin-right: 15px;
            width: 30px;
            text-align: center;
        }
        .item-details {
            flex-grow: 1;
        }
        .item-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .item-description {
            font-size: 12px;
            color: #999;
        }
        .action-btn {
            margin-left: 15px;
        }
        .status-complete {
            color: #28a745;
        }
        .status-warning {
            color: #ffc107;
        }
        .status-error {
            color: #dc3545;
        }
        .progress-section {
            margin: 30px 0;
        }
        .next-steps {
            background-color: #e7f3ff;
            border-left: 4px solid #007bff;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .next-steps h5 {
            color: #007bff;
            margin-bottom: 10px;
        }
        .next-steps ol {
            margin: 0;
            padding-left: 20px;
        }
        .next-steps li {
            margin-bottom: 8px;
            color: #333;
        }
        .completion-message {
            text-align: center;
            padding: 20px;
            background-color: #f0fdf4;
            border-radius: 4px;
            margin-top: 20px;
        }
        .completion-message i {
            font-size: 40px;
            color: #28a745;
            margin-bottom: 10px;
        }
        .completion-message p {
            color: #28a745;
            font-size: 16px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-clipboard-check"></i> Reports System Setup</h1>
            <p>Verify your Reports system installation</p>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section">
            <h5>Setup Progress</h5>
            <?php
                $completed = 0;
                foreach ($checklist as $item) {
                    if ($item['status']) $completed++;
                }
                $percentage = round(($completed / count($checklist)) * 100);
            ?>
            <div class="progress" style="height: 30px;">
                <div class="progress-bar bg-success" role="progressbar" 
                     style="width: <?php echo $percentage; ?>%" 
                     aria-valuenow="<?php echo $completed; ?>" 
                     aria-valuemin="0" 
                     aria-valuemax="<?php echo count($checklist); ?>">
                    <?php echo $completed; ?>/<?php echo count($checklist); ?> Complete
                </div>
            </div>
        </div>

        <!-- Checklist Items -->
        <h5 style="margin-top: 30px; margin-bottom: 15px;">Setup Checklist</h5>
        
        <?php foreach ($checklist as $key => $item) : ?>
            <div class="checklist-item <?php echo $item['status'] ? 'complete' : 'incomplete'; ?>">
                <div class="status-icon">
                    <?php if ($item['status']) : ?>
                        <i class="fas fa-check-circle status-complete"></i>
                    <?php else : ?>
                        <i class="fas fa-exclamation-circle status-warning"></i>
                    <?php endif; ?>
                </div>
                <div class="item-details">
                    <div class="item-name"><?php echo $item['name']; ?></div>
                    <?php if ($key === 'database_table' && $checklist['database_table']['status']) : ?>
                        <div class="item-description">
                            ✓ Found with <?php echo isset($record_count) ? $record_count : 0; ?> records
                        </div>
                    <?php endif; ?>
                </div>
                <?php if (!$item['status'] && $item['action']) : ?>
                    <a href="<?php echo $item['action']; ?>" class="btn btn-sm btn-primary action-btn">
                        <i class="fas fa-cog"></i> Setup
                    </a>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>

        <!-- Completion Message or Next Steps -->
        <?php if ($percentage === 100) : ?>
            <div class="completion-message">
                <i class="fas fa-check"></i>
                <p>✓ Reports system is ready to use!</p>
            </div>

            <div class="next-steps">
                <h5><i class="fas fa-rocket"></i> Getting Started</h5>
                <ol>
                    <li>Go to Admin Dashboard</li>
                    <li>Look for "Reports" in the left sidebar</li>
                    <li>Click "Daily Report" or "Monthly Report"</li>
                    <li>Select a date or month to view sales data</li>
                    <li>Orders will be automatically added to reports when marked complete</li>
                </ol>
            </div>
        <?php else : ?>
            <div class="next-steps">
                <h5><i class="fas fa-tasks"></i> Next Steps</h5>
                <ol>
                    <?php if (!$checklist['database_table']['status']) : ?>
                        <li><strong>Create Database Table</strong>
                            <br><a href="create_reports_table.php" class="btn btn-sm btn-primary mt-2">Create reports_tbl</a>
                        </li>
                    <?php endif; ?>
                    
                    <?php if (!$checklist['menu_updated']['status']) : ?>
                        <li><strong>Update Admin Menu</strong>
                            <br>The Reports menu in <code>index.php</code> needs to be updated manually
                        </li>
                    <?php endif; ?>
                    
                    <?php if ($checklist['database_table']['status'] && isset($record_count) && $record_count === 0) : ?>
                        <li><strong>Populate Historical Data (Optional)</strong>
                            <br><a href="sync_reports.php" class="btn btn-sm btn-info mt-2">Sync Historical Data</a>
                        </li>
                    <?php endif; ?>
                    
                    <li><strong>Test the System</strong>
                        <br>Complete an order in the Kitchen and check if it appears in reports
                    </li>
                </ol>
            </div>
        <?php endif; ?>

        <!-- Helpful Links -->
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <h5>Helpful Links</h5>
            <ul style="list-style: none; padding: 0;">
                <li>
                    <a href="daily_report.php" target="_blank">
                        <i class="fas fa-chart-line"></i> View Daily Report
                    </a>
                </li>
                <li>
                    <a href="monthly_report.php" target="_blank">
                        <i class="fas fa-chart-bar"></i> View Monthly Report
                    </a>
                </li>
                <li>
                    <a href="sync_reports.php" target="_blank">
                        <i class="fas fa-sync"></i> Manual Data Sync
                    </a>
                </li>
                <li>
                    <a href="REPORTS_SETUP.md" target="_blank">
                        <i class="fas fa-book"></i> Complete Documentation
                    </a>
                </li>
            </ul>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

<?php
$conn->close();
?>
