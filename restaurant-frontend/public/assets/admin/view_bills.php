<?php
session_start();

// Check if admin is logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit();
}

include_once '../db.php';

$restaurant_id = $_SESSION['restaurant_id'];

// Fetch all bills for this restaurant
$sql_bills = "SELECT * FROM bills_tbl WHERE restaurant_id = ? ORDER BY bill_date DESC LIMIT 100";
$stmt = $conn->prepare($sql_bills);
$stmt->bind_param('i', $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>View Bills - Restaurant Admin</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.0.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        .status-badge {
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 0.9em;
        }
        .cash {
            background-color: #d4edda;
            color: #155724;
        }
        .card {
            background-color: #d1ecf1;
            color: #0c5460;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="table-header">
            <h1><i class="fas fa-receipt"></i> Bills Management</h1>
            <a href="index.php" class="btn btn-secondary">Back to Dashboard</a>
        </div>

        <?php if ($result->num_rows > 0) { ?>
            <div class="table-responsive">
                <table class="table table-striped table-hover">
                    <thead class="table-dark">
                        <tr>
                            <th>Bill ID</th>
                            <th>Date & Time</th>
                            <th>Table #</th>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Transaction ID</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php while ($bill = $result->fetch_assoc()) { ?>
                            <tr>
                                <td><strong>#<?php echo $bill['bill_id']; ?></strong></td>
                                <td><?php echo date('Y-m-d H:i', strtotime($bill['bill_date'])); ?></td>
                                <td><?php echo $bill['table_number']; ?></td>
                                <td>
                                    <?php echo !empty($bill['customer_name']) ? htmlspecialchars($bill['customer_name']) : 'N/A'; ?>
                                    <?php if (!empty($bill['customer_number'])) echo '<br><small>' . htmlspecialchars($bill['customer_number']) . '</small>'; ?>
                                </td>
                                <td><strong><?php echo number_format($bill['total_amount'], 2); ?></strong></td>
                                <td>
                                    <span class="status-badge <?php echo strtolower($bill['payment_method']); ?>">
                                        <?php echo $bill['payment_method']; ?>
                                    </span>
                                </td>
                                <td><?php echo $bill['transaction_id'] ? $bill['transaction_id'] : '<em>N/A</em>'; ?></td>
                                <td>
                                    <button class="btn btn-sm btn-info" onclick="viewDetails(<?php echo htmlspecialchars(json_encode($bill)); ?>)">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                </td>
                            </tr>
                        <?php } ?>
                    </tbody>
                </table>
            </div>
        <?php } else { ?>
            <div class="alert alert-info" role="alert">
                <i class="fas fa-info-circle"></i> No bills found yet.
            </div>
        <?php } ?>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.0.2/js/bootstrap.bundle.min.js"></script>
    <script>
        function viewDetails(bill) {
            let details = `
                <strong>Bill ID:</strong> ${bill.bill_id}<br>
                <strong>Date:</strong> ${bill.bill_date}<br>
                <strong>Table:</strong> ${bill.table_number}<br>
                <strong>Customer:</strong> ${bill.customer_name || 'N/A'}<br>
                <strong>Phone:</strong> ${bill.customer_number || 'N/A'}<br>
                <strong>Amount:</strong> ${bill.total_amount}<br>
                <strong>Payment Method:</strong> ${bill.payment_method}<br>
                <strong>Transaction ID:</strong> ${bill.transaction_id || 'N/A'}<br>
                <strong>Session ID:</strong> ${bill.session_id || 'N/A'}
            `;
            alert(details);
        }
    </script>
</body>
</html>
