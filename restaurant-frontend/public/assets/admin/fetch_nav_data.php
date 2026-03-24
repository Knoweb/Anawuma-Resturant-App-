<?php
session_start();
include_once "../db.php";

if (isset($_SESSION['restaurant_id'])) {
    $restaurant_id = $_SESSION['restaurant_id'];

    // Fetch pending housekeeping count
    $stmt_pending = $conn->prepare("SELECT COUNT(*) FROM housekeeping_tbl WHERE status = 'pending' AND restaurant_id = ?");
    $stmt_pending->bind_param('i', $restaurant_id);
    $stmt_pending->execute();
    $stmt_pending->bind_result($pending_count);
    $stmt_pending->fetch();
    $stmt_pending->close();

    // Fetch incomplete orders count
    $stmt_incomplete = $conn->prepare("
        SELECT 
            (SELECT COUNT(*) FROM orders_tbl WHERE completed = 0 AND restaurant_id = ? AND steward_confirmation = 'confirmed') +
            (SELECT COUNT(*) FROM room_orders_tbl WHERE completed = 0 AND restaurant_id = ?) AS total_incomplete
    ");
    $stmt_incomplete->bind_param('ii', $restaurant_id, $restaurant_id);
    $stmt_incomplete->execute();
    $stmt_incomplete->bind_result($total_incomplete_orders_count);
    $stmt_incomplete->fetch();
    $stmt_incomplete->close();

    // Fetch pending steward confirmation count
    $stmt_steward = $conn->prepare("SELECT COUNT(*) FROM orders_tbl WHERE steward_confirmation = 'pending' AND restaurant_id = ?");
    $stmt_steward->bind_param('i', $restaurant_id);
    $stmt_steward->execute();
    $stmt_steward->bind_result($pending_steward_confirmation_count);
    $stmt_steward->fetch();
    $stmt_steward->close();

    // Return counts as JSON
    echo json_encode([
        'pending_count' => $pending_count,
        'total_incomplete_orders_count' => $total_incomplete_orders_count,
        'pending_steward_confirmation_count' => $pending_steward_confirmation_count
    ]);
}
?>
