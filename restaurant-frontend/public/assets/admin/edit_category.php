<?php
session_start();

if (!isset($_SESSION['admin_id']) || !isset($_SESSION['restaurant_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the QR Menu System privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

include_once '../db.php';

// Get the restaurant_id from the session
$restaurant_id = $_SESSION['restaurant_id'];

$category_id = '';
$category_name = '';
$description = '';
$image_url = '';
$success = false;
$error = '';

// Check if category_id is provided
if (isset($_GET['category_id'])) {
    $category_id = filter_input(INPUT_GET, 'category_id', FILTER_SANITIZE_NUMBER_INT);

    // Check if the category belongs to the current restaurant
    $stmt = $conn->prepare("
        SELECT category_name, description, image_url 
        FROM category_tbl 
        WHERE category_id = ? AND restaurant_id = ?
    ");
    $stmt->bind_param("ii", $category_id, $restaurant_id);
    $stmt->execute();
    $stmt->bind_result($category_name, $description, $image_url);
    $stmt->fetch();
    $stmt->close();

    // Redirect if the category does not belong to the current restaurant
    if (empty($category_name)) {
        header("Location: index.php");
        exit;
    }
}

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $category_id = filter_input(INPUT_POST, 'category_id', FILTER_SANITIZE_NUMBER_INT);
    $category_name = filter_input(INPUT_POST, 'category_name', FILTER_SANITIZE_STRING);
    $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_STRING);
    $current_image_url = filter_input(INPUT_POST, 'current_image_url', FILTER_SANITIZE_STRING);

    // Validate description length (max 100 characters)
    if (strlen($description) > 100) {
        $error = "Description must be 100 characters or less";
        header("Location: edit_category.php?category_id=$category_id&success=0&error=" . urlencode($error));
        exit;
    }

    // Default to current image URL
    $image_url = $current_image_url;

    // Process file upload if a new file was provided
    if (isset($_FILES['image']) && $_FILES['image']['error'] == 0) {
        $allowed = ["jpg" => "image/jpeg", "jpeg" => "image/jpeg", "png" => "image/png"];
        $file_name = $_FILES['image']['name'];
        $file_type = $_FILES['image']['type'];
        $file_size = $_FILES['image']['size'];
        $ext = pathinfo($file_name, PATHINFO_EXTENSION);

        // Verify file extension
        if (!array_key_exists($ext, $allowed)) {
            $error = "Error: Please select a valid file format (JPEG, PNG only).";
        }

        // Verify file type
        if (in_array($file_type, $allowed)) {
            // Verify file size - 5MB maximum
            $maxsize = 5 * 1024 * 1024;
            if ($file_size > $maxsize) {
                $error = "Error: File size is larger than the allowed limit (5MB).";
            }

            // Define upload directory
            $target_dir = "../assets/imgs/category-img/";
            if (!file_exists($target_dir)) {
                mkdir($target_dir, 0777, true);
            }

            // Generate unique filename with timestamp
            $new_filename = $restaurant_id . "_" . time() . "." . $ext;
            $target_file = $target_dir . $new_filename;

            // Delete old image if it exists
            if (!empty($current_image_url) && file_exists($current_image_url)) {
                if (!unlink($current_image_url)) {
                    $error = "Error: There was a problem deleting the old image.";
                }
            }

            // Move uploaded file if no errors
            if (empty($error) && move_uploaded_file($_FILES['image']['tmp_name'], $target_file)) {
                $image_url = '../assets/imgs/category-img/' . $new_filename;
            } else {
                $error = $error ?: "Error: There was a problem uploading your file. Please try again.";
            }
        } else {
            $error = "Error: There was a problem with your upload. Please try again.";
        }
    }

    // Update the category if no errors
    if (empty($error)) {
        $stmt = $conn->prepare("
            UPDATE category_tbl 
            SET category_name = ?, description = ?, image_url = ? 
            WHERE category_id = ? AND restaurant_id = ?
        ");
        $stmt->bind_param("sssii", $category_name, $description, $image_url, $category_id, $restaurant_id);

        if ($stmt->execute()) {
            $success = true;
        } else {
            $error = "Error updating the category: " . $stmt->error;
        }
        $stmt->close();
    }

    // Redirect with status
    header("Location: edit_category.php?category_id=$category_id&success=" . (int)$success . "&error=" . urlencode($error));
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Category</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        .char-limit-warning {
            color: red;
            font-weight: bold;
        }
        .current-image {
            max-width: 200px;
            max-height: 200px;
            margin-top: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 5px;
        }
    </style>
</head>

<body>
    <div class="container mt-5">
        <h2>Edit Category</h2>
        <form action="edit_category.php" method="post" enctype="multipart/form-data" class="mt-4">
            <input type="hidden" name="category_id" value="<?php echo htmlspecialchars($category_id); ?>">
            <input type="hidden" name="current_image_url" value="<?php echo htmlspecialchars($image_url); ?>">
            
            <div class="mb-3">
                <label for="category_name" class="form-label">Category Name</label>
                <input type="text" id="category_name" name="category_name" class="form-control"
                    value="<?php echo htmlspecialchars($category_name); ?>" required>
            </div>

            <div class="mb-3">
                <label for="description" class="form-label">Description <span id="char-count" class="badge bg-<?php echo (100 - strlen($description)) < 20 ? 'warning' : 'secondary'; ?>"><?php echo 100 - strlen($description); ?></span></label>
                <input type="text" id="description" name="description" class="form-control"
                    value="<?php echo htmlspecialchars($description); ?>" maxlength="100" oninput="updateCharCount()" required>
                <small class="text-muted">Maximum 100 characters allowed</small>
            </div>

            <div class="mb-3">
                <label for="image" class="form-label">Image</label>
                <input type="file" id="image" name="image" class="form-control">
                <small class="text-muted">Maximum file size: 5MB (JPEG, PNG only). Leave blank to keep current image.</small>
                <?php if ($image_url) : ?>
                    <div class="mt-2">
                        <p>Current Image:</p>
                        <img src="<?php echo htmlspecialchars($image_url); ?>" alt="Current Category Image" class="current-image">
                    </div>
                <?php endif; ?>
            </div>

            <button type="submit" class="btn btn-primary">Update Category</button>
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
            const remaining = 100 - description.value.length;
            
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
                    text: 'Category updated successfully!',
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