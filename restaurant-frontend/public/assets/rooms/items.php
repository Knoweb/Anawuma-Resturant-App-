<?php
session_start();

// Redirect users to login if not authenticated
if (!isset($_SESSION['room_number'])) {
    header('Location: ../login.php');
    exit();
}

// Ensure restaurant_id is available in the session
if (!isset($_SESSION['restaurant_id'])) {
    header("Location: ../login.php");
    exit;
}
$restaurant_id = $_SESSION['restaurant_id'];
$room_number = $_SESSION['room_number'];

// Include database connection
include_once '../db.php';

// Fetch restaurant details based on restaurant_id from session
$stmt_restaurant = $conn->prepare('SELECT restaurant_name, email, contact_number, opening_time, closing_time FROM restaurant_tbl WHERE restaurant_id = ?');
$stmt_restaurant->bind_param('i', $restaurant_id);
$stmt_restaurant->execute();
$stmt_restaurant->bind_result($restaurant_name, $email, $contact_number, $opening_time, $closing_time);
$stmt_restaurant->fetch();
$stmt_restaurant->close();

// Fetch currency_id for the specific restaurant
$stmt_currency_id = $conn->prepare('SELECT currency_id FROM restaurant_tbl WHERE restaurant_id = ?');
$stmt_currency_id->bind_param('i', $restaurant_id);
$stmt_currency_id->execute();
$stmt_currency_id->bind_result($currency_id);
$stmt_currency_id->fetch();
$stmt_currency_id->close();

// Fetch the currency symbol or name from currency_types_tbl based on the currency_id
$stmt_currency = $conn->prepare('SELECT currency FROM currency_types_tbl WHERE currency_id = ?');
$stmt_currency->bind_param('i', $currency_id);
$stmt_currency->execute();
$stmt_currency->bind_result($currency);
$stmt_currency->fetch();
$stmt_currency->close();

// Query to fetch items in the shopping cart for the specific room number
$sql = "SELECT *
        FROM food_items_tbl fi
        INNER JOIN room_cart_tbl c ON fi.food_items_id = c.food_item_id
        WHERE c.room_number = '$room_number' AND c.restaurant_id = '$restaurant_id'";
$result = $conn->query($sql);

$items = [];
$total_price = 0;

if ($result->num_rows > 0) {
    // Fetching items and calculating total price
    while ($row = $result->fetch_assoc()) {
        $item_name = htmlspecialchars($row['food_items_name']);
        $price = htmlspecialchars($row['price']);
        $quantity = htmlspecialchars($row['quantity']);
        $food_item_id = htmlspecialchars($row['food_item_id']);
        $room_number = htmlspecialchars($row['room_number']);
        $subtotal = $price * $quantity;
        $total_price += $subtotal;

        // Store item details in array for later use in HTML
        $items[] = [
            'food_item_id' => $food_item_id,
            'room_number' => $room_number,
            'name' => $item_name,
            'price' => $price,
            'quantity' => $quantity,
            'subtotal' => $subtotal,
            'image_url' => htmlspecialchars($row['image_url_1'])
        ];
    }
}

// Initialize category name
$category_name = "";
$menu_name = "";

// Check if category ID is provided in the URL and if it's a valid integer
if (isset($_GET['category_id']) && is_numeric($_GET['category_id'])) {
    // Sanitize the input
    $category_id = intval($_GET['category_id']);

    // Prepare and execute query to fetch the category name
    $sql_category = "SELECT category_name FROM category_tbl WHERE category_id = ? AND restaurant_id = ?";
    $stmt_category = $conn->prepare($sql_category);
    $stmt_category->bind_param("ii", $category_id, $restaurant_id);
    $stmt_category->execute();
    $result_category = $stmt_category->get_result();

    // Check if the category name is fetched successfully
    if ($result_category->num_rows > 0) {
        // Fetch the category name
        $row_category = $result_category->fetch_assoc();
        // Sanitize and assign the category name
        $category_name = htmlspecialchars($row_category['category_name']);
    } else {
        // If category name not found
        $category_name = "Category Not Found";
    }

    // Fetch the menu name for the specified food category from the database
    $sql_menu = "SELECT m.menu_name FROM menu_tbl m
    INNER JOIN category_tbl c ON m.menu_id = c.menu_id
    WHERE c.category_id = ? AND c.restaurant_id = ?";
    $stmt_menu = $conn->prepare($sql_menu);
    $stmt_menu->bind_param("ii", $category_id, $restaurant_id);
    $stmt_menu->execute();
    $result_menu = $stmt_menu->get_result();

    // Check if the query was successful and if there is at least one row returned
    if ($result_menu && $result_menu->num_rows > 0) {
        // Fetch the first row to get the menu name
        $row_menu = $result_menu->fetch_assoc();
        // Sanitize and assign the menu name
        $menu_name = htmlspecialchars($row_menu['menu_name']);
    } else {
        // If the query fails or no menu name is found, set a default value
        $menu_name = "Menu Not Found";
    }

    // Free the result set
    $result_menu->free_result();
} else {
    // If category ID is not provided in the URL or not a valid integer
    $category_name = "Category Not Specified";
}

// Pagination variables
$itemsPerPage = 8; // Number of items to display per page
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1; // Current page number
$offset = ($page - 1) * $itemsPerPage;

// Get subcategory filter if set
$subcategoryFilter = isset($_GET['subcategory']) && $_GET['subcategory'] !== 'all' ? intval($_GET['subcategory']) : null;

// Build the base query
$baseSql = "SELECT f.*, c.currency FROM food_items_tbl f
            JOIN currency_types_tbl c ON f.currency_id = c.currency_id
            WHERE f.category_id = ? AND f.restaurant_id = ?";

// Add subcategory filter if needed
if ($subcategoryFilter !== null) {
    $baseSql .= " AND f.subcategory_id = ?";
}

// Count query - Modified version
$countSql = "SELECT COUNT(*) as total FROM food_items_tbl f
             WHERE f.category_id = ? AND f.restaurant_id = ?";

// Add subcategory filter if needed
if ($subcategoryFilter !== null) {
    $countSql .= " AND f.subcategory_id = ?";
}

$countStmt = $conn->prepare($countSql);

if ($subcategoryFilter !== null) {
    $countStmt->bind_param("iii", $category_id, $restaurant_id, $subcategoryFilter);
} else {
    $countStmt->bind_param("ii", $category_id, $restaurant_id);
}

if (!$countStmt->execute()) {
    die("Error executing count query: " . $countStmt->error);
}

$countResult = $countStmt->get_result();
if (!$countResult) {
    die("Error getting count result: " . $conn->error);
}

$countData = $countResult->fetch_assoc();
if (!$countData) {
    die("No count data returned");
}

// Debug output (remove after testing)
// var_dump($countData);

$totalItems = $countData['total'];
$countStmt->close();

// Calculate total pages
$totalPages = ceil($totalItems / $itemsPerPage);
// Main query with pagination
$sql = $baseSql . " LIMIT ?, ?";
$stmt = $conn->prepare($sql);
if ($subcategoryFilter !== null) {
    $stmt->bind_param("iiii", $category_id, $restaurant_id, $subcategoryFilter, $offset, $itemsPerPage);
} else {
    $stmt->bind_param("iiii", $category_id, $restaurant_id, $offset, $itemsPerPage);
}
$stmt->execute();
$result = $stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Animations css -->
    <link rel="stylesheet" href="../assets/css/animatescroll.css" />

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />

    <!-- font awesome cdn link  -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />

    <!-- custom css file link  -->
    <link rel="stylesheet" href="../assets/css/styles.css" />
    <!-- jQuery CDN-->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.js"
        integrity="sha512-+k1pnlgt4F1H8L7t3z95o3/KO+o78INEcXTbnoJQ/F2VqDVhWoaiVml/OEHv9HsVgxUaVW+IbiZPUJQfF/YxZw=="
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>

    <!-- SweetAlert CDN -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <title>Items</title>

    <style>
        html,
        body {
            height: 100%;
            margin: 0;
            display: flex;
            flex-direction: column;
        }

        #content {
            flex: 1;
            padding-bottom: 20px;
        }

        /* Image styling inside each box */
        .item-box img {
            max-width: 100%;
            max-height: 200px;
            object-fit: cover;
            margin-bottom: 15px;
        }

        .item-box {
            border: 1px solid #dee2e6;
            border-radius: 20px;
            transition: transform 0.2s;
        }

        .footer {
            text-align: center;
            margin-top: auto;
        }

        /* Custom alert styles */
        #alert-container {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
        }

        .alert {
            padding: 10px 20px;
            border-radius: 5px;
            color: #fff;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
            position: relative;
            margin-bottom: 10px;
        }

        .alert-success {
            background-color: #28a745;
            /* Green color */
        }

        .alert-danger {
            background-color: #dc3545;
            /* Red color */
        }

        .fade-in {
            opacity: 1;
        }

        .fade-out {
            opacity: 0;
        }

        .subcategory-buttons {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 20px;
        }

        .subcategory-btn {
            margin: 0 5px;
            padding: 10px 20px;
            cursor: pointer;
        }

        .subcategory-btn.active {
            background: linear-gradient(to right, var(--deep-sea) 0%, var(--sunset-pink) 100%);
            color: #fff;
        }

       .box-container .box {
            display: flex;
            flex-direction: column;
            border: 1px solid #dee2e6;
            border-radius: 20px;
            padding: 15px;
            transition: transform 0.2s;
            height: 100%;
            position: relative;
        }

        .box-container .box:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .box-container .box img {
            width: 100%;
            height: 200px; /* Fixed height for ITEM images */
            object-fit: cover;
            border-radius: 15px;
            margin-bottom: 15px;
        }

        .box-container .box .price {
            position: absolute;
            top: 15px;
            left: 15px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 16px;
        }

        .box-container .box .name {
            margin: 10px 0;
            font-size: 18px;
            font-weight: bold;
            flex-grow: 1;
        }

        /* Specific styles for CART ITEMS only */
        .shopping-cart .box {
            /* Your existing cart styles */
            display: flex;
            flex-direction: row;
            align-items: center;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 10px;
            background: #f9f9f9;
        }

        .shopping-cart .box img {
            /* Reset or specify cart-specific image styles */
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 5px;
            margin-right: 15px;
        }

        /* Pagination styles */
        .pagination {
            display: flex;
            justify-content: center;
            margin-top: 30px;
            flex-wrap: wrap;
            gap: 10px;
        }

        .pagination a.btn {
            padding: 8px 15px;
            border-radius: 5px;
            background: #f0f0f0;
            color: #333;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        .pagination a.btn.active {
            background: linear-gradient(to right, var(--deep-sea) 0%, var(--sunset-pink) 100%);
            color: white;
        }

        .pagination a.btn:hover:not(.active) {
            background: #ddd;
        }

        .pagination .dots {
            padding: 8px 5px;
            color: #666;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
            .box-container {
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            }
            
            .pagination {
                gap: 5px;
            }
            
            .pagination a.btn {
                padding: 6px 10px;
                font-size: 14px;
            }
        }

        @media (max-width: 480px) {
            .box-container {
                grid-template-columns: 1fr;
            }
        }
        
        .no-items,
        .no-items-message {
            text-align: center;
            margin-top: 20px;
            font-size: 18px;
            color: red;
        }

        @media (max-width: 768px) {
            .subcategory-btn-container {
                flex-direction: column;
                align-items: center;
            }

            .subcategory-btn {
                width: 27%;
                /* Makes buttons larger and more touch-friendly */
                max-width: 200px;
                /* Ensures buttons are not too wide */
                text-align: center;
            }
        }
    </style>
</head>

<body>
    <!-- header section starts  -->
    <div id="content">
        <header class="header">
            <section class="flex">
                <a href="#home"
                    class="header-logo"><?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?></a>

                <nav class="navbar">
                    <a href="index.php">Menus</a>
                    <a href="request_service.php">Request Service</a>
                    <a href="./requests.php">My Requests</a>
                </nav>

                <div class="icons">
                    <div id="menu-btn" class="fas fa-bars"></div>
                    <div id="user-btn" class="fas fa-user"></div>
                    <div id="order-btn" class="fas fa-box"></div>
                    <div id="cart-btn" class="fas fa-shopping-cart">
                        <span id="cart-count">(<?php echo count($items); ?>)</span>
                    </div>

                </div>
            </section>
        </header>
        <!-- header section ends -->

        <!-- user account  -->
        <div class="user-account">
            <section>
                <div id="close-account"><span>close</span></div>

                <div class="user">
                    <p>You are Logged in as Room No.<span> <?php echo $room_number; ?></span></p>
                </div>

                <div class="display-orders">
                    <?php if (count($items) > 0) : ?>
                        <?php foreach ($items as $item) : ?>
                            <p><?php echo htmlspecialchars($item['name']); ?> <span>(
                                <?php echo htmlspecialchars($currency) ?><?php echo htmlspecialchars($item['price']); ?>/- x
                                    <?php echo htmlspecialchars($item['quantity']); ?> )</span></p>
                        <?php endforeach; ?>
                    <?php else : ?>
                        <p class="empty"> <span>Your cart is empty. </span></p>
                    <?php endif; ?>
                </div>
            </section>
        </div>

        <!-- orders -->
        <div class="my-orders">
            <section>
                <div id="close-orders"><span>close</span></div>

                <h3 class="title">my orders</h3>

                <?php
                $sql = "SELECT * FROM room_orders_tbl WHERE room_number=? AND restaurant_id=? AND completed=0";
                $stmt1 = $conn->prepare($sql);
                $stmt1->bind_param("ii", $room_number, $restaurant_id);
                $stmt1->execute();
                $result1 = $stmt1->get_result();
                $total = 0;

                if ($result1->num_rows > 0) {
                    while ($row = $result1->fetch_assoc()) {
                        $food_item_id = $row['food_item_id'];
                        $date = $row['order_date'];
                        $name = $row['customer_name'];
                        $quantity = $row['quantity'];
                        $note = $row['note'];
                        $order_status = $row['order_status']; // Fetch order status

                        echo '<div class="box fade-down">';
                        echo "<p>Placed on : <span>$date</span></p>";
                        echo "<p>Name : <span>$name</span></p>";
                        echo "<p>Note : <span>$note</span></p>";
                        echo '<p>Order Status : <span style="color: var(--deep-sea)">' . $order_status . '</span></p>'; // Display order status

                        $sql2 = "SELECT * FROM food_items_tbl WHERE food_items_id=?";
                        $stmt2 = $conn->prepare($sql2);
                        $stmt2->bind_param("i", $food_item_id);
                        $stmt2->execute();
                        $result2 = $stmt2->get_result();

                        if ($result2->num_rows > 0) {
                            $row2 = $result2->fetch_assoc();
                            $food_name = $row2['food_items_name'];
                            $price = $row2['price'];
                            $total += $price * $quantity;
                ?>
                            <p>Your Orders : <span><?= $food_name ?> <?= htmlspecialchars($currency) ?><?= $price ?>/- x <?= $quantity ?></span></p>
                <?php
                            echo "<p>Total Price : <span> $currency$total/-</span></p>";
                            echo '</div>';
                        }
                        $stmt2->close();
                        $result2->close();
                    }
                }
                $stmt1->close();
                $result1->close();
                ?>
            </section>
        </div>

        <div class="shopping-cart">
            <section id="cartReload">
                <div id="close-cart"><span>close</span></div>

                <?php if (count($items) > 0) : ?>
                    <?php
                    // Assuming $items is your array of items fetched from the database
                    foreach ($items as $item) {
                        $image_url = htmlspecialchars($item['image_url']);
                        $food_item_id = htmlspecialchars($item['food_item_id']);
                        $room_number = htmlspecialchars($item['room_number']);
                        echo '<div class="box fade-left">';
                    ?>
                        <a class="fas fa-times"
                            onclick="delete_item_from_cart('<?= $food_item_id ?>', '<?= $room_number ?>');"></a>
                    <?php
                        echo '<img src="' . $image_url . '" alt="" />'; // Use the modified image URL here
                        echo '<div class="content">';
                        echo '<p>' . htmlspecialchars($item['name']) . ' <span>( '.htmlspecialchars($currency). htmlspecialchars($item['price']) . '/- x ' . htmlspecialchars($item['quantity']) . ' )</span></p>';
                        echo '<form action="" method="post">';
                        echo '<input type="number" class="qty" name="qty" min="1" max="99" value="' . htmlspecialchars($item['quantity']) . '" maxlength="2" readonly />';
                        echo '<button type="submit" name="update_qty" class="fas fa-edit"></button>';
                        echo '</form>';
                        echo '</div>';
                        echo '</div>';
                    }
                    ?>
                <?php else : ?>
                    <p class="empty">your cart is empty!</p>
                <?php endif; ?>

                <a href="./index.php#order" class="btn fade-up">order now</a>
            </section>
        </div>

        <!-- Navigation section -->
        <nav class="py-2 px-4 text-center" style="margin-top: 8rem">
            <span><a href="./index.php">Menus</a> / <a href="javascript:history.back()">
                    <?php echo htmlspecialchars($menu_name); ?> </a>/
                <?php echo htmlspecialchars($category_name); ?></span>
        </nav>

        <!-- Alert container -->
        <div id="alert-container"></div>

        <!-- Menu section -->
        <section id="menu" class="menu">
            <h1 class="heading"><?php echo htmlspecialchars($category_name); ?></h1>
            <div class="subcategory-buttons text-center mb-4">
                <!-- PHP to dynamically generate subcategory buttons -->
                <?php
                // Check if category ID is provided in the URL
                if (isset($_GET['category_id']) && is_numeric($_GET['category_id'])) {
                    $category_id = intval($_GET['category_id']);

                    // Fetch subcategories for the specified category
                    $sql_subcategories = "SELECT subcategory_id, subcategory_name FROM subcategory_tbl WHERE parent_category_id = ?";
                    $stmt_subcategories = $conn->prepare($sql_subcategories);
                    $stmt_subcategories->bind_param("i", $category_id);
                    $stmt_subcategories->execute();
                    $result_subcategories = $stmt_subcategories->get_result();

                    // Check if there are subcategories for the specified category
                    if ($result_subcategories->num_rows > 0) {
                        echo '<button class="btn subcategory-btn active" data-subcategory="all">All</button>';
                        while ($row_subcategory = $result_subcategories->fetch_assoc()) {
                            echo '<button class="btn subcategory-btn" data-subcategory="' . htmlspecialchars($row_subcategory['subcategory_id']) . '">' . htmlspecialchars($row_subcategory['subcategory_name']) . '</button>';
                        }
                    }
                    $stmt_subcategories->close();
                }
                ?>
            </div>
            <div class="box-container">
                <!-- PHP to fetch and display food items -->
                <?php
                if ($result->num_rows > 0) {
                    // Display items
                    while ($row = $result->fetch_assoc()) {
                        // Get subcategory ID, if available, otherwise set to 'all'
                        $subcategory_id = isset($row['subcategory_id']) ? $row['subcategory_id'] : 'all';
                        echo '<div class="box fade-up" data-subcategory="' . htmlspecialchars($subcategory_id) . '">';
                        echo '<a href="single_item.php?food_item_id=' . htmlspecialchars($row['food_items_id']) . '" class="box-link fade-up">';
                        echo '<div class="price">' . htmlspecialchars($row['currency']) . '<span>' . htmlspecialchars($row['price']) . '</span>/-</div>';
                        echo '<img src="' . htmlspecialchars($row['image_url_1']) . '" alt="' . htmlspecialchars($row['food_items_name']) . '" />';
                        echo '<h4 class="name">' . htmlspecialchars($row['food_items_name']) . '</h4>';
                        echo '</a>';
                        // Add to Cart form
                        echo '<form action="backend/cart_operations.php" method="post" class="add-to-cart-form">';
                        echo '<input type="hidden" name="action" value="add_to_cart">';
                        echo '<input type="hidden" name="food_item_id" value="' . htmlspecialchars($row['food_items_id']) . '">';
                        echo '<input type="number" min="1" max="100" value="1" class="qty" name="quantity" />';
                        echo '<input type="hidden" name="room_number" value="' . htmlspecialchars($room_number) . '">';
                        echo '<input type="submit" value="Add to Cart" class="btn" />';
                        echo '</form>';
                        echo '</div>';
                    }
                } else {
                    // If no items found for the category
                    echo "<p class='no-items'>No items found for this category.</p>";
                }
                ?>
                <p class='no-items-message empty' style='display: none;'>No items found for this subcategory.</p>
            </div>

            <!-- Pagination controls -->
            <?php if ($totalPages > 1) : ?>
                <div class="pagination">
                    <?php 
                    // Add subcategory parameter to pagination links
                    $subcategoryParam = isset($_GET['subcategory']) ? '&subcategory='.$_GET['subcategory'] : '';
                    
                    if ($page > 1) : ?>
                        <a href="?category_id=<?= $category_id ?><?= $subcategoryParam ?>&page=<?= ($page - 1) ?>" class="btn">Previous</a>
                    <?php endif; ?>
                    
                    <?php 
                    // Show page numbers
                    $startPage = max(1, $page - 2);
                    $endPage = min($totalPages, $page + 2);
                    
                    if ($startPage > 1) : ?>
                        <a href="?category_id=<?= $category_id ?><?= $subcategoryParam ?>&page=1" class="btn">1</a>
                        <?php if ($startPage > 2) : ?>
                            <span class="dots">...</span>
                        <?php endif; ?>
                    <?php endif; ?>
                    
                    <?php for ($i = $startPage; $i <= $endPage; $i++) : ?>
                        <a href="?category_id=<?= $category_id ?><?= $subcategoryParam ?>&page=<?= $i ?>" class="btn <?= ($i == $page ? 'active' : '') ?>"><?= $i ?></a>
                    <?php endfor; ?>
                    
                    <?php if ($endPage < $totalPages) : ?>
                        <?php if ($endPage < $totalPages - 1) : ?>
                            <span class="dots">...</span>
                        <?php endif; ?>
                        <a href="?category_id=<?= $category_id ?><?= $subcategoryParam ?>&page=<?= $totalPages ?>" class="btn"><?= $totalPages ?></a>
                    <?php endif; ?>
                    
                    <?php if ($page < $totalPages) : ?>
                        <a href="?category_id=<?= $category_id ?><?= $subcategoryParam ?>&page=<?= ($page + 1) ?>" class="btn">Next</a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        </section>
    </div>
</body>
<!-- footer section starts  -->
<div class="footer">
    <div class="box-container">
        <div class="box">
            <i class="fas fa-phone"></i>
            <h3>phone number</h3>
            <p><?php echo htmlspecialchars($contact_number, ENT_QUOTES, 'UTF-8'); ?></p>
        </div>

        <div class="box">
            <i class="fas fa-clock"></i>
            <h3>opening hours</h3>
            <p>
                <?php echo htmlspecialchars(date('h:i A', strtotime($opening_time)), ENT_QUOTES, 'UTF-8'); ?> to
                <?php echo htmlspecialchars(date('h:i A', strtotime($closing_time)), ENT_QUOTES, 'UTF-8'); ?>
            </p>
        </div>

        <div class="box">
            <i class="fas fa-envelope"></i>
            <h3>email address</h3>
            <p><?php echo htmlspecialchars($email, ENT_QUOTES, 'UTF-8'); ?></p>
        </div>
    </div>

    <div class="credit">
        <p>&copy; <?php echo date("Y"); ?> Knoweb. All rights reserved !</p>
    </div>
</div>

<!-- footer section ends -->
</div>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Select all add to cart forms
        const addToCartForms = document.querySelectorAll('.add-to-cart-form');

        // Add event listener to each form
        addToCartForms.forEach(form => {
            form.addEventListener('submit', function(event) {
                event.preventDefault(); // Prevent default form submission

                // Serialize form data
                const formData = new FormData(form);

                // Perform AJAX request
                fetch('backend/cart_operations.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        const alertContainer = document.getElementById(
                            'alert-container');
                        const alertDiv = document.createElement('div');
                        alertDiv.classList.add('alert');

                        if (data.status === 'success') {
                            // Show success message
                            alertDiv.classList.add('alert-success', 'fade-in');
                            alertDiv.textContent = 'Successfully added to cart';

                            // Update the cart count
                            const cartCountElement = document.getElementById(
                                'cart-count');
                            let currentCount = parseInt(cartCountElement.textContent
                                .match(/\d+/)[0]);
                            cartCountElement.textContent = `(${currentCount + 1})`;
                        } else {
                            // Show error message
                            alertDiv.classList.add('alert-danger', 'fade-in');
                            alertDiv.textContent = 'Failed to add item to cart';
                        }

                        alertContainer.appendChild(alertDiv);

                        // Fade out alert after 2 seconds
                        setTimeout(() => {
                            alertDiv.classList.remove('fade-in');
                            alertDiv.classList.add('fade-out');

                            // Remove the alert from the DOM after the fade-out is complete
                            setTimeout(() => {
                                    alertContainer.removeChild(alertDiv);
                                    location.reload(); // Refresh the page
                                },
                                500
                            ); // Match this duration with the CSS transition
                        }, 1500); // Duration before starting fade-out
                    })
                    .catch(error => {
                        const alertContainer = document.getElementById(
                            'alert-container');
                        const alertDiv = document.createElement('div');
                        alertDiv.classList.add('alert', 'alert-danger', 'fade-in');
                        alertDiv.textContent = 'An error occurred. Please try again.';
                        alertContainer.appendChild(alertDiv);

                        // Fade out alert after 2 seconds
                        setTimeout(() => {
                            alertDiv.classList.remove('fade-in');
                            alertDiv.classList.add('fade-out');

                            // Remove the alert from the DOM after the fade-out is complete
                            setTimeout(() => {
                                    alertContainer.removeChild(alertDiv);
                                },
                                500
                            ); // Match this duration with the CSS transition
                        }, 1500); // Duration before starting fade-out
                    });
            });
        });
    });
</script>


<script src="../assets/js/animatescroll.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="../assets/js/script.js"></script>

<script>
    function delete_item_from_cart(food_item_id, room_number) {
        $.ajax({
            url: "backend/delete-from-cart.php",
            method: "POST",
            data: {
                food_item_id: food_item_id,
                room_number: room_number
            },
            success: function(response) {
                var data = JSON.parse(response);
                if (data.status === "success") {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Item has been deleted from cart.',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        location.reload(); // Refresh the page
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: 'Something went wrong: ' + data.message
                    });
                }
            },
            error: function(xhr, status, error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'An error occurred. Please try again.'
                });
            }
        });
    }
</script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const buttons = document.querySelectorAll('.subcategory-btn');
        const foodBoxes = document.querySelectorAll('.box.fade-up');
        const noItemsMessage = document.querySelector('.no-items-message');

        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const subcategory = this.getAttribute('data-subcategory');
                const currentCategoryId = new URLSearchParams(window.location.search).get('category_id');
                const currentPage = new URLSearchParams(window.location.search).get('page') || 1;

                // Update URL without reload if it's the same subcategory (for pagination)
                if (subcategory === 'all') {
                    window.history.pushState(null, '', `?category_id=${currentCategoryId}&page=${currentPage}`);
                } else {
                    window.history.pushState(null, '', `?category_id=${currentCategoryId}&subcategory=${subcategory}&page=${currentPage}`);
                }

                // Remove active class from all buttons
                buttons.forEach(btn => btn.classList.remove('active'));
                // Add active class to the clicked button
                this.classList.add('active');

                let hasVisibleItems = false;

                // Show/hide food boxes based on subcategory
                foodBoxes.forEach(box => {
                    const boxSubcategory = box.getAttribute('data-subcategory');
                    if (subcategory === 'all' || boxSubcategory === subcategory) {
                        box.style.opacity = 0;
                        box.style.display = 'block';
                        // Fade in effect
                        setTimeout(() => {
                            box.style.opacity = 1;
                        }, 10);
                        hasVisibleItems = true;
                    } else {
                        box.style.opacity = 0;
                        setTimeout(() => {
                            box.style.display = 'none';
                        }, 800); // Delay hiding to allow for fade out effect
                    }
                });

                // Show or hide the 'no items' message
                if (noItemsMessage) {
                    if (hasVisibleItems) {
                        noItemsMessage.style.display = 'none';
                    } else {
                        noItemsMessage.style.display = 'block';
                    }
                }
            });
        });
    });
</script>

</html>
<?php
// Close the database connection
$conn->close();
?>