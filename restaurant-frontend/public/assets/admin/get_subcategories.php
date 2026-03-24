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

$restaurant_id = $_SESSION['restaurant_id'];

// Include database connection
include_once '../db.php';

// Check if category ID is provided
if (isset($_GET['category_id'])) {
    $category_id = intval($_GET['category_id']);

    // Query to fetch subcategories for the specified category and restaurant
    $sql = "SELECT subcategory_id, subcategory_name FROM subcategory_tbl WHERE parent_category_id = ? AND restaurant_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $category_id, $restaurant_id);
    $stmt->execute();
    $result = $stmt->get_result();

    $subcategories = array();
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $subcategories[] = $row;
        }
    }

    // Return subcategories as JSON
    header('Content-Type: application/json');
    echo json_encode($subcategories);
}

$conn->close();
