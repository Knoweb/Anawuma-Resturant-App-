<?php
session_start();

// Check if the admin is logged in
if (!isset($_SESSION['admin_id']) || !isset($_SESSION['restaurant_id'])) {
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

// Initialize category and menu names
$category_name = "";
$menu_name = "";
$success_message = "";

// Handle delete request
if (isset($_GET['delete_item_id']) && is_numeric($_GET['delete_item_id'])) {
    $food_items_id = intval($_GET['delete_item_id']);

    // Fetch the image URLs for the item to be deleted
    $sql_images = "SELECT image_url_1, image_url_2, image_url_3, image_url_4 FROM food_items_tbl WHERE food_items_id = ? AND restaurant_id = ?";
    $stmt_images = $conn->prepare($sql_images);
    $stmt_images->bind_param("ii", $food_items_id, $restaurant_id);
    $stmt_images->execute();
    $result_images = $stmt_images->get_result();

    if ($result_images->num_rows > 0) {
        $row_images = $result_images->fetch_assoc();

        // Delete the food item
        $sql_delete = "DELETE FROM food_items_tbl WHERE food_items_id = ? AND restaurant_id = ?";
        $stmt_delete = $conn->prepare($sql_delete);
        $stmt_delete->bind_param("ii", $food_items_id, $restaurant_id);
        $stmt_delete->execute();

        // Check if the deletion was successful
        if ($stmt_delete->affected_rows > 0) {
            // Remove image files from the server
            $images = ['image_url_1', 'image_url_2', 'image_url_3', 'image_url_4'];
            foreach ($images as $image) {
                $filePath = $row_images[$image];
                if (!empty($filePath) && file_exists($filePath)) {
                    unlink($filePath);
                }
            }
            $success_message = "Item deleted successfully!";
        }

        $stmt_delete->close();
    }

    $stmt_images->close();
}

// Check if category ID is provided in the URL and if it's a valid integer
if (isset($_GET['category_id']) && is_numeric($_GET['category_id'])) {
    $category_id = intval($_GET['category_id']);

    // Fetch the category name
    $sql_category = "SELECT category_name FROM category_tbl WHERE category_id = ? AND restaurant_id = ?";
    $stmt_category = $conn->prepare($sql_category);
    $stmt_category->bind_param("ii", $category_id, $restaurant_id);
    $stmt_category->execute();
    $result_category = $stmt_category->get_result();

    if ($result_category->num_rows > 0) {
        $row_category = $result_category->fetch_assoc();
        $category_name = htmlspecialchars($row_category['category_name']);
    } else {
        $category_name = "Category Not Found";
    }
    $stmt_category->close();

    // Fetch the menu name
    $sql_menu = "SELECT m.menu_name FROM menu_tbl m
        INNER JOIN category_tbl c ON m.menu_id = c.menu_id
        WHERE c.category_id = ? AND m.restaurant_id = ?";
    $stmt_menu = $conn->prepare($sql_menu);
    $stmt_menu->bind_param("ii", $category_id, $restaurant_id);
    $stmt_menu->execute();
    $result_menu = $stmt_menu->get_result();

    if ($result_menu && $result_menu->num_rows > 0) {
        $row_menu = $result_menu->fetch_assoc();
        $menu_name = htmlspecialchars($row_menu['menu_name']);
    } else {
        $menu_name = "Menu Not Found";
    }
    $result_menu->free_result();
}

// Initialize an array for subcategories
$subcategories = [];

// Fetch subcategories for the specified category
$sql_subcategories = "SELECT subcategory_id, subcategory_name FROM subcategory_tbl WHERE parent_category_id = ? AND restaurant_id = ?";
$stmt_subcategories = $conn->prepare($sql_subcategories);
$stmt_subcategories->bind_param("ii", $category_id, $restaurant_id);
$stmt_subcategories->execute();
$result_subcategories = $stmt_subcategories->get_result();

if ($result_subcategories->num_rows > 0) {
    while ($row_subcategory = $result_subcategories->fetch_assoc()) {
        $subcategories[] = $row_subcategory;
    }
}
$stmt_subcategories->close();

// Fetch food items for the specified category
$sql_items = "SELECT f.*, c.currency FROM food_items_tbl f
    JOIN currency_types_tbl c ON f.currency_id = c.currency_id
    WHERE f.category_id = ? AND f.restaurant_id = ?";
$stmt_items = $conn->prepare($sql_items);
$stmt_items->bind_param("ii", $category_id, $restaurant_id);
$stmt_items->execute();
$result_items = $stmt_items->get_result();

// Close database connection
$conn->close();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Food Items</title>
    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css">
    <!-- SweetAlert CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <!-- Custom CSS -->
    <style>
        .box-container {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }

        .box {
            border: 1px solid #dee2e6;
            border-radius: 10px;
            transition: transform 0.2s;
            position: relative;
            background: white;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .box:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }

        .add-item-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
        }

        .subcategory-buttons {
            margin-bottom: 20px;
        }

        .subcategory-btn {
            margin-right: 10px;
            margin-bottom: 10px;
        }
        
        /* New Responsive Image Style */
        .box img {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }

        .box .content {
            padding: 15px;
            flex-grow: 1;
        }

        .box .price {
            font-size: 1.2rem;
            color: #28a745;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .box .name {
            font-size: 1.1rem;
            margin-bottom: 15px;
            color: #333;
        }

        .box-actions {
            margin-top: auto;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>

<body>
    <div class="container">
        <!-- Navigation section -->
        <nav class="py-2 px-4 text-center">
            <span><?php echo htmlspecialchars($menu_name); ?> / <?php echo $category_name; ?></span>
        </nav>

        <!-- New Item button -->
        <a href="add_food_item.php?category_id=<?php echo htmlspecialchars($category_id); ?>"
            class="btn btn-primary add-item-btn"><i class="bi bi-plus"></i> New Item</a>

        <!-- Back button -->
        <div class="py-2">
            <button onclick="window.location.href='index.php'" class="btn btn-secondary mb-3">Back</button>
        </div>

        <!-- Subcategory buttons -->
        <div class="subcategory-buttons text-center">
            <button class="btn subcategory-btn active" data-subcategory="all">All</button>
            <?php foreach ($subcategories as $subcategory) : ?>
                <button class="btn subcategory-btn"
                    data-subcategory="<?php echo htmlspecialchars($subcategory['subcategory_id']); ?>"><?php echo htmlspecialchars($subcategory['subcategory_name']); ?></button>
            <?php endforeach; ?>
        </div>

        <!-- Food items section -->
        <div class="box-container">
            <?php if ($result_items->num_rows > 0) : ?>
                <?php while ($row_item = $result_items->fetch_assoc()) : ?>
                    <div class="box fade-up"
                        data-subcategory="<?php echo isset($row_item['subcategory_id']) ? htmlspecialchars($row_item['subcategory_id']) : 'all'; ?>">
                        
                        <img src="<?php echo htmlspecialchars($row_item['image_url_1']); ?>"
                            alt="<?php echo htmlspecialchars($row_item['food_items_name']); ?>" />
                        
                        <div class="content">
                            <h4 class="name"><?php echo htmlspecialchars($row_item['food_items_name']); ?></h4>
                            <div class="price">
                                <?php echo htmlspecialchars($row_item['currency']) . ' ' . htmlspecialchars($row_item['price']); ?>
                            </div>
                            
                            <div class="box-actions">
                                <a href="edit_item.php?food_items_id=<?php echo $row_item['food_items_id']; ?>"
                                    class="btn btn-sm btn-primary flex-fill me-1">Edit</a>
                                <button class="btn btn-sm btn-danger delete-btn flex-fill ms-1"
                                    data-id="<?php echo $row_item['food_items_id']; ?>">Delete</button>
                            </div>
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else : ?>
                <p class="no-items-message">No items found for this category.</p>
            <?php endif; ?>
        </div>
    </div>

    <!-- Bootstrap JS and jQuery -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- SweetAlert JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        $(document).ready(function() {
            // Display success message if set
            <?php if ($success_message) : ?>
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: '<?php echo $success_message; ?>',
                    showConfirmButton: false,
                    timer: 2000 // Closes after 2 seconds
                });
            <?php endif; ?>

            // Handle subcategory button click event
            $('.subcategory-btn').click(function() {
                var subcategory = $(this).data('subcategory');
                $('.box').each(function() {
                    var itemSubcategory = $(this).data('subcategory');
                    if (subcategory === 'all' || subcategory == itemSubcategory) {
                        $(this).fadeIn();
                    } else {
                        $(this).hide();
                    }
                });
                // Toggle active class on subcategory buttons
                $('.subcategory-btn').removeClass('active');
                $(this).addClass('active');
            });

            // Handle delete button click event
            $('.delete-btn').click(function() {
                var foodItemId = $(this).data('id');
                Swal.fire({
                    title: 'Are you sure?',
                    text: "You won't be able to revert this!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: 'Yes, delete it!',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href =
                            'items.php?category_id=<?php echo htmlspecialchars($category_id); ?>&delete_item_id=' +
                            foodItemId;
                    }
                });
            });
        });
    </script>
</body>

</html>