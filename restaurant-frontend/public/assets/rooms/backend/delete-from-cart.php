<?php
session_start();

// Ensure you have included the database connection
include_once '../../db.php';

if (isset($_POST['room_number'], $_POST['food_item_id'])) {
    $room_number = $_POST['room_number'];
    $food_item_id = $_POST['food_item_id'];
    $session_id = session_id(); // Retrieve the current session ID

    $sql_delete = "DELETE FROM room_cart_tbl WHERE room_number = ? AND food_item_id = ? AND session_id = ?";
    $stmt_delete = $conn->prepare($sql_delete);
    if ($stmt_delete) {
        $stmt_delete->bind_param("iis", $room_number, $food_item_id, $session_id);
        $stmt_delete->execute();
        $stmt_delete->close();

        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to prepare the SQL statement']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Missing parameters for remove_from_cart']);
}
exit();
