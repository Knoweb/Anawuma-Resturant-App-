<?php
// Start the session
session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the QR Menu System privilege
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

$restaurant_id = $_SESSION['restaurant_id'];

// Include database connection file
include_once '../db.php';

$success = false;
$error = '';

// Check if the form was submitted via POST method
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    // Check if delete action and menu_id are set
    if (isset($_POST['delete']) && isset($_POST['menu_id'])) {
        $menu_id = filter_input(INPUT_POST, 'menu_id', FILTER_SANITIZE_NUMBER_INT);

        if ($menu_id) {
            // Verify if the menu item belongs to the current restaurant
            $stmt = $conn->prepare("SELECT restaurant_id, image_url FROM menu_tbl WHERE menu_id = ?");
            $stmt->bind_param("i", $menu_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result->fetch_assoc();
            $stmt->close();

            if ($row && $row['restaurant_id'] == $restaurant_id) {
                // Delete category images related to this menu
                $stmt = $conn->prepare("SELECT image_url FROM category_tbl WHERE menu_id = ?");
                $stmt->bind_param("i", $menu_id);
                $stmt->execute();
                $categories_result = $stmt->get_result();

                while ($category_row = $categories_result->fetch_assoc()) {
                    $category_image_url = $category_row['image_url'];
                    if (file_exists($category_image_url)) {
                        unlink($category_image_url);  // Delete category image from the server
                    }
                }
                $stmt->close();

                // Delete food items images related to the categories in this menu
                $stmt = $conn->prepare("SELECT image_url_1, image_url_2, image_url_3, image_url_4 FROM food_items_tbl WHERE category_id IN (SELECT category_id FROM category_tbl WHERE menu_id = ?)");
                $stmt->bind_param("i", $menu_id);
                $stmt->execute();
                $food_items_result = $stmt->get_result();

                while ($food_row = $food_items_result->fetch_assoc()) {
                    // Loop through each image URL in the food_items table
                    for ($i = 1; $i <= 4; $i++) {
                        $food_image_url = $food_row["image_url_$i"];
                        if ($food_row["image_url_$i"] && file_exists($food_image_url)) {
                            unlink($food_image_url);  // Delete food item images from the server
                        }
                    }
                }
                $stmt->close();

                // Delete categories related to the menu
                $stmt = $conn->prepare("DELETE FROM category_tbl WHERE menu_id = ?");
                $stmt->bind_param("i", $menu_id);
                if (!$stmt->execute()) {
                    $error = "Error deleting from category_tbl: " . $stmt->error;
                    $stmt->close();
                    echo json_encode(['success' => false, 'error' => $error]);
                    exit;
                }
                $stmt->close();

                // Delete associated subcategories
                $stmt = $conn->prepare("DELETE FROM subcategory_tbl WHERE parent_category_id = ?");
                $stmt->bind_param("i", $menu_id);
                if (!$stmt->execute()) {
                    $error = "Error deleting from subcategory_tbl: " . $stmt->error;
                    $stmt->close();
                    echo json_encode(['success' => false, 'error' => $error]);
                    exit;
                }
                $stmt->close();

                // Delete menu image
                $menu_image_url = '../' . $row['image_url'];
                if (file_exists($menu_image_url)) {
                    unlink($menu_image_url);  // Delete menu image from the server
                }

                // Delete the menu item
                $stmt = $conn->prepare("DELETE FROM menu_tbl WHERE menu_id = ?");
                $stmt->bind_param("i", $menu_id);
                if ($stmt->execute()) {
                    $success = true;
                } else {
                    $error = "Error deleting from menu_tbl: " . $stmt->error;
                }
                $stmt->close();
            } else {
                $error = "Unauthorized action or menu item does not exist.";
            }
        } else {
            $error = "Invalid menu ID.";
        }

        $conn->close();
        echo json_encode(['success' => $success, 'error' => $error]);
        exit;
    }
}

// Query to fetch all menu items for the specific restaurant
$sql = "SELECT menu_id, menu_name, description, image_url FROM menu_tbl WHERE restaurant_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result === false) {
    die("Error: " . $conn->error);
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Admin Menus</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        .card {
            border: 1px solid #dee2e6;
            border-radius: 10px;
            margin-bottom: 20px;
            padding: 20px;
            transition: transform 0.2s;
        }

        .card:hover {
            transform: scale(1.02);
        }

        .card-img-top {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-top-left-radius: 10px;
            border-top-right-radius: 10px;
        }

        .add-menu-btn {
            position: fixed;
            top: 70px;
            right: 20px;
            z-index: 1000;
        }
    </style>
</head>

<body>

    <section id="menu" class="container mb-4">
        <a href="#" onclick="loadContent('add_menu.php')" class="btn btn-primary add-menu-btn">Add New Menu</a>
        <h1 class="heading">Menus</h1>

        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 center-cards">
            <?php
            // Display each menu item in a card
            while ($row = $result->fetch_assoc()) {
                echo '<div class="col">';
                echo '<div class="card shadow fade-up">';
                echo '<img src="../' . htmlspecialchars($row["image_url"]) . '" class="card-img-top intro-img" alt="menu" />';
                echo '<div class="card-body">';

                // Move Explore button to top
                echo '<form action="categories.php" method="get" class="mb-3">';
                echo '<input type="hidden" name="menu_id" value="' . htmlspecialchars($row["menu_id"]) . '">';
                echo '<button type="submit" class="btn btn-info d-block mx-auto" style="width: 200px">Explore</button>';
                echo '</form>';

                echo '<h4 class="card-title">' . htmlspecialchars($row["menu_name"]) . '</h4>';
                echo '<p class="card-text mb-3">' . htmlspecialchars($row["description"]) . '</p>';
                echo '<a href="edit_menu.php?menu_id=' . htmlspecialchars($row["menu_id"]) . '" class="btn btn-warning d-block mx-auto" style="width: 200px">Edit</a>';
                echo '<button onclick="deleteMenu(' . htmlspecialchars($row["menu_id"]) . ')" class="btn btn-danger d-block mx-auto mt-2" style="width: 200px">Delete</button>';
                echo '</div>'; // .card-body
                echo '</div>'; // .card
                echo '</div>'; // .col
            }
            $stmt->close();
            $conn->close();
            ?>

        </div>
    </section>

    <script src="https://stackpath.bootstrapcdn.com/bootstrap/5.2.0/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script>
        // Function to handle menu deletion with confirmation
        function deleteMenu(menuId) {
            Swal.fire({
                title: 'Are you sure?',
                text: 'Do you want to delete this menu?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes, delete it!',
                cancelButtonText: 'No, keep it'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Send POST request to delete the menu
                    fetch('menus.php', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: new URLSearchParams({
                                delete: true,
                                menu_id: menuId
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                // Show success message and reload the page
                                Swal.fire({
                                    title: 'Deleted!',
                                    text: 'Menu deleted successfully!',
                                    icon: 'success',
                                    timer: 2000,
                                    showConfirmButton: false
                                }).then(() => {
                                    location.reload();
                                });
                            } else {
                                // Show error message if deletion fails
                                Swal.fire({
                                    title: 'Error!',
                                    text: data.error || 'An error occurred.',
                                    icon: 'error',
                                    timer: 5000,
                                    showConfirmButton: true
                                });
                            }
                        })
                        .catch(error => {
                            // Show error message if request fails
                            Swal.fire({
                                title: 'Error!',
                                text: 'An error occurred while deleting the menu.',
                                icon: 'error',
                                timer: 5000,
                                showConfirmButton: true
                            });
                        });
                }
            });
        }
    </script>
</body>

</html>