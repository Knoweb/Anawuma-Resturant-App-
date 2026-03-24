<?php
// Start the session
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

// Include database connection
include_once '../db.php';

// Initialize error variable
$error = '';

// Check if the form is submitted
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Validate and sanitize form inputs
    $category_name = htmlspecialchars($_POST['category_name'], ENT_QUOTES, 'UTF-8');
    $menu_id = intval($_POST['menu_id']);
    $description = htmlspecialchars($_POST['description'], ENT_QUOTES, 'UTF-8');

    // Validate description length (max 500 characters)
    if (strlen($description) > 500) {
        $error = "Description must be 500 characters or less";
        header("Location: add_category.php?error=" . urlencode($error));
        exit;
    }

    // File upload handling
    $target_dir = "../assets/imgs/category-img/"; // Specify the directory where uploaded files should be stored
    if (!file_exists($target_dir)) {
        mkdir($target_dir, 0777, true);
    }
    
    $image = $_FILES['image'];
    $uniqueFileName = $restaurant_id . '-' . uniqid() . '-' . basename($image['name']); // Unique file name with restaurant ID
    $target_file = $target_dir . $uniqueFileName; // Final file path
    $uploadOk = 1;
    $imageFileType = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));

    // Check if image file is an actual image or fake image
    $check = getimagesize($_FILES["image"]["tmp_name"]);
    if ($check === false) {
        $error = "File is not an image.";
        $uploadOk = 0;
    }

    // Check file size (limit to 3MB)
    if ($_FILES["image"]["size"] > 3000000) {
        $error = "Sorry, your file is too large (max 3MB).";
        $uploadOk = 0;
    }

    // Allow certain file formats
    $allowed_formats = ["jpg", "jpeg", "png", "gif"];
    if (!in_array($imageFileType, $allowed_formats)) {
        $error = "Sorry, only JPG, JPEG, PNG & GIF files are allowed.";
        $uploadOk = 0;
    }

    // Check if $uploadOk is set to 0 by an error
    if ($uploadOk == 1) {
        // Move the uploaded file to the specified directory
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $target_file)) {
            $image_url = '../assets/imgs/category-img/' . $uniqueFileName; // Relative path for database

            // Prepare and execute SQL statement to insert category data into database
            $stmt = $conn->prepare("INSERT INTO category_tbl (category_name, menu_id, description, image_url, restaurant_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("sissi", $category_name, $menu_id, $description, $image_url, $restaurant_id);

            if ($stmt->execute()) {
                // Redirect back to the same page with success message
                header("Location: add_category.php?success=1");
                exit();
            } else {
                $error = "Database error: " . $stmt->error;
            }

            $stmt->close();
        } else {
            $error = "Sorry, there was an error uploading your file.";
        }
    }

    // Close the database connection
    $conn->close();
    
    // If there was an error, redirect with error message
    if (!empty($error)) {
        header("Location: add_category.php?error=" . urlencode($error));
        exit();
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Category</title>
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        .char-counter {
            font-size: 0.8rem;
            text-align: right;
        }
        .char-counter.warning {
            color: orange;
        }
        .char-counter.danger {
            color: red;
            font-weight: bold;
        }
    </style>
</head>

<body>
    <div class="container mt-5">
        <h2>Add New Category</h2>
        <form action="add_category.php" method="POST" enctype="multipart/form-data" class="mt-4">
            <div class="mb-3">
                <label for="category_name" class="form-label">Category Name</label>
                <input type="text" id="category_name" name="category_name" class="form-control" required>
            </div>

            <div class="mb-3">
                <label for="menu_id" class="form-label">Select Menu</label>
                <select name="menu_id" id="menu_id" class="form-select" required>
                    <option value="">Select Menu</option>
                    <?php
                    // Query to select menus from the database
                    $query = "SELECT menu_id, menu_name FROM menu_tbl WHERE restaurant_id = ?";
                    $stmt = $conn->prepare($query);
                    $stmt->bind_param("i", $restaurant_id);
                    $stmt->execute();
                    $result = $stmt->get_result();

                    // Check if there are any menus
                    if ($result && $result->num_rows > 0) {
                        while ($row = $result->fetch_assoc()) {
                            echo "<option value='" . htmlspecialchars($row['menu_id'], ENT_QUOTES, 'UTF-8') . "'>" . htmlspecialchars($row['menu_name'], ENT_QUOTES, 'UTF-8') . "</option>";
                        }
                    } else {
                        echo "<option value='' disabled>No menus found</option>";
                    }

                    $stmt->close();
                    ?>
                </select>
            </div>

            <div class="mb-3">
                <label for="description" class="form-label">Description <span class="badge bg-secondary float-end" id="char-count">500</span></label>
                <textarea id="description" name="description" class="form-control" rows="3" maxlength="500" oninput="updateCharCount()"></textarea>
                <div class="char-counter">Maximum 500 characters allowed</div>
            </div>

            <div class="mb-3">
                <label for="image" class="form-label">Category Image</label>
                <input type="file" id="image" name="image" class="form-control" accept="image/*" required>
                <div class="form-text">Allowed formats: JPG, JPEG, PNG, GIF (Max 3MB)</div>
            </div>

            <button type="submit" class="btn btn-primary">Add Category</button>
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
            
            // Update styling based on remaining characters
            charCount.classList.remove('bg-warning', 'bg-danger');
            
            if (remaining < 20) {
                charCount.classList.add('bg-warning');
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
                    text: 'Category added successfully!',
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