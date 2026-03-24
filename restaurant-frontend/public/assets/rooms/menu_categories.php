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

// Fetch restaurant details based on restaurant_id from session
$stmt_restaurant = $conn->prepare('SELECT restaurant_name, email, contact_number, opening_time, closing_time FROM restaurant_tbl WHERE restaurant_id = ?');
$stmt_restaurant->bind_param('i', $restaurant_id);
$stmt_restaurant->execute();
$stmt_restaurant->bind_result($restaurant_name, $email, $contact_number, $opening_time, $closing_time);
$stmt_restaurant->fetch();
$stmt_restaurant->close();

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
?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

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

    <title>Item Categories</title>

    <style>
    body,
    html {
        height: 100%;
        margin: 0;
        display: flex;
        flex-direction: column;
    }

    #content {
        flex: 1;
        padding-bottom: 20px;
    }

    .col {
        display: flex;
        border: 1px solid #dee2e6;
        border-radius: 20px;
        padding: 10px;
        transition: transform 0.2s;
        height: 100%; /* Ensure columns take full height */
    }

    .card {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
        border-radius: 20px;
    }

    .card-img-top {
        height: 0;
        padding-bottom: 75%; /* 4:3 aspect ratio (3/4 = 0.75) */
        position: relative;
        overflow: hidden;
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
    }

    .card-img-top img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    /* Ensure button aligns at bottom */
    .card-body {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
    }

    .card-body .btn {
        margin-top: auto;
        align-self: center;
    }

    /* Hover effect */
    .col:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    /* Center cards in the container */
    .center-cards {
        justify-content: center;
    }
    
    .footer {
        padding: 0px 0;
        text-align: center;
        width: 100%;
    }

    .categories-container {
        text-align: center;
    }

    .center-cards {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
    }
    </style>
</head>

<body>
    <!-- header section starts  -->


    <div id="content">
        <?php
        include_once '../db.php';

        // Get menu_id from URL
        $menu_id = isset($_GET['menu_id']) ? intval($_GET['menu_id']) : 0;

        // Query to fetch the menu name
        $menu_name = "";
        $sql_menu = "SELECT menu_name FROM menu_tbl WHERE menu_id = ? AND restaurant_id = ?";
        $stmt_menu = $conn->prepare($sql_menu);
        if ($stmt_menu) {
            $stmt_menu->bind_param('ii', $menu_id, $restaurant_id);
            $stmt_menu->execute();
            $result_menu = $stmt_menu->get_result();
            if ($result_menu->num_rows > 0) {
                $row_menu = $result_menu->fetch_assoc();
                $menu_name = htmlspecialchars($row_menu["menu_name"]);
            } else {
                echo "<h1 class='heading'>Menu Not Found</h1>";
            }
            $stmt_menu->close();
        } else {
            echo "Query preparation failed: " . $conn->error;
        }

        ?>

        <!-- header section starts  -->
        <header class="header">
            <section class="flex">
                <a href="#home"
                    class="header-logo"><?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?></a>

                <nav class="navbar">
                    <a href="index.php">Menus</a>
                    <a href="request_service.php">Request Service</a>
                    <a href="./requests.php">My Requests</a>
                </nav>

                <div class="icons" id="navBar">
                    <div id="menu-btn" class="fas fa-bars"></div>
                    <div id="user-btn" class="fas fa-user"></div>
                    <div id="order-btn" class="fas fa-box"></div>
                    <div id="cart-btn" class="fas fa-shopping-cart">
                        <span>(<?php echo count($items); ?>)</span>
                    </div>
                </div>
            </section>
        </header>
        <!-- header section ends -->

        <!-- user account -->
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
                            echo "<p>Total Price : <span>$currency$total/-</span></p>";
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
                        echo '<p>' . htmlspecialchars($item['name']) . ' <span>('.htmlspecialchars($currency). htmlspecialchars($item['price']) . '/- x ' . htmlspecialchars($item['quantity']) . ' )</span></p>';
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
        <?php

        $restaurant_id = $_SESSION['restaurant_id'];
        $menu_name = "";

        // Ensure menu_id is set and valid
        if (isset($_GET['menu_id']) && is_numeric($_GET['menu_id'])) {
            $menu_id = intval($_GET['menu_id']);

            // Fetch menu name for the specified menu_id
            $sql_menu = "SELECT menu_name FROM menu_tbl WHERE menu_id = ? AND restaurant_id = ?";
            $stmt_menu = $conn->prepare($sql_menu);
            $stmt_menu->bind_param("ii", $menu_id, $restaurant_id);
            $stmt_menu->execute();
            $result_menu = $stmt_menu->get_result();

            if ($result_menu->num_rows > 0) {
                $row_menu = $result_menu->fetch_assoc();
                $menu_name = htmlspecialchars($row_menu['menu_name']);
            } else {
                $menu_name = "Menu Not Found";
            }

            $stmt_menu->close();
        } else {
            $menu_name = "Invalid Menu ID";
        }

        // Query to fetch categories for the specific menu
        $sql_categories = "SELECT category_id, category_name, description, image_url FROM category_tbl WHERE menu_id = ? AND restaurant_id = ?";
        $stmt_categories = $conn->prepare($sql_categories);
        $stmt_categories->bind_param("ii", $menu_id, $restaurant_id);
        $stmt_categories->execute();
        $result_categories = $stmt_categories->get_result();
        ?>


        <!-- Navigation section -->
        <nav class="py-2 px-4 text-center" style="margin-top: 8rem">
            <span><a href="./index.php">Menus</a> / <?php echo htmlspecialchars($menu_name); ?></span>
        </nav>

        <!-- Categories section -->
        <section class="container categories-container mb-4">
    <?php if (!empty($menu_name)) : ?>
        <h1 class="heading"><?php echo htmlspecialchars($menu_name); ?></h1>
        <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 center-cards">
            <?php
            if ($result_categories->num_rows > 0) {
                while ($row = $result_categories->fetch_assoc()) {
                    echo '<div class="col">';
                    echo '<a href="items.php?category_id=' . htmlspecialchars($row["category_id"]) . '" class="card-link">';
                    echo '<div class="card shadow fade-up">';
                    echo '<div class="card-img-top">';
                    echo '<img src="' . htmlspecialchars($row["image_url"]) . '" alt="category" />';
                    echo '</div>';
                    echo '<div class="card-body">';
                    echo '<h4 class="card-title">' . htmlspecialchars($row["category_name"]) . '</h4>';
                    echo '<p class="card-text mb-3">' . htmlspecialchars($row["description"]) . '</p>';
                    echo '<a href="items.php?category_id=' . htmlspecialchars($row["category_id"]) . '" class="btn" style="width: 200px">Explore!</a>';
                    echo '</div>';
                    echo '</div>';
                    echo '</a>';
                    echo '</div>';
                }
            } else {
                echo "<p>No categories found for this menu.</p>";
            }
            ?>
        </div>
    <?php endif; ?>
</section>

        <?php
        $conn->close();
        ?>


    </div>
</body>
<!-- footer section starts  -->

<footer class="footer">

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
</footer>
<!-- footer section ends -->
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

</html>