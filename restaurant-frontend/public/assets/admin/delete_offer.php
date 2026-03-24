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

// Get the offer ID from the URL
$offer_id = $_GET['id'];

// Fetch the image path and restaurant ID from the database before deletion
$sql = "SELECT image_path, restaurant_id FROM special_offers_tbl WHERE offer_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $offer_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $offer = $result->fetch_assoc();
    $image_path = $offer['image_path'];
    $offer_restaurant_id = $offer['restaurant_id']; // Get the restaurant ID associated with the offer

    // Check if the offer belongs to the logged-in restaurant
    if ($offer_restaurant_id != $restaurant_id) {
        echo json_encode(["success" => false, "message" => "You do not have permission to delete this offer."]);
        exit;
    }

    // Delete the offer from the database
    $delete_sql = "DELETE FROM special_offers_tbl WHERE offer_id = ?";
    $delete_stmt = $conn->prepare($delete_sql);
    $delete_stmt->bind_param("i", $offer_id);
    if ($delete_stmt->execute()) {
        // Delete the image file from the server
        if (file_exists($image_path)) {
            unlink($image_path);
        }
        // Return success message as JSON
        echo json_encode(["success" => true, "message" => "Offer deleted successfully."]);
    } else {
        // Return error message
        echo json_encode(["success" => false, "message" => "Failed to delete the offer."]);
    }
} else {
    // Return error if the offer was not found
    echo json_encode(["success" => false, "message" => "Offer not found."]);
}

$stmt->close();
$delete_stmt->close();
$conn->close();
