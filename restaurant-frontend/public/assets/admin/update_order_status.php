<?php
session_start();

// Check authentication
if (!isset($_SESSION['admin_id']) || !isset($_SESSION['restaurant_id'])) {
    header("Location: login.php");
    exit;
}

// Check privileges
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];
include_once '../db.php';

// Check if required parameters exist
if (isset($_GET['order_id']) && isset($_GET['status'])) {
    $order_id = intval($_GET['order_id']);
    $status = $_GET['status'];

    // Validate status
    if (!in_array($status, ['confirmed', 'rejected', 'served'])) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid status']);
        exit;
    }

    try {
        // Handle different status updates
        if ($status === 'confirmed') {
            $sql = "UPDATE orders_tbl 
                    SET steward_confirmation = 'confirmed' 
                    WHERE order_id = ? AND restaurant_id = ?";
        } 
        elseif ($status === 'rejected') {
            $sql = "DELETE FROM orders_tbl 
                    WHERE order_id = ? AND restaurant_id = ?";
        }
        elseif ($status === 'served') {
            $sql = "UPDATE orders_tbl 
                    SET steward_served = 'served' 
                    WHERE order_id = ? AND restaurant_id = ?";
        }

        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            throw new Exception("Database query preparation failed: " . $conn->error);
        }

        $stmt->bind_param("ii", $order_id, $restaurant_id);
        
        if ($stmt->execute()) {
            if ($status === 'rejected' && $stmt->affected_rows === 0) {
                echo json_encode(['status' => 'error', 'message' => 'Order not found or already deleted']);
            } else {
                echo json_encode(['status' => 'success']);
            }
        } else {
            throw new Exception("Database query execution failed: " . $stmt->error);
        }

        $stmt->close();
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Missing parameters']);
}

$conn->close();
?>