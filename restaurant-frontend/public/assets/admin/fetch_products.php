<?php
// Start the session
session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the Special Offers privilege
if (!in_array('Special Offers', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}
include_once "../db.php"; // Database connection
// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Check if the request for products was made
if (isset($_GET['type'])) {
    // Get the product type from the request
    $product_type = htmlspecialchars(trim($_GET['type']));


    // Prepare the SQL query based on product type with filtering for restaurant ID
    switch ($product_type) {
        case 'menu':
            $sql = "SELECT menu_id AS id, menu_name AS name FROM menu_tbl WHERE restaurant_id = ?";
            break;
        case 'category':
            $sql = "SELECT category_id AS id, category_name AS name FROM category_tbl WHERE restaurant_id = ?";
            break;
        case 'item':
            $sql = "SELECT food_items_id AS id, food_items_name AS name FROM food_items_tbl WHERE restaurant_id = ?";
            break;
        default:
            echo json_encode([]); // Return an empty array if no valid type provided
            exit();
    }

    // Use prepared statements for fetching products as well
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $restaurant_id); // Bind the restaurant ID
    $stmt->execute();
    $result = $stmt->get_result();
    $products = [];

    // Fetch the products
    while ($row = $result->fetch_assoc()) {
        $products[] = $row; // Add each product to the array
    }

    // Return the products as JSON
    header('Content-Type: application/json');
    echo json_encode($products);
    $stmt->close();
    mysqli_close($conn);
    exit(); // Exit after returning JSON to prevent further execution
}
