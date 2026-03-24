<?php
// Start the session
session_start();

// Check if the admin is logged in by verifying the session variable 'admin_id'
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the QR Menu System privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

// Retrieve the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Include the database connection file
include_once '../db.php';

// Check if the form was submitted via POST method
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['confirm_delete_category'])) {
        // Retrieve and sanitize the category ID
        $category_id = filter_input(INPUT_POST, 'category_id', FILTER_SANITIZE_NUMBER_INT);

        if ($category_id) {
            // Fetch and delete all food items' images associated with the category
            $stmt = $conn->prepare("SELECT image_url_1, image_url_2, image_url_3, image_url_4 FROM food_items_tbl WHERE category_id = ? AND restaurant_id = ?");
            $stmt->bind_param("ii", $category_id, $restaurant_id);
            $stmt->execute();
            $result = $stmt->get_result();

            // Delete all associated food item images
            while ($row = $result->fetch_assoc()) {
                for ($i = 1; $i <= 4; $i++) {
                    $image_field = 'image_url_' . $i;
                    if (!empty($row[$image_field]) && file_exists($row[$image_field])) {
                        unlink($row[$image_field]);
                    }
                }
            }
            $stmt->close();

            // Delete the category image
            $stmt = $conn->prepare("SELECT image_url FROM category_tbl WHERE category_id = ? AND restaurant_id = ?");
            $stmt->bind_param("ii", $category_id, $restaurant_id);
            $stmt->execute();
            $stmt->bind_result($category_image_url);
            $stmt->fetch();
            $stmt->close();

            if ($category_image_url && file_exists($category_image_url)) {
                unlink($category_image_url);
            }

            // Delete the category and its food items
            $stmt = $conn->prepare("DELETE FROM category_tbl WHERE category_id = ? AND restaurant_id = ?");
            $stmt->bind_param("ii", $category_id, $restaurant_id);

            if ($stmt->execute()) {
                echo "<script>
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Category and associated food items have been deleted.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'index.php';
                    });
                </script>";
            } else {
                echo "<script>
                    Swal.fire({
                        title: 'Error!',
                        text: 'Error: " . addslashes($stmt->error) . "',
                        icon: 'error',
                        timer: 2000,
                        showConfirmButton: false
                    });
                </script>";
            }
            $stmt->close();
        }
    }
}

// Retrieve and sanitize the menu ID from the GET request
$menu_id = filter_input(INPUT_GET, 'menu_id', FILTER_SANITIZE_NUMBER_INT);

$menu_name = "";
if ($menu_id) {
    $stmt = $conn->prepare("SELECT menu_name FROM menu_tbl WHERE menu_id = ? AND restaurant_id = ?");
    $stmt->bind_param("ii", $menu_id, $restaurant_id);
    $stmt->execute();
    $stmt->bind_result($menu_name);
    $stmt->fetch();
    $stmt->close();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($menu_name); ?> Categories</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body {
            background-color: #f8f9fa;
            padding-top: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header-section {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid #dee2e6;
        }
        
        .heading {
            color: #343a40;
            font-weight: 600;
            margin: 0;
        }
        
        .add-category-btn {
            background-color: #0d6efd;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        
        .add-category-btn:hover {
            background-color: #0b5ed7;
            color: white;
            transform: translateY(-2px);
        }
        
        .card {
            border: 1px solid #dee2e6;
            border-radius: 10px;
            margin-bottom: 20px;
            transition: all 0.3s;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }
        
        .card-img-top {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
        }
        
        .card-body {
            padding: 20px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }
        
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 10px;
            color: #212529;
        }
        
        .card-text {
            color: #6c757d;
            flex-grow: 1;
            margin-bottom: 15px;
        }
        
        .btn-action {
            width: 100%;
            margin-bottom: 10px;
            padding: 8px 0;
            font-weight: 500;
        }
        
        .btn-explore {
            background-color: #0dcaf0;
            border-color: #0dcaf0;
        }
        
        .btn-explore:hover {
            background-color: #0bb6d9;
            border-color: #0bb6d9;
        }
        
        .no-categories {
            text-align: center;
            padding: 40px;
            color: #6c757d;
            font-size: 1.1rem;
        }
        
        .back-button {
            margin-bottom: 20px;
        }
        
        @media (max-width: 768px) {
            .header-section {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            
            .card-img-top {
                height: 180px;
            }
        }
    </style>
</head>

<body>
    <div class="container">
        <div class="back-button">
            <button onclick="history.back()" class="btn btn-secondary">
                <i class="fas fa-arrow-left me-2"></i>Back
            </button>
        </div>
        
        <div class="header-section">
            <?php if (!empty($menu_name)) : ?>
                <h1 class="heading"><?php echo htmlspecialchars($menu_name) . " Categories"; ?></h1>
            <?php endif; ?>
            <a href="add_category.php?menu_id=<?php echo htmlspecialchars($menu_id); ?>" class="add-category-btn">
                <i class="fas fa-plus me-1"></i> Add New Category
            </a>
        </div>

        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            <?php
            if ($menu_id) {
                $sql = "SELECT category_id, category_name, description, image_url FROM category_tbl WHERE menu_id = ? AND restaurant_id = ?";
                $stmt = $conn->prepare($sql);
                if ($stmt) {
                    $stmt->bind_param('ii', $menu_id, $restaurant_id);
                    $stmt->execute();
                    $result = $stmt->get_result();

                    if ($result->num_rows > 0) {
                        while ($row = $result->fetch_assoc()) {
                            echo '<div class="col">';
                            echo '<div class="card h-100 shadow-sm">';
                            echo '<img src="' . htmlspecialchars($row["image_url"]) . '" class="card-img-top" alt="' . htmlspecialchars($row["category_name"]) . '">';
                            echo '<div class="card-body">';
                            echo '<h5 class="card-title">' . htmlspecialchars($row["category_name"]) . '</h5>';
                            echo '<p class="card-text">' . htmlspecialchars($row["description"]) . '</p>';
                            echo '<div class="mt-auto">';
                            echo '<a href="items.php?category_id=' . htmlspecialchars($row["category_id"]) . '" class="btn btn-explore btn-action text-white">';
                            echo 'Explore Items';
                            echo '</a>';
                            echo '<a href="edit_category.php?category_id=' . htmlspecialchars($row["category_id"]) . '" class="btn btn-warning btn-action">';
                            echo '<i class="fas fa-edit me-2"></i>Edit';
                            echo '</a>';
                            echo '<button type="button" class="btn btn-danger btn-action" onclick="confirmDelete(' . htmlspecialchars($row['category_id']) . ')">';
                            echo '<i class="fas fa-trash-alt me-2"></i>Delete';
                            echo '</button>';
                            echo '</div>';
                            echo '</div>';
                            echo '</div>';
                            echo '</div>';
                        }
                    } else {
                        echo '<div class="col-12">';
                        echo '<div class="no-categories">';
                        echo '<i class="fas fa-folder-open fa-3x mb-3" style="color: #6c757d;"></i>';
                        echo '<h4>No Categories Found</h4>';
                        echo '<p>Get started by adding your first category</p>';
                        echo '</div>';
                        echo '</div>';
                    }

                    $stmt->close();
                } else {
                    echo '<div class="alert alert-danger">Query preparation failed: ' . $conn->error . '</div>';
                }
            }
            ?>
        </div>
    </div>

    <form id="deleteForm" method="POST" style="display: none;">
        <input type="hidden" name="category_id" id="deleteCategoryId">
        <input type="hidden" name="confirm_delete_category" value="1">
    </form>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script>
        function confirmDelete(categoryId) {
            Swal.fire({
                title: 'Are you sure?',
                text: 'This will permanently delete the category and all its items!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'Cancel',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    document.getElementById('deleteCategoryId').value = categoryId;
                    document.getElementById('deleteForm').submit();
                }
            });
        }
    </script>
</body>

</html>