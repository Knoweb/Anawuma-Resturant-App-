<?php
session_start();

// Redirect users to login if not authenticated
if (!isset($_SESSION['room_number']) || !isset($_SESSION['restaurant_id'])) {
    header('Location: ../login.php');
    exit();
}

// Include database connection
include_once '../db.php';

// Check if request ID is provided
if (isset($_POST['request_id'])) {
    $request_id = intval($_POST['request_id']);
    $room_number = $_SESSION['room_number'];
    $restaurant_id = $_SESSION['restaurant_id'];

    // Delete the request from the housekeeping table
    $stmt = $conn->prepare("DELETE FROM housekeeping_tbl WHERE id = ? AND room_number = ? AND restaurant_id = ?");
    $stmt->bind_param("iii", $request_id, $room_number, $restaurant_id);

    if ($stmt->execute()) {
        $_SESSION['message'] = "Request canceled successfully!";
    } else {
        $_SESSION['message'] = "Failed to cancel the request.";
    }

    $stmt->close();
} else {
    $_SESSION['message'] = "Invalid request.";
}

$conn->close();

// Redirect back to the housekeeping requests page
header('Location: requests.php');
exit();
