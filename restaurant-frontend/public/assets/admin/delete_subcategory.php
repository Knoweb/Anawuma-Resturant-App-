<?php
session_start();

// Check if the admin is logged in
if (!isset($_SESSION['admin_id'])) {
    // Redirect to login page if not logged in
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the Housekeeping privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}


// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include database connection
include_once '../db.php';

// Get the restaurant_id from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Handle delete action via AJAX
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['id'])) {
    header('Content-Type: application/json'); // Ensure the response is JSON
    $subcategory_id = intval($_POST['id']);

    // Fetch the subcategory details to ensure it belongs to the admin's restaurant
    $sql = "SELECT subcategory_id FROM subcategory_tbl WHERE subcategory_id = ? AND restaurant_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $subcategory_id, $restaurant_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Subcategory exists and belongs to the restaurant, proceed with deletion
        $sql_delete = "DELETE FROM subcategory_tbl WHERE subcategory_id = ?";
        $stmt_delete = $conn->prepare($sql_delete);
        if ($stmt_delete) {
            $stmt_delete->bind_param("i", $subcategory_id);
            if ($stmt_delete->execute()) {
                echo json_encode(['status' => 'success', 'message' => 'Subcategory has been deleted.']);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Error deleting subcategory.']);
            }
            $stmt_delete->close();
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Error preparing delete statement.']);
        }
    } else {
        // Subcategory does not exist or does not belong to the restaurant
        echo json_encode(['status' => 'error', 'message' => 'Subcategory not found or access denied.']);
    }
    $stmt->close();
    exit;
}
