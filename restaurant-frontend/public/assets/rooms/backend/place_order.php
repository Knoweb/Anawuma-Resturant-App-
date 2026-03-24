<?php
session_start();

// Check if all required POST parameters are set
if (!isset($_POST['customer_name'], $_SESSION['room_number'], $_SESSION['restaurant_id'])) {
    echo json_encode(["status" => "error", "message" => "Missing parameters for place_order"]);
    exit();
}

// Retrieve and sanitize form inputs
$customer_name = filter_var(trim($_POST['customer_name']), FILTER_SANITIZE_STRING);
$room_number = filter_var(trim($_SESSION['room_number']), FILTER_SANITIZE_STRING);
$restaurant_id = filter_var(trim($_SESSION['restaurant_id']), FILTER_SANITIZE_NUMBER_INT);
$note = isset($_POST['note']) ? filter_var(trim($_POST['note']), FILTER_SANITIZE_STRING) : null; // Sanitize the note

// Include database connection
include_once '../../db.php';

// Check if the database connection is established
if ($conn->connect_error) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit();
}

// Additional code to fetch items from the cart
$sql = "SELECT food_item_id, quantity FROM room_cart_tbl WHERE room_number = ? AND restaurant_id = ?";
$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["status" => "error", "message" => "Database query preparation failed"]);
    exit();
}
$stmt->bind_param('si', $room_number, $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["status" => "error", "message" => "No items in the cart"]);
    exit();
}

// Get the session ID
$session_id = session_id();

// Insert order into orders_tbl
while ($row = $result->fetch_assoc()) {
    $food_item_id = $row['food_item_id'];
    $quantity = $row['quantity'];

    // Get the unit price of the food item
    $sql2 = "SELECT price FROM food_items_tbl WHERE food_items_id = ?";
    $stmt2 = $conn->prepare($sql2);
    if (!$stmt2) {
        echo json_encode(["status" => "error", "message" => "Database query preparation failed"]);
        exit();
    }
    $stmt2->bind_param("i", $food_item_id);
    $stmt2->execute();
    $result2 = $stmt2->get_result();
    $unit_price = $result2->fetch_assoc()['price'];

    // Calculate the total price
    $total = $unit_price * $quantity;

    // Insert the order details into orders_tbl
    $order_sql = "INSERT INTO room_orders_tbl (room_number, food_item_id, quantity, order_date, customer_name, order_status, session_id, total_price, restaurant_id, note) VALUES (?, ?, ?, NOW(), ?, 'pending', ?, ?, ?, ?)";
    $order_stmt = $conn->prepare($order_sql);
    if (!$order_stmt) {
        echo json_encode(["status" => "error", "message" => "Database query preparation failed"]);
        exit();
    }
    $order_stmt->bind_param('siissdis', $room_number, $food_item_id, $quantity, $customer_name, $session_id, $total, $restaurant_id, $note); // Added note as the last parameter
    $order_stmt->execute();
    $order_stmt->close(); // Close each statement after use
    $stmt2->close(); // Close the prepared statement for the price query
}

// Clean up room_cart_tbl for the table number and restaurant ID
$cleanup_sql = "DELETE FROM room_cart_tbl WHERE room_number = ? AND restaurant_id = ?";
$cleanup_stmt = $conn->prepare($cleanup_sql);
if (!$cleanup_stmt) {
    echo json_encode(["status" => "error", "message" => "Database query preparation failed"]);
    exit();
}
$cleanup_stmt->bind_param('si', $room_number, $restaurant_id);
$cleanup_stmt->execute();

echo json_encode(["status" => "success", "message" => "Order placed successfully"]);

// Close all statements and the database connection
$stmt->close();
$cleanup_stmt->close();
$conn->close();
