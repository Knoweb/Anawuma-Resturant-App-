<?php

session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the QR Menu System privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];

include_once "../db.php";
include_once "../db_report_sync.php";

// Enable error reporting for debugging (suppress display during AJAX requests)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors directly, return in JSON
ini_set('log_errors', 1);

// Set default error handler to catch all errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    global $response;
    if (isset($response) && is_array($response)) {
        $response['success'] = false;
        $response['message'] = "Error: " . $errstr;
    }
    error_log("$errstr in $errfile on line $errline");
});

// Fetch all food items to avoid multiple queries
$food_items = [];
$food_item_query = "SELECT food_items_id, food_items_name FROM food_items_tbl";
$result_food_items = mysqli_query($conn, $food_item_query);

if (!$result_food_items) {
    // Log error but don't echo HTML during AJAX requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo '<div class="alert alert-danger">Error fetching food items: ' . mysqli_error($conn) . '</div>';
    } else {
        error_log("Error fetching food items: " . mysqli_error($conn));
    }
} else {
    while ($food_item = mysqli_fetch_assoc($result_food_items)) {
        $food_items[$food_item['food_items_id']] = $food_item['food_items_name'];
    }
}

// Fetch orders from orders_tbl with category information
$sql_orders = "SELECT o.*, f.food_items_name, c.category_name 
               FROM orders_tbl o
               JOIN food_items_tbl f ON o.food_item_id = f.food_items_id
               JOIN category_tbl c ON f.category_id = c.category_id
               WHERE o.completed = 0 AND o.restaurant_id = '$restaurant_id' AND o.steward_confirmation = 'confirmed'";
$result_orders = mysqli_query($conn, $sql_orders);
if (!$result_orders) {
    // Log error but don't echo HTML during AJAX requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo '<div class="alert alert-danger">Error fetching orders: ' . mysqli_error($conn) . '</div>';
    } else {
        error_log("Error fetching orders: " . mysqli_error($conn));
    }
}

// Fetch room orders from room_orders_tbl with category information
$sql_room_orders = "SELECT ro.*, f.food_items_name, c.category_name 
                    FROM room_orders_tbl ro
                    JOIN food_items_tbl f ON ro.food_item_id = f.food_items_id
                    JOIN category_tbl c ON f.category_id = c.category_id
                    WHERE ro.completed = 0 AND ro.restaurant_id = '$restaurant_id'";
$result_room_orders = mysqli_query($conn, $sql_room_orders);
if (!$result_room_orders) {
    // Log error but don't echo HTML during AJAX requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        echo '<div class="alert alert-danger">Error fetching room orders: ' . mysqli_error($conn) . '</div>';
    } else {
        error_log("Error fetching room orders: " . mysqli_error($conn));
    }
}

// Process order updates
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Start output buffering to catch any stray output
    ob_start();
    
    // Set JSON content type header
    header('Content-Type: application/json; charset=utf-8');
    
    $response = ['success' => false, 'message' => ''];

    try {
        // Update orders_tbl
        if (isset($_POST['order_id']) && isset($_POST['order_status'])) {
            $order_id = intval($_POST['order_id']);
            $order_status = mysqli_real_escape_string($conn, $_POST['order_status']);

            // Update the order in the database
            $update_query = "UPDATE orders_tbl SET order_status = '$order_status' WHERE order_id = $order_id AND restaurant_id = '$restaurant_id'";
            if (mysqli_query($conn, $update_query)) {
                $response['success'] = true;
                $response['message'] = "Order updated successfully!";
            } else {
                $response['message'] = "Failed to update order: " . mysqli_error($conn);
            }
        }

        // Update room_orders_tbl
        if (isset($_POST['room_order_id']) && isset($_POST['order_status'])) {
            $room_order_id = intval($_POST['room_order_id']);
            $order_status = mysqli_real_escape_string($conn, $_POST['order_status']);

            // Update the room order in the database
            $update_query = "UPDATE room_orders_tbl SET order_status = '$order_status' WHERE room_order_id = $room_order_id AND restaurant_id = '$restaurant_id'";
            if (mysqli_query($conn, $update_query)) {
                $response['success'] = true;
                $response['message'] = "Room order updated successfully!";
            } else {
                $response['message'] = "Failed to update room order: " . mysqli_error($conn);
            }
        }

        // Mark the order as completed in orders_tbl
        if (isset($_POST['complete_order']) && isset($_POST['order_id'])) {
            $order_id = intval($_POST['order_id']);

            // Complete the order
            $complete_query = "UPDATE orders_tbl SET order_status = 'complete', completed = 1 WHERE order_id = $order_id AND restaurant_id = '$restaurant_id'";
            if (mysqli_query($conn, $complete_query)) {
                // Add the completed order to reports
                if (function_exists('addOrderToReport')) {
                    $report_result = addOrderToReport($conn, $order_id, $restaurant_id, '', false);
                    error_log("addOrderToReport result: " . print_r($report_result, true));
                } else {
                    error_log("addOrderToReport function not found");
                    throw new Exception("addOrderToReport function not found");
                }
                
                $response['success'] = true;
                $response['message'] = "Order completed successfully!";
            } else {
                $response['message'] = "Failed to complete order: " . mysqli_error($conn);
            }
        }

        // Mark the room order as completed in room_orders_tbl
        if (isset($_POST['complete_order']) && isset($_POST['room_order_id'])) {
            $room_order_id = intval($_POST['room_order_id']);

            // Complete the room order
            $complete_query = "UPDATE room_orders_tbl SET order_status = 'complete', completed = 1 WHERE room_order_id = $room_order_id AND restaurant_id = '$restaurant_id'";
            if (mysqli_query($conn, $complete_query)) {
                // Add the completed room order to reports
                if (function_exists('addOrderToReport')) {
                    $report_result = addOrderToReport($conn, $room_order_id, $restaurant_id, '', true);
                    error_log("addOrderToReport result: " . print_r($report_result, true));
                } else {
                    error_log("addOrderToReport function not found");
                    throw new Exception("addOrderToReport function not found");
                }
                
                $response['success'] = true;
                $response['message'] = "Room order completed successfully!";
            } else {
                $response['message'] = "Failed to complete room order: " . mysqli_error($conn);
            }
        }
    } catch (Exception $e) {
        // Log the exception
        error_log("Exception in admin_kitchen POST handler: " . $e->getMessage());
        error_log("Stack trace: " . $e->getTraceAsString());
        
        $response['success'] = false;
        $response['message'] = "Error: " . $e->getMessage();
    } catch (Throwable $t) {
        // Catch any other errors (PHP 7+)
        error_log("Error in admin_kitchen POST handler: " . $t->getMessage());
        error_log("Stack trace: " . $t->getTraceAsString());
        
        $response['success'] = false;
        $response['message'] = "Error: " . $t->getMessage();
    }

    // Clean any buffered output
    ob_end_clean();
    
    // Return the response in JSON format
    echo json_encode($response);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kitchen Dashboard</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@10.16.0/dist/sweetalert2.min.css">

    <style>
    button {
        padding: 8px 16px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    button:hover {
        background-color: #45a049;
    }

    /* Back button styling */
    .back-button {
        margin-bottom: 20px;
        background-color: #555;
    }

    .back-button:hover {
        background-color: #444;
    }
    </style>
</head>

<body>


    <div class="container mt-5" id="orders-container">
        <button class="back-button" onclick="history.back();">Back</button>
        <h2>Table Orders</h2>
        <?php if (mysqli_num_rows($result_orders) > 0): ?>
        <div class="row">
            <?php while ($row = mysqli_fetch_assoc($result_orders)): ?>
            <div class="col-md-4">
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Order for Table <?= htmlspecialchars($row['table_number'] ?? ''); ?></h5>
                        <p class="card-text"><strong>Customer Name:</strong>
                            <?= htmlspecialchars($row['customer_name'] ?? ''); ?></p>
                        <p class="card-text"><strong>Customer Number:</strong>
                            <?= htmlspecialchars($row['customer_number'] ?? ''); ?></p>
                        <p class="card-text"><strong>Food Item:</strong> <?= htmlspecialchars($row['food_items_name'] ?? ''); ?>
                        </p>
                        <p class="card-text"><strong>Category:</strong> <?= htmlspecialchars($row['category_name'] ?? ''); ?>
                        </p>
                        <p class="card-text"><strong>Quantity:</strong> <?= htmlspecialchars($row['quantity'] ?? ''); ?>
                        </p>
                        <p class="card-text"><strong>Order Date:</strong>
                            <?= htmlspecialchars($row['order_date'] ?? ''); ?></p>
                        <p class="card-text"><strong>Total Price:</strong>
                            <?= htmlspecialchars($row['total_price'] ?? ''); ?></p>
                        <p class="card-text"><strong>Note:</strong> <?= htmlspecialchars($row['note'] ?? ''); ?></p>
                        <form method="post" class="d-inline update-order-form">
                            <p class="card-text"><strong>Order Status:</strong>
                                <?= htmlspecialchars($row['order_status'] ?? ''); ?></p>
                            <input type="hidden" name="order_id" value="<?= $row['order_id']; ?>">
                            <select name="order_status" class="custom-select d-inline" style="width: auto;">
                                <option value="pending" <?= ($row['order_status'] == 'pending' ? 'selected' : ''); ?>>
                                    Pending</option>
                                <option value="processing"
                                    <?= ($row['order_status'] == 'processing' ? 'selected' : ''); ?>>Processing</option>
                                <option value="complete" <?= ($row['order_status'] == 'complete' ? 'selected' : ''); ?>>
                                    Complete</option>
                            </select>
                            <button type="submit" class="btn btn-primary">Update</button>
                        </form>
                        <form method="post" class="d-inline complete-order-form">
                            <input type="hidden" name="order_id" value="<?= $row['order_id']; ?>">
                            <input type="hidden" name="complete_order" value="1">
   <button type="submit" class="btn btn-success" 
        <?= ($row['order_status'] != 'complete') ? 'disabled' : '' ?>>
        Complete
    </button>                        </form>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
        <?php else: ?>
        <div class="alert alert-warning">No orders found.</div>
        <?php endif; ?>

        <!-- Room Orders -->
        <h2>Room Orders</h2>
        <?php if (mysqli_num_rows($result_room_orders) > 0): ?>
        <div class="row">
            <?php while ($row = mysqli_fetch_assoc($result_room_orders)): ?>
            <div class="col-md-4">
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Room Order for Room <?= htmlspecialchars($row['room_number']); ?></h5>
                        <p class="card-text"><strong>Customer Name:</strong>
                            <?= htmlspecialchars($row['customer_name']); ?></p>
                        <p class="card-text"><strong>Food Item:</strong> <?= htmlspecialchars($row['food_items_name']); ?></p>
                        <p class="card-text"><strong>Category:</strong> <?= htmlspecialchars($row['category_name']); ?></p>
                        <p class="card-text"><strong>Quantity:</strong> <?= htmlspecialchars($row['quantity']); ?></p>
                        <p class="card-text"><strong>Order Date:</strong> <?= htmlspecialchars($row['order_date']); ?>
                        </p>
                        <p class="card-text"><strong>Total Price:</strong> <?= htmlspecialchars($row['total_price']); ?>
                        </p>
                        <p class="card-text"><strong>Note:</strong> <?= htmlspecialchars($row['note']); ?></p>
                        <form method="post" class="d-inline update-room-order-form">
                            <p class="card-text"><strong>Order Status:</strong>
                                <?= htmlspecialchars($row['order_status']); ?></p>
                            <input type="hidden" name="room_order_id"
                                value="<?= htmlspecialchars($row['room_order_id']); ?>">
                            <select name="order_status" class="custom-select d-inline" style="width: auto;">
                                <option value="pending" <?= ($row['order_status'] == 'pending' ? 'selected' : ''); ?>>
                                    Pending</option>
                                <option value="processing"
                                    <?= ($row['order_status'] == 'processing' ? 'selected' : ''); ?>>Processing</option>
                                <option value="complete" <?= ($row['order_status'] == 'complete' ? 'selected' : ''); ?>>
                                    Complete</option>
                            </select>
                            <button type="submit" class="btn btn-primary">Update</button>
                        </form>
                        <form method="post" class="d-inline complete-room-order-form">
                            <input type="hidden" name="room_order_id"
                                value="<?= htmlspecialchars($row['room_order_id']); ?>">
                            <input type="hidden" name="complete_order" value="1">
<button type="submit" class="btn btn-success" 
        <?= ($row['order_status'] != 'complete') ? 'disabled' : '' ?>>
        Complete
    </button>                        </form>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
        <?php else: ?>
        <div class="alert alert-warning">No room orders found.</div>
        <?php endif; ?>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@10.16.0/dist/sweetalert2.all.min.js"></script>
   <script>
$(document).ready(function() {
    $('form.update-order-form, form.update-room-order-form').on('submit', function(e) {
        e.preventDefault();

        const form = $(this);
        $.ajax({
            type: 'POST',
            url: '', // Current page URL
            data: form.serialize(),
            dataType: 'json',
            success: function(response) {
                try {
                    // Handle string response (in case it comes as string)
                    const res = typeof response === 'string' ? JSON.parse(response) : response;
                    
                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: res.message,
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: res.message,
                            showConfirmButton: false,
                            timer: 1500
                        });
                    }
                } catch (e) {
                    console.error('JSON Parse Error (Update):', e);
                    console.error('Response:', response);
                    Swal.fire({
                        icon: 'error',
                        title: 'Parse Error',
                        text: 'Failed to parse server response. Check console for details.',
                        showConfirmButton: true
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error (Update):', error);
                console.error('Response Text:', xhr.responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to process the request. Status: ' + xhr.status,
                    showConfirmButton: true
                });
            }
        });
    });

    $('form.complete-order-form, form.complete-room-order-form').on('submit', function(e) {
        e.preventDefault();

        const form = $(this);
        $.ajax({
            type: 'POST',
            url: '', // Current page URL
            data: form.serialize(),
            dataType: 'json',
            success: function(response) {
                try {
                    // Handle string response (in case it comes as string)
                    const res = typeof response === 'string' ? JSON.parse(response) : response;
                    
                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Completed',
                            text: res.message,
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: res.message,
                            showConfirmButton: false,
                            timer: 1500
                        });
                    }
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    console.error('Response:', response);
                    Swal.fire({
                        icon: 'error',
                        title: 'Parse Error',
                        text: 'Failed to parse server response. Check console for details.',
                        showConfirmButton: true
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', error);
                console.error('Response Text:', xhr.responseText);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Failed to process the request. Status: ' + xhr.status,
                    showConfirmButton: true
                });
            }
        });
    });
});

// Handle form submission response
$(document).ready(function() {
    $('form').on('submit', function(event) {
        event.preventDefault(); // Prevent default form submission

        const form = $(this);
        const url = form.attr('action');
        const data = form.serialize();

        $.post(url, data, function(response) {
            const res = JSON.parse(response);
            Swal.fire({
                icon: res.success ? 'success' : 'error',
                title: res.success ? 'Success' : 'Error',
                text: res.message,
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                location.reload();
            });
        });
    });
});

setInterval(function() {
    location.reload(); // This refreshes the page every 60 seconds
}, 60000); // 60000 milliseconds = 1 minute
</script>

</body>

</html>