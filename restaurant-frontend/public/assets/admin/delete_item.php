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

// Include database connection
include_once '../db.php';

// Get the restaurant_id from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Check if food item ID is provided in the URL and if it's a valid integer
if (isset($_GET['food_items_id']) && is_numeric($_GET['food_items_id'])) {
    // Sanitize the input
    $food_items_id = intval($_GET['food_items_id']);

    // Fetch the food item details, including image paths, and check restaurant_id
    $sql = "SELECT image_url_1, image_url_2, image_url_3, image_url_4 FROM food_items_tbl WHERE food_items_id = ? AND restaurant_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $food_items_id, $restaurant_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();

        // Delete the food item from the database
        $sql_delete = "DELETE FROM food_items_tbl WHERE food_items_id = ?";
        $stmt_delete = $conn->prepare($sql_delete);
        $stmt_delete->bind_param("i", $food_items_id);
        $stmt_delete->execute();

        // Check if deletion was successful
        if ($stmt_delete->affected_rows > 0) {
            // Remove image files from the server
            $images = ['image_url_1', 'image_url_2', 'image_url_3', 'image_url_4'];
            foreach ($images as $image) {
                $filePath = $row[$image];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }

            // Success message with SweetAlert
            echo "<script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>
                <script>
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Food item has been deleted successfully.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'index.php'; // Redirect to index page
                });
                </script>";
        } else {
            // Failed to delete
            echo "<script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>
                <script>
                Swal.fire({
                    icon: 'error',
                    title: 'Failed!',
                    text: 'Failed to delete food item.',
                    timer: 1500,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'index.php'; // Redirect to index page
                });
                </script>";
        }

        $stmt_delete->close();
    } else {
        // Food item not found or doesn't belong to the restaurant
        echo "<script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>
            <script>
            Swal.fire({
                icon: 'error',
                title: 'Not Found!',
                text: 'Food item not found or access denied.',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'index.php'; // Redirect to index page
            });
            </script>";
    }
    $stmt->close();
} else {
    // Invalid ID
    echo "<script src='https://cdn.jsdelivr.net/npm/sweetalert2@11'></script>
        <script>
        Swal.fire({
            icon: 'error',
            title: 'Error!',
            text: 'Invalid food item ID.',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            window.location.href = 'index.php'; // Redirect to index page
        });
        </script>";
}

// Close the database connection
$conn->close();
