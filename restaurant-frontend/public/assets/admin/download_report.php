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

// Load PhpSpreadsheet if available
$composerAutoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($composerAutoload)) {
    require_once $composerAutoload;
}

// Get report parameters
$report_type = isset($_GET['type']) ? $_GET['type'] : 'daily'; // daily or monthly
$format = isset($_GET['format']) ? $_GET['format'] : 'csv'; // csv, excel, or pdf
$date = isset($_GET['date']) ? $_GET['date'] : date('Y-m-d');
$from_date = isset($_GET['from_date']) ? $_GET['from_date'] : date('Y-m-d', strtotime('-30 days'));
$to_date = isset($_GET['to_date']) ? $_GET['to_date'] : date('Y-m-d');
$filter_type = isset($_GET['filter_type']) ? $_GET['filter_type'] : 'single';

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

if (!$restaurantCurrency) {
    $restaurantCurrency = '৳';
}

// Build the WHERE clause
$where_clause = "r.restaurant_id = ?";
$bind_types = "i";
$bind_params = [$restaurant_id];

if ($report_type === 'monthly') {
    $current_year = date('Y');
    $current_month = date('m');
    $selected_year = isset($_GET['year']) ? intval($_GET['year']) : $current_year;
    $selected_month = isset($_GET['month']) ? intval($_GET['month']) : $current_month;
    
    $start_date = date('Y-m-01', mktime(0, 0, 0, $selected_month, 1, $selected_year));
    $end_date = date('Y-m-t', mktime(0, 0, 0, $selected_month, 1, $selected_year));
    
    $where_clause .= " AND DATE(r.sales_date) BETWEEN ? AND ?";
    $bind_types .= "ss";
    $bind_params[] = $start_date;
    $bind_params[] = $end_date;
    
    $report_period = date('F Y', strtotime($start_date));
} else if ($filter_type === 'range') {
    $where_clause .= " AND DATE(r.sales_date) BETWEEN ? AND ?";
    $bind_types .= "ss";
    $bind_params[] = $from_date;
    $bind_params[] = $to_date;
    
    $report_period = date('M d, Y', strtotime($from_date)) . " to " . date('M d, Y', strtotime($to_date));
} else {
    $where_clause .= " AND DATE(r.sales_date) = ?";
    $bind_types .= "s";
    $bind_params[] = $date;
    
    $report_period = date('M d, Y', strtotime($date));
}

// Fetch sales data
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

// Collect all data
$sales_data = [];
$total_quantity = 0;
$total_sales = 0;
$category_summary = [];
$payment_method_summary = [];

while ($row = $report_result->fetch_assoc()) {
    $sales_data[] = $row;
    $total_quantity += $row['quantity'];
    $total_sales += $row['total_price'];
    
    // Category summary
    if (!isset($category_summary[$row['category_name']])) {
        $category_summary[$row['category_name']] = ['quantity' => 0, 'total' => 0];
    }
    $category_summary[$row['category_name']]['quantity'] += $row['quantity'];
    $category_summary[$row['category_name']]['total'] += $row['total_price'];
    
    // Payment method summary
    $payment_method = $row['payment_method'] ?: 'Unknown';
    if (!isset($payment_method_summary[$payment_method])) {
        $payment_method_summary[$payment_method] = ['quantity' => 0, 'total' => 0];
    }
    $payment_method_summary[$payment_method]['quantity']++;
    $payment_method_summary[$payment_method]['total'] += $row['total_price'];
}

$report_stmt->close();

// Generate CSV format
if ($format === 'csv') {
    $filename = strtoupper($report_type) . "_Report_" . str_replace(['-', ':'], ['', ''], $report_period) . "_" . date('YmdHis') . ".csv";
    
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    
    $output = fopen('php://output', 'w');
    
    // Add BOM for UTF-8 in Excel
    fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
    
    // Header information
    fputcsv($output, ['SALES REPORT']);
    fputcsv($output, ['Report Type', ucfirst($report_type)]);
    fputcsv($output, ['Period', $report_period]);
    fputcsv($output, ['Generated Date', date('M d, Y H:i:s')]);
    fputcsv($output, ['Currency', $restaurantCurrency]);
    fputcsv($output, []);
    
    // Summary section
    fputcsv($output, ['SUMMARY']);
    fputcsv($output, ['Metric', 'Value']);
    fputcsv($output, ['Total Sales', $restaurantCurrency . number_format($total_sales, 2)]);
    fputcsv($output, ['Total Quantity', $total_quantity]);
    fputcsv($output, ['Total Orders', count($sales_data)]);
    fputcsv($output, []);
    
    // Category Summary
    fputcsv($output, ['SALES BY CATEGORY']);
    fputcsv($output, ['Category', 'Quantity', 'Total Sales']);
    foreach ($category_summary as $category => $data) {
        fputcsv($output, [$category, $data['quantity'], $restaurantCurrency . number_format($data['total'], 2)]);
    }
    fputcsv($output, []);
    
    // Detailed transactions
    fputcsv($output, ['DETAILED SALES TRANSACTIONS']);
    fputcsv($output, ['Date & Time', 'Item Name', 'Category', 'Quantity', 'Unit Price', 'Total Price', 'Location', 'Customer']);
    
    foreach ($sales_data as $row) {
        fputcsv($output, [
            date('M d, Y H:i', strtotime($row['sales_date'] . ' ' . $row['sales_time'])),
            $row['food_items_name'],
            $row['category_name'],
            $row['quantity'],
            $restaurantCurrency . number_format($row['unit_price'], 2),
            $restaurantCurrency . number_format($row['total_price'], 2),
            $row['table_or_room_number'] ?: 'N/A',
            $row['customer_name'] ?: 'N/A'
        ]);
    }
    
    fputcsv($output, []);
    fputcsv($output, ['Report Footer']);
    fputcsv($output, ['Total Sales', $restaurantCurrency . number_format($total_sales, 2)]);
    fputcsv($output, ['Total Items Sold', $total_quantity]);
    
    fclose($output);
    exit;
}

// Generate Excel format
else if ($format === 'excel') {
    // Check if PhpSpreadsheet is available
    if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        $row = 1;
        
        // Header
        $sheet->setCellValue('A' . $row, 'SALES REPORT');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true)->setSize(14);
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Report Type');
        $sheet->setCellValue('B' . $row, ucfirst($report_type));
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Period');
        $sheet->setCellValue('B' . $row, $report_period);
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Generated Date');
        $sheet->setCellValue('B' . $row, date('M d, Y H:i:s'));
        $row += 2;
        
        // Summary
        $sheet->setCellValue('A' . $row, 'SUMMARY');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Total Sales');
        $sheet->setCellValue('B' . $row, $total_sales);
        $sheet->getStyle('B' . $row)->getNumberFormat()->setFormatCode('0.00');
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Total Quantity');
        $sheet->setCellValue('B' . $row, $total_quantity);
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Total Orders');
        $sheet->setCellValue('B' . $row, count($sales_data));
        $row += 2;
        
        // Category Summary
        $sheet->setCellValue('A' . $row, 'SALES BY CATEGORY');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;
        
        $sheet->setCellValue('A' . $row, 'Category');
        $sheet->setCellValue('B' . $row, 'Quantity');
        $sheet->setCellValue('C' . $row, 'Total Sales');
        $headerRow = $row;
        $sheet->getStyle('A' . $headerRow . ':C' . $headerRow)->getFont()->setBold(true);
        $sheet->getStyle('A' . $headerRow . ':C' . $headerRow)->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB('FFC0C0C0');
        $row++;
        
        foreach ($category_summary as $category => $data) {
            $sheet->setCellValue('A' . $row, $category);
            $sheet->setCellValue('B' . $row, $data['quantity']);
            $sheet->setCellValue('C' . $row, $data['total']);
            $sheet->getStyle('C' . $row)->getNumberFormat()->setFormatCode('0.00');
            $row++;
        }
        
        $row++;
        
        // Payment Method Summary
        if (!empty($payment_method_summary)) {
            $sheet->setCellValue('A' . $row, 'SALES BY PAYMENT METHOD');
            $sheet->getStyle('A' . $row)->getFont()->setBold(true);
            $row++;
            
            $sheet->setCellValue('A' . $row, 'Payment Method');
            $sheet->setCellValue('B' . $row, 'Orders');
            $sheet->setCellValue('C' . $row, 'Total Amount');
            $headerRow = $row;
            $sheet->getStyle('A' . $headerRow . ':C' . $headerRow)->getFont()->setBold(true);
            $sheet->getStyle('A' . $headerRow . ':C' . $headerRow)->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB('FFC0C0C0');
            $row++;
            
            foreach ($payment_method_summary as $method => $data) {
                $sheet->setCellValue('A' . $row, $method);
                $sheet->setCellValue('B' . $row, $data['quantity']);
                $sheet->setCellValue('C' . $row, $data['total']);
                $sheet->getStyle('C' . $row)->getNumberFormat()->setFormatCode('0.00');
                $row++;
            }
            
            $row++;
        }
        
        // Detailed Transactions
        $sheet->setCellValue('A' . $row, 'DETAILED SALES TRANSACTIONS');
        $sheet->getStyle('A' . $row)->getFont()->setBold(true);
        $row++;
        
        $headers = ['Date & Time', 'Item Name', 'Category', 'Quantity', 'Unit Price', 'Total Price', 'Location', 'Customer', 'Payment Method'];
        $col = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($col . $row, $header);
            $sheet->getStyle($col . $row)->getFont()->setBold(true);
            $sheet->getStyle($col . $row)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FF4472C4');
            $sheet->getStyle($col . $row)->getFont()->getColor()->setARGB('FFFFFFFF');
            $col++;
        }
        $row++;
        
        foreach ($sales_data as $data) {
            $sheet->setCellValue('A' . $row, date('M d, Y H:i', strtotime($data['sales_date'] . ' ' . $data['sales_time'])));
            $sheet->setCellValue('B' . $row, $data['food_items_name']);
            $sheet->setCellValue('C' . $row, $data['category_name']);
            $sheet->setCellValue('D' . $row, $data['quantity']);
            $sheet->setCellValue('E' . $row, $data['unit_price']);
            $sheet->getStyle('E' . $row)->getNumberFormat()->setFormatCode('0.00');
            $sheet->setCellValue('F' . $row, $data['total_price']);
            $sheet->getStyle('F' . $row)->getNumberFormat()->setFormatCode('0.00');
            $sheet->setCellValue('G' . $row, $data['table_or_room_number'] ?: 'N/A');
            $sheet->setCellValue('H' . $row, $data['customer_name'] ?: 'N/A');
            $sheet->setCellValue('I' . $row, $data['payment_method'] ?: 'Unknown');
            $row++;
        }
        
        // Auto-fit columns
        foreach (range('A', 'I') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }
        
        $filename = strtoupper($report_type) . "_Report_" . str_replace(['-', ':'], ['', ''], $report_period) . "_" . date('YmdHis') . ".xlsx";
        
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        $writer->save('php://output');
        exit;
    } else {
        // Fallback to CSV if PhpSpreadsheet is not available
        header('Location: download_report.php?type=' . $report_type . '&format=csv&date=' . $date . '&from_date=' . $from_date . '&to_date=' . $to_date . '&filter_type=' . $filter_type . '&year=' . (isset($_GET['year']) ? $_GET['year'] : date('Y')) . '&month=' . (isset($_GET['month']) ? $_GET['month'] : date('m')));
        exit;
    }
}

$conn->close();
?>
