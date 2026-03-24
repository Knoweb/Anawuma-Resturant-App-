<?php
session_start();

// Check login and privileges
if (!isset($_SESSION['admin_id']) || !in_array($_SESSION['role'], ['admin', 'steward'])) {
    header("Location: login.php");
    exit;
}
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];
include_once '../db.php';

// === Retrieve Confirmed & Completed but Not Served Orders ===
$sqlServed = "SELECT o.order_id, o.table_number, f.food_items_name, c.category_name, o.quantity, o.order_date, o.customer_name
              FROM orders_tbl o
              JOIN food_items_tbl f ON o.food_item_id = f.food_items_id
              JOIN category_tbl c ON f.category_id = c.category_id
              WHERE o.restaurant_id = ? AND o.order_status = 'complete' 
                    AND o.steward_confirmation = 'confirmed' AND o.steward_served = 'pending'
              ORDER BY o.table_number, o.order_id";
$stmtServed = $conn->prepare($sqlServed);
$stmtServed->bind_param("i", $restaurant_id);
$stmtServed->execute();
$resultServed = $stmtServed->get_result();

$serve_ready_orders = [];
$ready_to_serve_count = 0;
while ($row = $resultServed->fetch_assoc()) {
    $serve_ready_orders[$row['table_number']][] = $row;
    $ready_to_serve_count++; // Count each individual order
}
$stmtServed->close();

// === Retrieve Orders Awaiting Confirmation ===
$sql = "SELECT o.order_id, o.table_number, f.food_items_name, c.category_name, o.quantity, o.order_date, o.payment_method, o.customer_name, o.customer_number, o.total_price
        FROM orders_tbl o
        JOIN food_items_tbl f ON o.food_item_id = f.food_items_id
        JOIN category_tbl c ON f.category_id = c.category_id
        WHERE o.steward_confirmation = 'pending' AND o.restaurant_id = ?
        ORDER BY o.table_number, o.order_id";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();

$orders_by_table = [];
$awaiting_confirmation_count = 0;
while ($row = $result->fetch_assoc()) {
    $orders_by_table[$row['table_number']][] = $row;
    $awaiting_confirmation_count++; // Count each individual order
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Steward Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <style>
    .card {
        margin-bottom: 1rem;
    }

    .badge-count {
        position: relative;
        top: -2px;
        margin-left: 5px;
    }

    .nav-tabs .nav-link.active {
        font-weight: bold;
    }

    .tab-content {
        padding: 20px 0;
    }
    </style>
</head>

<body>
    <div class="container mt-5">
        <h2 class="text-center">Steward Dashboard</h2>

        <!-- Filter -->
        <div class="row mb-3">
            <div class="col-md-4">
                <input type="text" id="tableFilter" class="form-control" placeholder="Filter by Table Number">
            </div>
        </div>

        <!-- Tabs -->
        <ul class="nav nav-tabs" id="ordersTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="confirm-tab" data-bs-toggle="tab" data-bs-target="#confirm"
                    type="button" role="tab">
                    Awaiting Confirmation <span
                        class="badge bg-warning text-dark badge-count"><?= $awaiting_confirmation_count ?></span>
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="serve-tab" data-bs-toggle="tab" data-bs-target="#serve" type="button"
                    role="tab">
                    Ready to Serve <span
                        class="badge bg-success text-white badge-count"><?= $ready_to_serve_count ?></span>
                </button>
            </li>
        </ul>

        <div class="tab-content" id="ordersTabContent">
            <!-- === Tab: Orders to Confirm === -->
            <div class="tab-pane fade show active" id="confirm" role="tabpanel">
                <div class="row" id="ordersContainer">
                    <?php if (empty($orders_by_table)): ?>
                    <div class="col-12">
                        <div class="alert alert-info">No orders awaiting confirmation</div>
                    </div>
                    <?php else: ?>
                    <?php foreach ($orders_by_table as $table_number => $orders): ?>
                    <div class="col-md-6 order-card" data-table-number="<?= htmlspecialchars($table_number) ?>">
                        <div class="card">
                            <div class="card-header bg-warning">
                                Table: <?= htmlspecialchars($table_number) ?>
                            </div>
                            <div class="card-body">
                                <?php foreach ($orders as $order): ?>
                                <h5 class="card-title"><?= htmlspecialchars($order['food_items_name']) ?></h5>
                                <p><strong>Category:</strong> <?= htmlspecialchars($order['category_name']) ?></p>
                                <p>Quantity: <?= htmlspecialchars($order['quantity']) ?></p>
                                <p>Payment: <?= htmlspecialchars($order['payment_method']) ?></p>
                                <p>Customer: <?= htmlspecialchars($order['customer_name']) ?>
                                    (<?= htmlspecialchars($order['customer_number']) ?>)</p>
                                <p>Total: <?= htmlspecialchars($order['total_price']) ?></p>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-success"
                                        onclick="confirmOrder(<?= $order['order_id'] ?>)">Confirm</button>
                                    <button class="btn btn-danger"
                                        onclick="rejectOrder(<?= $order['order_id'] ?>)">Reject</button>
                                </div>
                                <hr>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>

            <!-- === Tab: Orders to Serve === -->
            <div class="tab-pane fade" id="serve" role="tabpanel">
                <div class="row">
                    <?php if (empty($serve_ready_orders)): ?>
                    <div class="col-12">
                        <div class="alert alert-info">No orders ready to serve</div>
                    </div>
                    <?php else: ?>
                    <?php foreach ($serve_ready_orders as $table_number => $orders): ?>
                    <div class="col-md-6 order-card" data-table-number="<?= htmlspecialchars($table_number) ?>">
                        <div class="card">
                            <div class="card-header bg-success text-white">
                                Table: <?= htmlspecialchars($table_number) ?>
                            </div>
                            <div class="card-body">
                                <?php foreach ($orders as $order): ?>
                                <h5 class="card-title"><?= htmlspecialchars($order['food_items_name']) ?></h5>
                                <p><strong>Category:</strong> <?= htmlspecialchars($order['category_name']) ?></p>
                                <p>Quantity: <?= htmlspecialchars($order['quantity']) ?></p>
                                <p>Order Date: <?= htmlspecialchars($order['order_date']) ?></p>
                                <p>Customer: <?= htmlspecialchars($order['customer_name']) ?></p>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary" onclick="serveOrder(<?= $order['order_id'] ?>)">Mark
                                        as
                                        Served</button>
                                </div>
                                <hr>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- JS for interaction -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script>
    $('#tableFilter').on('keyup', function() {
        var val = $(this).val().toLowerCase();
        var activeTab = $('.tab-pane.active');
        $('.order-card', activeTab).filter(function() {
            $(this).toggle($(this).data('table-number').toString().toLowerCase().includes(val));
        });
    });

    function confirmOrder(orderId) {
        Swal.fire({
            title: 'Confirm Order',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                updateStatus(orderId, 'confirmed');
            }
        });
    }

    function rejectOrder(orderId) {
        Swal.fire({
            title: 'Reject Order',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes'
        }).then((result) => {
            if (result.isConfirmed) {
                updateStatus(orderId, 'rejected');
            }
        });
    }

    function serveOrder(orderId) {
        Swal.fire({
            title: 'Mark as Served',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, served'
        }).then((result) => {
            if (result.isConfirmed) {
                updateStatus(orderId, 'served');
            }
        });
    }

    function updateStatus(orderId, status) {
        $.ajax({
            url: 'update_order_status.php',
            type: 'GET',
            data: {
                order_id: orderId,
                status: status
            },
            success: function() {
                Swal.fire({
                    icon: 'success',
                    title: 'Updated',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    location.reload();
                });
            },
            error: function() {
                Swal.fire({
                    icon: 'error',
                    title: 'Error updating order.'
                });
            }
        });
    }

    // Real-time notification polling
    let lastCheckTimestamp = Math.floor(Date.now() / 1000);
    let notificationAudio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');

    function pollNewOrders() {
        fetch('../backend/get_new_orders.php?last_check=' + lastCheckTimestamp)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    lastCheckTimestamp = data.current_timestamp;
                    
                    if (data.orders.length > 0) {
                        // Show notification for each new order
                        data.orders.forEach(order => {
                            showOrderNotification(order);
                        });
                        
                        // Reload orders list to update UI
                        reloadOrdersTable();
                        
                        // Play notification sound
                        try {
                            notificationAudio.play();
                        } catch (e) {
                            console.log('Could not play notification sound');
                        }
                    }
                }
            })
            .catch(error => console.error('Error polling orders:', error));
    }

    function showOrderNotification(order) {
        Swal.fire({
            icon: 'success',
            title: 'New Order!',
            html: `<strong>Table ${order.table_number}</strong><br>
                   ${order.food_items_name} x${order.quantity}<br>
                   <small>${order.customer_name}</small>`,
            timer: 5000,
            timerProgressBar: true,
            position: 'center',
            showConfirmButton: false,
            didOpen: (modal) => {
                modal.style.zIndex = '99999';
            }
        });
    }

    function reloadOrdersTable() {
        location.reload();
    }

    // Poll for new orders every 3 seconds
    setInterval(pollNewOrders, 3000);

    // Initial poll
    pollNewOrders();
    </script>
</body>

</html>

<?php
$stmt->close();
$conn->close();
?>