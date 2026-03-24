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

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

include_once '../db.php';

$menu_id = $menu_name = $description = $image_url = "";
$error = "";
$success = false;

// Check if menu_id is provided
if (isset($_GET['menu_id'])) {
    $menu_id = filter_input(INPUT_GET, 'menu_id', FILTER_SANITIZE_NUMBER_INT);

    if ($menu_id) {
        // Prepare and execute the SQL statement to fetch menu data
        $stmt = $conn->prepare("SELECT menu_name, description, image_url FROM menu_tbl WHERE menu_id = ? AND restaurant_id = ?");
        $stmt->bind_param("ii", $menu_id, $restaurant_id);
        $stmt->execute();
        $stmt->bind_result($menu_name, $description, $image_url);

        // Check if menu item exists and belongs to the restaurant
        if (!$stmt->fetch()) {
            $stmt->close();
            $conn->close();
            $error = "Error: Menu item not found or access denied.";
            header("Location: index.php?error=" . urlencode($error));
            exit;
        }
        $stmt->close();
    } else {
        $error = "Error: Invalid menu ID.";
        header("Location: index.php?error=" . urlencode($error));
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $menu_id = filter_input(INPUT_POST, 'menu_id', FILTER_SANITIZE_NUMBER_INT);
    $menu_name = filter_input(INPUT_POST, 'menu_name', FILTER_SANITIZE_STRING);
    $description = filter_input(INPUT_POST, 'description', FILTER_SANITIZE_STRING);
    $current_image_url = filter_input(INPUT_POST, 'current_image_url', FILTER_SANITIZE_STRING);

    // Validate description length (max 100 characters)
    if (strlen($description) > 100) {
        $error = "Description must be 100 characters or less";
        header("Location: edit_menu.php?menu_id=$menu_id&success=0&error=" . urlencode($error));
        exit;
    }

    // Check if a new image was uploaded without errors
    if (isset($_FILES["image"]) && $_FILES["image"]["error"] == 0) {
        $allowed = ["jpg" => "image/jpeg", "jpeg" => "image/jpeg", "png" => "image/png"];
        $file_name = $_FILES["image"]["name"];
        $file_type = $_FILES["image"]["type"];
        $file_size = $_FILES["image"]["size"];

        $ext = pathinfo($file_name, PATHINFO_EXTENSION);
        if (!array_key_exists($ext, $allowed)) {
            $error = "Error: Please select a valid file format (JPEG, PNG only).";
        }

        if (in_array($file_type, $allowed)) {
            $maxsize = 5 * 1024 * 1024;
            if ($file_size > $maxsize) {
                $error = "Error: File size is larger than the allowed limit (5MB).";
            }

            $new_directory = '../assets/imgs/menu-img/';
            if (!file_exists($new_directory)) {
                mkdir($new_directory, 0777, true);
            }

            // Generate unique filename with restaurant ID and timestamp
            $new_file_name = $restaurant_id . "_" . time() . "." . $ext;

            // Delete the old image if it exists
            if (!empty($current_image_url) && file_exists('../' . $current_image_url)) {
                if (!unlink('../' . $current_image_url)) {
                    $error = "Error: There was a problem deleting the old image.";
                }
            }

            $image_url = 'assets/imgs/menu-img/' . basename($new_file_name);
            if (!move_uploaded_file($_FILES["image"]["tmp_name"], $new_directory . $new_file_name)) {
                $error = "Error: There was a problem uploading your file. Please try again.";
            }
        } else {
            $error = "Error: There was a problem with your upload. Please try again.";
        }
    } else {
        // Use existing image if no new image is uploaded
        $image_url = $current_image_url;
    }

    if (empty($error)) {
        // Prepare and execute the SQL statement to update the menu item
        $stmt = $conn->prepare("UPDATE menu_tbl SET menu_name = ?, description = ?, image_url = ? WHERE menu_id = ? AND restaurant_id = ?");
        $stmt->bind_param("sssii", $menu_name, $description, $image_url, $menu_id, $restaurant_id);
        if ($stmt->execute()) {
            $success = true;
        } else {
            $error = "Error: " . $stmt->error;
        }
        $stmt->close();
    }

    $conn->close();

    header("Location: edit_menu.php?success=" . (int)$success . "&error=" . urlencode($error) . "&menu_id=" . $menu_id);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Menu</title>
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
        <h2>Edit Menu</h2>
        <form action="edit_menu.php" method="post" enctype="multipart/form-data" class="mt-4">
            <input type="hidden" name="menu_id" value="<?php echo htmlspecialchars($menu_id); ?>">
            <input type="hidden" name="current_image_url" value="<?php echo htmlspecialchars($image_url); ?>">
            
            <div class="mb-3">
                <label for="menu_name" class="form-label">Menu Name</label>
                <input type="text" id="menu_name" name="menu_name" class="form-control"
                    value="<?php echo htmlspecialchars($menu_name); ?>" required>
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
                        <img src="<?php echo "../" . htmlspecialchars($image_url); ?>" alt="Current Menu Image" class="current-image">
                    </div>
                <?php endif; ?>
            </div>

            <button type="submit" class="btn btn-primary">Update Menu</button>
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
                    text: 'Menu updated successfully!',
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