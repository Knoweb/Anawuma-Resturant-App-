<?php
// Start the session
session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the Housekeeping privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];

// Include the database connection file
include_once '../db.php';

// Initialize filter variables
$date_from = isset($_POST['date_from']) ? $_POST['date_from'] : '';
$date_to = isset($_POST['date_to']) ? $_POST['date_to'] : '';
$customer_name = isset($_POST['customer_name']) ? $_POST['customer_name'] : '';
$show_today = !isset($_POST['date_from']) && !isset($_POST['date_to']); // Show today by default if no date filters

// Get today's date in YYYY-MM-DD format
$today_date = date('Y-m-d');

// Initialize an empty array to store completed orders
$completed_orders = [];
$grand_total = 0;

// Prepare the base query for completed orders from tables
$order_query = "SELECT o.table_number, o.food_item_id, f.food_items_name, o.quantity, o.order_date, 
                o.payment_method, o.total_price, o.customer_name, o.payment_status
                FROM orders_tbl o
                JOIN food_items_tbl f ON o.food_item_id = f.food_items_id
                WHERE o.restaurant_id = ? AND o.completed = 1";

// Add filtering conditions based on user input
$params = [$restaurant_id];
if ($show_today) {
    $order_query .= " AND DATE(o.order_date) = ?";
    $params[] = $today_date;
} else {
    if ($date_from) {
        $order_query .= " AND DATE(o.order_date) >= ?";
        $params[] = $date_from;
    }
    if ($date_to) {
        $order_query .= " AND DATE(o.order_date) <= ?";
        $params[] = $date_to;
    }
}
if ($customer_name) {
    $order_query .= " AND o.customer_name LIKE ?";
    $params[] = "%{$customer_name}%";
}

$order_query .= " ORDER BY o.order_date DESC";

$order_stmt = mysqli_prepare($conn, $order_query);
mysqli_stmt_bind_param($order_stmt, str_repeat('s', count($params)), ...$params);
mysqli_stmt_execute($order_stmt);
$order_result = mysqli_stmt_get_result($order_stmt);

// Fetch completed orders from room_orders_tbl with food item name
$room_order_query = "SELECT ro.room_number, ro.food_item_id, f.food_items_name, ro.quantity, ro.order_date, 
                     ro.total_price, ro.customer_name
                     FROM room_orders_tbl ro
                     JOIN food_items_tbl f ON ro.food_item_id = f.food_items_id
                     WHERE ro.restaurant_id = ? AND ro.completed = 1";

// Add filtering conditions for room orders
$room_params = [$restaurant_id];
if ($show_today) {
    $room_order_query .= " AND DATE(ro.order_date) = ?";
    $room_params[] = $today_date;
} else {
    if ($date_from) {
        $room_order_query .= " AND DATE(ro.order_date) >= ?";
        $room_params[] = $date_from;
    }
    if ($date_to) {
        $room_order_query .= " AND DATE(ro.order_date) <= ?";
        $room_params[] = $date_to;
    }
}
if ($customer_name) {
    $room_order_query .= " AND ro.customer_name LIKE ?";
    $room_params[] = "%{$customer_name}%";
}

$room_order_query .= " ORDER BY ro.order_date DESC";

$room_order_stmt = mysqli_prepare($conn, $room_order_query);
mysqli_stmt_bind_param($room_order_stmt, str_repeat('s', count($room_params)), ...$room_params);
mysqli_stmt_execute($room_order_stmt);
$room_order_result = mysqli_stmt_get_result($room_order_stmt);

// Merge completed orders from both tables
while ($order_row = mysqli_fetch_assoc($order_result)) {
    $completed_orders[] = [
        'table_number' => $order_row['table_number'],
        'food_item_name' => $order_row['food_items_name'],
        'quantity' => $order_row['quantity'],
        'order_date' => $order_row['order_date'],
        'payment_method' => $order_row['payment_method'],
        'total_price' => $order_row['total_price'],
        'customer_name' => $order_row['customer_name'],
        'payment_status' => $order_row['payment_status'],
        'type' => 'table_order'
    ];
    $grand_total += $order_row['total_price'];
}

while ($room_order_row = mysqli_fetch_assoc($room_order_result)) {
    $completed_orders[] = [
        'room_number' => $room_order_row['room_number'],
        'food_item_name' => $room_order_row['food_items_name'],
        'quantity' => $room_order_row['quantity'],
        'order_date' => $room_order_row['order_date'],
        'total_price' => $room_order_row['total_price'],
        'customer_name' => $room_order_row['customer_name'],
        'type' => 'room_order'
    ];
    $grand_total += $room_order_row['total_price'];
}

mysqli_stmt_close($order_stmt);
mysqli_stmt_close($room_order_stmt);
mysqli_close($conn);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Completed Orders</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        h2 {
            color: #333;
            margin-bottom: 20px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
            overflow: hidden;
        }

        table, th, td {
            border: 1px solid #ddd;
        }

        th, td {
            padding: 12px;
            text-align: left;
        }

        th {
            background-color: #f8f8f8;
            color: #333;
            font-weight: bold;
        }

        tr:nth-child(even) {
            background-color: #f9f9f9;
        }

        .back-button {
            margin-bottom: 20px;
            background-color: #555;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 5px;
        }

        .back-button:hover {
            background-color: #444;
        }

        .container {
            width: 100%;
            max-width: 1200px;
            padding: 20px;
        }

        .filter-form {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-radius: 5px;
        }

        .filter-form input,
        .filter-form select {
            padding: 10px;
            margin-right: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .filter-form button {
            padding: 10px 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        .filter-form button:hover {
            background-color: #218838;
        }

        .grand-total {
            text-align: right;
            font-weight: bold;
            font-size: 1.2em;
            margin-top: 20px;
            padding: 10px;
            background-color: #f8f8f8;
            border-radius: 5px;
        }

        .today-notice {
            background-color: #e7f3fe;
            padding: 10px;
            border-left: 5px solid #2196F3;
            margin-bottom: 20px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h2>Completed Orders</h2>
        <button class="back-button" onclick="window.location.href='index.php';">Back</button>
        
        <!-- Filter Form -->
        <form method="POST" class="filter-form">
            <?php if ($show_today): ?>
                <div class="today-notice">Showing today's orders (<?php echo $today_date; ?>)</div>
            <?php endif; ?>
            <input type="date" name="date_from" value="<?php echo htmlspecialchars($date_from); ?>" placeholder="From Date">
            <input type="date" name="date_to" value="<?php echo htmlspecialchars($date_to); ?>" placeholder="To Date">
            <input type="text" name="customer_name" value="<?php echo htmlspecialchars($customer_name); ?>" placeholder="Customer Name">
            <button type="submit">Filter</button>
            <?php if (!$show_today): ?>
                <button type="button" onclick="window.location.href='completed_orders.php';">Show Today</button>
            <?php endif; ?>
        </form>

        <div id="completed_orders_table">
            <?php
            if (!empty($completed_orders)) {
                echo '<table>
                        <thead>
                            <tr>
                                <th>From Where</th>
                                <th>Food Item</th>
                                <th>Quantity</th>
                                <th>Date</th>
                                <th>Total Price</th>
                                <th>Customer Name</th>
                                <th>Table/Room Number</th>
                                <th>Payment Method</th>
                            </tr>
                        </thead>
                        <tbody>';

                foreach ($completed_orders as $order) {
                    echo '<tr>';
                    if ($order['type'] == 'table_order') {
                        echo '<td>Table Order</td>';
                        echo '<td>' . htmlspecialchars($order['food_item_name']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['quantity']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['order_date']) . '</td>';
                        echo '<td>' . number_format($order['total_price'], 2) . '</td>';
                        echo '<td>' . htmlspecialchars($order['customer_name']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['table_number']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['payment_method']) . '</td>';
                    } elseif ($order['type'] == 'room_order') {
                        echo '<td>Room Order</td>';
                        echo '<td>' . htmlspecialchars($order['food_item_name']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['quantity']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['order_date']) . '</td>';
                        echo '<td>' . number_format($order['total_price'], 2) . '</td>';
                        echo '<td>' . htmlspecialchars($order['customer_name']) . '</td>';
                        echo '<td>' . htmlspecialchars($order['room_number']) . '</td>';
                        echo '<td>N/A</td>';
                    }
                    echo '</tr>';
                }

                echo '</tbody></table>';
                
                // Display grand total
                echo '<div class="grand-total">Grand Total: ' . number_format($grand_total, 2) . '</div>';
            } else {
                echo '<p>No completed orders found.</p>';
                if ($show_today) {
                    echo '<p>No orders found for today (' . $today_date . ').</p>';
                }
            }
            ?>
        </div>
    </div>
</body>
</html>