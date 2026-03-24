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
$subcategory_name = "";
$errors = [];
$success_message = '';

// Fetch existing categories from the database for the same restaurant
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

// Handle adding new subcategory
if ($_SERVER["REQUEST_METHOD"] == "POST" && !isset($_POST['action'])) {
    // Validate CSRF token
    if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
        die("CSRF token validation failed.");
    }

    // Sanitize and validate inputs
    $category_id = isset($_POST['category_id']) ? intval($_POST['category_id']) : 0;
    $subcategory_name = trim($_POST["subcategory_name"]);

    // Validate subcategory name
    if (empty($subcategory_name)) {
        $errors[] = "Subcategory name is required.";
    } elseif (strlen($subcategory_name) > 20) {
        $errors[] = "Subcategory name must be 20 characters or less.";
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

    // If no errors, insert subcategory into the database
    if (empty($errors)) {
        $sql = "INSERT INTO subcategory_tbl (parent_category_id, subcategory_name, restaurant_id) VALUES (?, ?, ?)";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("isi", $category_id, $subcategory_name, $restaurant_id);
            if ($stmt->execute()) {
                $success_message = "Subcategory added successfully.";
                $subcategory_name = ""; // Clear the input field after successful submission
            } else {
                $errors[] = "Error in adding subcategory: " . $stmt->error;
            }
            $stmt->close();
        } else {
            $errors[] = "Query preparation failed: " . $conn->error;
        }
    }
}

// Generate CSRF token if it doesn't exist
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); // Generate a random token
}

// Fetch all subcategories for the same restaurant
$sql_subcategories = "SELECT s.subcategory_id, s.subcategory_name, c.category_name 
                      FROM subcategory_tbl s 
                      INNER JOIN category_tbl c ON s.parent_category_id = c.category_id 
                      WHERE s.restaurant_id = ?";
$stmt_subcategories = $conn->prepare($sql_subcategories);
$stmt_subcategories->bind_param("i", $restaurant_id);
$stmt_subcategories->execute();
$result_subcategories = $stmt_subcategories->get_result();
$subcategories = [];
if ($result_subcategories && $result_subcategories->num_rows > 0) {
    while ($row = $result_subcategories->fetch_assoc()) {
        $subcategories[] = $row;
    }
} else {
    $errors[] = "Error fetching subcategories: " . $conn->error;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Subcategory</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        .back-button {
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 1000;
        }
        .character-count {
            font-size: 0.8rem;
            color: #6c757d;
            text-align: right;
        }
    </style>
</head>

<body>
    <div class="container mt-5">
        <!-- Back Button -->
        <div id="back-button" class="mt-3 back-button" style="display: none;">
            <a href="index.php" class="btn btn-secondary">Back to Dashboard</a>
        </div>
        <h1>Add Subcategory</h1>

        <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]); ?>" method="post">
            <input type="hidden" name="csrf_token" value="<?php echo $_SESSION['csrf_token']; ?>">
            <div class="mb-3">
                <label for="category_id" class="form-label">Category:</label>
                <select name="category_id" id="category_id" class="form-select">
                    <?php foreach ($categories as $category) : ?>
                        <option value="<?php echo htmlspecialchars($category['category_id']); ?>">
                            <?php echo htmlspecialchars($category['category_name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="mb-3">
                <label for="subcategory_name" class="form-label">Subcategory Name:</label>
                <input type="text" name="subcategory_name" id="subcategory_name" class="form-control"
                    value="<?php echo htmlspecialchars($subcategory_name); ?>" maxlength="20">
                <div class="character-count">
                    <span id="char-count">0</span>/20 characters
                </div>
                <small class="text-muted">Maximum 20 characters allowed</small>
            </div>
            <button type="submit" class="btn btn-primary">Add Subcategory</button>
        </form>

        <h2 class="mt-5">Subcategories List</h2>
        <table class="table table-bordered mt-3">
            <thead>
                <tr>
                    <th>Subcategory Name</th>
                    <th>Category</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="subcategory-list">
                <?php foreach ($subcategories as $subcategory) : ?>
                    <tr id="subcategory-<?php echo htmlspecialchars($subcategory['subcategory_id']); ?>">
                        <td><?php echo htmlspecialchars($subcategory['subcategory_name']); ?></td>
                        <td><?php echo htmlspecialchars($subcategory['category_name']); ?></td>
                        <td>
                            <a href="edit_subcategory.php?id=<?php echo htmlspecialchars($subcategory['subcategory_id']); ?>"
                                class="btn btn-warning btn-sm">Edit</a>
                            <button class="btn btn-danger btn-sm"
                                onclick="deleteSubcategory(<?php echo htmlspecialchars($subcategory['subcategory_id']); ?>)">Delete</button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>

    <!-- Bootstrap Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- SweetAlert2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <!-- jQuery (necessary for AJAX) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        // Character counter for subcategory name
        document.getElementById('subcategory_name').addEventListener('input', function() {
            const count = this.value.length;
            document.getElementById('char-count').textContent = count;
        });

        function deleteSubcategory(id) {
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: 'delete_subcategory.php',
                        type: 'POST',
                        data: {
                            id: id,
                            csrf_token: '<?php echo $_SESSION['csrf_token']; ?>'
                        },
                        success: function(response) {
                            if (response.status === 'success') {
                                Swal.fire({
                                    title: 'Deleted!',
                                    text: response.message,
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                                document.getElementById('subcategory-' + id).remove();
                            } else {
                                Swal.fire({
                                    title: 'Error!',
                                    text: response.message,
                                    icon: 'error',
                                    timer: 5000,
                                    showConfirmButton: true
                                });
                            }
                        },
                        error: function() {
                            Swal.fire({
                                title: 'Error!',
                                text: 'An error occurred while deleting the subcategory.',
                                icon: 'error',
                                timer: 5000,
                                showConfirmButton: true
                            });
                        }
                    });
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Initialize character counter
            const subcategoryInput = document.getElementById('subcategory_name');
            document.getElementById('char-count').textContent = subcategoryInput.value.length;

            <?php if (!empty($success_message)) : ?>
                Swal.fire({
                    title: 'Success!',
                    text: '<?php echo htmlspecialchars($success_message); ?>',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    document.getElementById('back-button').style.display = 'block';
                });
            <?php elseif (!empty($errors)) : ?>
                Swal.fire({
                    title: 'Error!',
                    text: '<?php echo htmlspecialchars(implode(' ', $errors)); ?>',
                    icon: 'error',
                    timer: 5000,
                    showConfirmButton: true
                });
            <?php endif; ?>
        });
    </script>
</body>

</html>