<?php
session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the Housekeeping privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

include_once '../db.php'; // Ensure this file contains your database connection

// Initialize success and error flags
$success = false;
$error = '';

// Check if the form was submitted via POST method
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Sanitize and validate inputs
    $menu_name = filter_input(INPUT_POST, 'menu_name', FILTER_SANITIZE_STRING);
    $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_STRING);

    // Validate description length (max 500 characters)
    if (strlen($description) > 500) {
        $error = "Description must be 500 characters or less";
        header("Location: add_menu.php?success=0&error=" . urlencode($error));
        exit;
    }

    // Check if a file was uploaded without errors
    if (isset($_FILES["image"]) && $_FILES["image"]["error"] == 0) {
        // Define allowed file types and their MIME types
        $allowed = ["jpg" => "image/jpeg", "jpeg" => "image/jpeg", "png" => "image/png"];
        $file_name = $_FILES["image"]["name"];
        $file_type = $_FILES["image"]["type"];
        $file_size = $_FILES["image"]["size"];

        // Verify file extension
        $ext = pathinfo($file_name, PATHINFO_EXTENSION);
        if (!array_key_exists($ext, $allowed)) {
            $error = "Error: Please select a valid file format.";
        }

        // Verify file type
        if (in_array($file_type, $allowed)) {
            // Verify file size - 5MB maximum
            $maxsize = 5 * 1024 * 1024;
            if ($file_size > $maxsize) {
                $error = "Error: File size is larger than the allowed limit.";
            }

            // Define new image directory
            $new_directory = '../assets/imgs/menu-img/';
            if (!file_exists($new_directory)) {
                mkdir($new_directory, 0777, true); // Create the directory if it does not exist
            }

            // Generate a new file name with restaurant ID prepended
            $new_file_name = $restaurant_id . "_" . time() . "." . $ext;

            // Check whether file exists before uploading it
            if (file_exists($new_directory . $new_file_name)) {
                $error = "Error: File already exists.";
            } else {
                // Define the image URL and move the uploaded file to the specified directory
                $image_url = 'assets/imgs/menu-img/' . basename($new_file_name);
                if (move_uploaded_file($_FILES["image"]["tmp_name"], $new_directory . $new_file_name)) {
                    // Prepare an SQL statement to insert menu data into the database
                    $stmt = $conn->prepare("INSERT INTO menu_tbl (menu_name, description, image_url, restaurant_id) VALUES (?, ?, ?, ?)");
                    $stmt->bind_param("ssss", $menu_name, $description, $image_url, $restaurant_id); // Bind the parameters

                    // Execute the statement and check if it was successful
                    if ($stmt->execute()) {
                        $success = true;
                    } else {
                        $error = "Error: " . $stmt->error;
                    }
                    $stmt->close(); // Close the statement
                } else {
                    $error = "Error: There was a problem uploading your file. Please try again.";
                }
            }
        } else {
            $error = "Error: There was a problem with your upload. Please try again.";
        }
    } else {
        $error = "Error: " . $_FILES["image"]["error"];
    }

    // Close the database connection
    $conn->close();

    // Redirect with success or error flag
    header("Location: add_menu.php?success=" . (int)$success . "&error=" . urlencode($error));
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Menu</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        .char-limit-warning {
            color: red;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container mt-5">
        <h2>Add Menu</h2>
        <!-- Form to add a new menu -->
        <form action="add_menu.php" method="post" enctype="multipart/form-data" class="mt-4">
            <div class="mb-3">
                <label for="menu_name" class="form-label">Menu Name</label>
                <input type="text" id="menu_name" name="menu_name" class="form-control" placeholder="Menu Name" required>
            </div>

            <div class="mb-3">
                <label for="description" class="form-label">Description <span id="char-count" class="badge bg-secondary">500</span></label>
                <input type="text" id="description" name="description" class="form-control" 
                       placeholder="Description" maxlength="500" oninput="updateCharCount()">
                <small class="text-muted">Maximum 500 characters allowed</small>
            </div>

            <div class="mb-3">
                <label for="image" class="form-label">Image</label>
                <input type="file" id="image" name="image" class="form-control" required>
                <small class="text-muted">Maximum file size: 5MB (JPEG, PNG only)</small>
            </div>

            <button type="submit" class="btn btn-primary">Add Menu</button>
            <a href="index.php" class="btn btn-secondary">Cancel</a>
        </form>
    </div>

    <!-- Bootstrap JS and dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- SweetAlert2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script>
        function updateCharCount() {
            const description = document.getElementById('description');
            const charCount = document.getElementById('char-count');
            const remaining = 500 - description.value.length;
            
            charCount.textContent = remaining;
            
            if (remaining < 20) {
                charCount.classList.remove('bg-secondary');
                charCount.classList.add('bg-warning');
            } else {
                charCount.classList.remove('bg-warning');
                charCount.classList.add('bg-secondary');
            }
            
            if (remaining < 10) {
                charCount.classList.remove('bg-warning');
                charCount.classList.add('bg-danger');
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Initialize character counter
            updateCharCount();
            
            <?php if (isset($_GET['success']) && $_GET['success'] == 1) : ?>
                Swal.fire({
                    title: 'Success!',
                    text: 'Menu added successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'index.php';
                });
            <?php elseif (isset($_GET['error'])) : ?>
                Swal.fire({
                    title: 'Error!',
                    text: '<?php echo htmlspecialchars($_GET['error'], ENT_QUOTES, 'UTF-8'); ?>',
                    icon: 'error',
                    timer: 5000,
                    showConfirmButton: true
                });
            <?php endif; ?>
        });
    </script>
</body>

</html>