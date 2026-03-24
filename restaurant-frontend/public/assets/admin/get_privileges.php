<?php
session_start();

if (!isset($_SESSION['admin_id']) || !isset($_SESSION['restaurant_id'])) {
    // Redirect to login page if not logged in
    header("Location: login.php");
    exit;
}

if (isset($_SESSION['privileges'])) {
    echo json_encode(['privileges' => $_SESSION['privileges']]);
} else {
    echo json_encode(['privileges' => []]);
}
