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

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Enable error reporting for debugging
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Include database connection
include_once '../db.php';

// Initialize variables
$subcategory_id = 0;
$subcategory_name = "";
$category_id = 0;
$errors = [];
$success_message = '';

// Generate CSRF token if it doesn't exist
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); // Generate a random token
}

// Fetch existing categories for the same restaurant
$sql_categories = "SELECT category_id, category_name FROM category_tbl WHERE restaurant_id = ?";
$stmt_categories = $conn->prepare($sql_categories);
$stmt_categories->bind_param("i", $restaurant_id);
$stmt_categories->execute();
$result_categories = $stmt_categories->get_result();
$categories = [];
if ($result_categories && $result_categories->num_rows > 0) {
    while ($row = $result_categories->fetch_assoc()) {
        $categories[] = $row;
    }
} else {
    $errors[] = "Error fetching categories: " . $conn->error;
}

// Handle updating subcategory
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Validate CSRF token
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        die("CSRF token validation failed.");
    }

    // Sanitize and validate inputs
    $subcategory_id = isset($_POST['subcategory_id']) ? intval($_POST['subcategory_id']) : 0;
    $category_id = isset($_POST['category_id']) ? intval($_POST['category_id']) : 0;
    $subcategory_name = trim($_POST["subcategory_name"]);

    // Validate subcategory name
    if (empty($subcategory_name)) {
        $errors[] = "Subcategory name is required.";
    }

    // Ensure category_id belongs to the logged-in restaurant
    $stmt_check_category = $conn->prepare("SELECT COUNT(*) FROM category_tbl WHERE category_id = ? AND restaurant_id = ?");
    $stmt_check_category->bind_param("ii", $category_id, $restaurant_id);
    $stmt_check_category->execute();
    $stmt_check_category->bind_result($category_count);
    $stmt_check_category->fetch();
    $stmt_check_category->close();

    if ($category_count === 0) {
        $errors[] = "Invalid category selected.";
    }

    // Ensure subcategory_id belongs to the logged-in restaurant
    $stmt_check_subcategory = $conn->prepare("SELECT COUNT(*) FROM subcategory_tbl WHERE subcategory_id = ? AND restaurant_id = ?");
    $stmt_check_subcategory->bind_param("ii", $subcategory_id, $restaurant_id);
    $stmt_check_subcategory->execute();
    $stmt_check_subcategory->bind_result($subcategory_count);
    $stmt_check_subcategory->fetch();
    $stmt_check_subcategory->close();

    if ($subcategory_count === 0) {
        $errors[] = "Invalid subcategory selected.";
    }

    // If no errors, update subcategory in the database
    if (empty($errors)) {
        $sql = "UPDATE subcategory_tbl SET parent_category_id = ?, subcategory_name = ? WHERE subcategory_id = ?";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("isi", $category_id, $subcategory_name, $subcategory_id);
            if ($stmt->execute()) {
                $success_message = "Subcategory updated successfully.";
            } else {
                $errors[] = "Error in updating subcategory: " . $stmt->error;
            }
            $stmt->close();
        } else {
            $errors[] = "Query preparation failed: " . $conn->error;
        }
    }
}

// Fetch subcategory details if an ID is provided
if (isset($_GET['id'])) {
    $subcategory_id = intval($_GET['id']);
    $sql_subcategory = "SELECT subcategory_id, parent_category_id, subcategory_name FROM subcategory_tbl WHERE subcategory_id = ? AND restaurant_id = ?";
    $stmt = $conn->prepare($sql_subcategory);
    if ($stmt) {
        $stmt->bind_param("ii", $subcategory_id, $restaurant_id);
        if ($stmt->execute()) {
            $result = $stmt->get_result();
            if ($result && $result->num_rows > 0) {
                $subcategory = $result->fetch_assoc();
                $subcategory_id = $subcategory['subcategory_id'];
                $category_id = $subcategory['parent_category_id'];
                $subcategory_name = $subcategory['subcategory_name'];
            } else {
                $errors[] = "Subcategory not found.";
            }
        } else {
            $errors[] = "Error fetching subcategory details: " . $stmt->error;
        }
        $stmt->close();
    } else {
        $errors[] = "Query preparation failed: " . $conn->error;
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Subcategory</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
</head>

<body>
    <div class="container mt-5">
        <h1>Edit Subcategory</h1>

        <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
            <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
            <input type="hidden" name="subcategory_id" value="<?php echo htmlspecialchars($subcategory_id); ?>">
            <div class="mb-3">
                <label for="category_id" class="form-label">Category:</label>
                <select name="category_id" id="category_id" class="form-select">
                    <?php foreach ($categories as $category) : ?>
                        <option value="<?php echo htmlspecialchars($category['category_id']); ?>"
                            <?php echo ($category['category_id'] == $category_id) ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($category['category_name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="mb-3">
                <label for="subcategory_name" class="form-label">Subcategory Name:</label>
                <input type="text" name="subcategory_name" id="subcategory_name" class="form-control"
                    value="<?php echo htmlspecialchars($subcategory_name); ?>" maxlength="20">
            </div>
            <button type="submit" class="btn btn-primary">Update Subcategory</button>
        </form>

        <?php if (!empty($success_message)) : ?>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    Swal.fire({
                        title: 'Success!',
                        text: '<?php echo htmlspecialchars($success_message); ?>',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'index.php'; // Redirect to dashboard after success
                    });
                });
            </script>
        <?php endif; ?>

        <?php if (!empty($errors)) : ?>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    Swal.fire({
                        title: 'Error!',
                        text: '<?php echo htmlspecialchars(implode(' ', $errors)); ?>',
                        icon: 'error',
                        timer: 5000,
                        showConfirmButton: true
                    });
                });
            </script>
        <?php endif; ?>
    </div>

    <!-- Bootstrap Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- SweetAlert2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
</body>

</html>