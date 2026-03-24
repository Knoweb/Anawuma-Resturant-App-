<?php
session_start();

// Redirect users to login if not authenticated
if (!isset($_SESSION['room_number']) || !isset($_SESSION['restaurant_id'])) {
    header('Location: ../login.php');
    exit();
}

// Include database connection
include_once '../db.php';

$timeout_duration = 450; // 7.5 minutes

// Check if last activity is set
if (isset($_SESSION['LAST_ACTIVITY'])) {
    $time_inactive = time() - $_SESSION['LAST_ACTIVITY'];

    if ($time_inactive >= $timeout_duration) {
        // Delete session entry from room_active_sessions table
        if (isset($_SESSION['room_number']) && isset($_SESSION['restaurant_id'])) {
            $room_number = $_SESSION['room_number'];
            $restaurant_id = $_SESSION['restaurant_id'];

            $stmt = $conn->prepare("DELETE FROM room_active_sessions WHERE room_number = ? AND restaurant_id = ?");
            $stmt->bind_param("ii", $room_number, $restaurant_id);
            $stmt->execute();
            $stmt->close();
        }

        // Unset and destroy the session
        session_unset();
        session_destroy();

        // Redirect to login page
        header("Location: ../login.php");
        exit();
    }
}

// Update the last activity time
$_SESSION['LAST_ACTIVITY'] = time();

$restaurant_id = $_SESSION['restaurant_id'];
$room_number = $_SESSION['room_number'];

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
$stmt_restaurant = $conn->prepare('SELECT restaurant_name, email, contact_number, opening_time, closing_time, logo FROM restaurant_tbl WHERE restaurant_id = ?');
$stmt_restaurant->bind_param('i', $restaurant_id);
$stmt_restaurant->execute();
$stmt_restaurant->bind_result($restaurant_name, $email, $contact_number, $opening_time, $closing_time, $logo);
$stmt_restaurant->fetch();
$stmt_restaurant->close();

// Change the logo path from ../assets/ to ./assets/
if ($logo) {
    $logo = str_replace('../', '../', $logo);
}

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
// Fetch today's special offers
$today = date('Y-m-d');
$query = "SELECT * FROM special_offers_tbl WHERE start_date <= '$today' AND end_date >= '$today' AND restaurant_id = '$restaurant_id'";
$result = mysqli_query($conn, $query);
$offers = [];
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Menus</title>

    <!-- FAVICON -->
    <link rel="icon" href="assets/imgs/favicon.png" type="assets/imgs/x-icon" />

    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />

    <!-- custom css file link  -->
    <link rel="stylesheet" href="../assets/css/styles.css" />

    <!-- Animations css -->
    <link rel="stylesheet" href="../assets/css/animatescroll.css" />

    <!-- Loader css -->
    <link rel="stylesheet" href="../assets/css/loading-styles.css" />

    <!-- font awesome cdn link  -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />

    <!-- jQuery CDN-->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.js"
        integrity="sha512-+k1pnlgt4F1H8L7t3z95o3/KO+o78INEcXTbnoJQ/F2VqDVhWoaiVml/OEHv9HsVgxUaVW+IbiZPUJQfF/YxZw=="
        crossorigin="anonymous" referrerpolicy="no-referrer"></script>

    <!-- SweetAlert CDN -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

     <style>
     .menu-img {
        width: 100%;
        aspect-ratio: 4 / 3; /* This enforces the 4:3 ratio */
        object-fit: cover; /* This ensures the image covers the space without distortion */
        border-top-left-radius: 20px;
        border-top-right-radius: 20px;
        display: block;
    }

    /* Update the card structure to maintain consistent height */
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
    }

    .card-img-top img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    /* Optional: ensure button aligns at bottom */
    .card-body .btn {
        margin-top: auto;
    }

        /* Modal styles */
        .modal {
            display: none;
            /* Hidden by default */
            position: fixed;
            /* Stay in place */
            z-index: 1000;
            /* Sit on top */
            left: 0;
            top: 0;
            width: 100%;
            /* Full width */
            height: 100%;
            /* Full height */
            overflow: auto;
            /* Enable scroll if needed */
            background-color: rgba(0, 0, 0, 0.8);
            /* Black w/ opacity */
            padding-top: 60px;
        }

        .modal-content {
            background-color: #fefefe;
            margin: 2% auto;
            padding: 20px;
            border: 1px solid #888;
            width: 90%;
            /* Full width on small screens */
            max-width: 700px;
            /* Limit the width */
            border-radius: 10px;
            box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
            animation: animatezoom 0.6s;
        }

        @keyframes animatezoom {
            from {
                transform: scale(0);
            }

            to {
                transform: scale(1);
            }
        }

        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }

        .close:hover,
        .close:focus {
            color: #000;
            text-decoration: none;
            cursor: pointer;
        }

        .offer-container {
            display: flex;
            flex-direction: column;
            /* Stack items vertically */
            align-items: center;
            /* Center items horizontally */
            text-align: center;
            /* Center text */
            margin-bottom: 20px;
            /* Add space between offers */
        }

        .offer-image {
            width: 100%;
            /* Full width */
            max-width: 300px;
            /* Limit image size */
            border-radius: 10px;
            margin-bottom: 20px;
            /* Add space below image */
        }

        .offer-details {
            margin: 0;
            /* Reset margin for better spacing */
        }

        .offer-details h2 {
            font-size: 24px;
            margin-bottom: 15px;
            color: #333;
        }

        .offer-details p {
            font-size: 16px;
            margin-bottom: 20px;
            color: #555;
        }

        .offer-button {
            display: inline-block;
            background-color: #ff6347;
            /* Tomato color */
            color: white;
            padding: 10px 20px;
            text-align: center;
            text-decoration: none;
            font-size: 16px;
            border-radius: 5px;
            transition: background-color 0.3s;
        }

        .offer-button:hover {
            background-color: #e5533c;
        }

        /* Media queries for responsiveness */
        @media (min-width: 600px) {
            .offer-container {
                flex-direction: row;
                /* Change to row direction on larger screens */
            }

            .offer-image {
                width: 50%;
                /* Half width for images on larger screens */
                margin-right: 20px;
                /* Add space to the right of the image */
            }

            .offer-details {
                margin-left: 20px;
                /* Add space to the left of the details */
                text-align: left;
                /* Align text to the left */
            }
        }

        /* Make the navbar sticky */
        header {
            position: sticky;
            top: 0;
            z-index: 999;
            /* Ensures it stays above other content */
            background-color: #fff;
            /* Ensure it has a background */
        }

        /* Adjust modal content margin */
        .modal-content {
            margin-top: 30px;
            /* Adjust based on your navbar height */
            background-color: #fefefe;
            padding: 20px;
            border: 1px solid #888;
            border-radius: 10px;
            max-width: 700px;
            box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
            animation: animatezoom 0.6s;
        }
    </style>
</head>

<body>
    <div class="loading" id="loading">
        <img src="<?php echo htmlspecialchars($logo);  ?>" width="300" alt="Logo" class="logo" />
        <div class="spinner"></div>
    </div>

    <div id="content" style="display: none;">
        <style>
            /* Style the special offer button */
            .special-offer-button {
                background: none;
                border: none;
                padding: 0;
                cursor: pointer;
            }

            /* Style the image inside the button */
            .special-offer-button img {
                width: 100px;
                /* Adjust the size as needed */
                animation: shake 1.5s;
                animation-iteration-count: infinite;
            }

            /* Keyframes for the shake animation */
            @keyframes shake {
                0% {
                    transform: translate(1px, 1px) rotate(0deg);
                }

                10% {
                    transform: translate(-1px, -2px) rotate(-1deg);
                }

                20% {
                    transform: translate(-3px, 0px) rotate(1deg);
                }

                30% {
                    transform: translate(3px, 2px) rotate(0deg);
                }

                40% {
                    transform: translate(1px, -1px) rotate(1deg);
                }

                50% {
                    transform: translate(-1px, 2px) rotate(-1deg);
                }

                60% {
                    transform: translate(-3px, 1px) rotate(0deg);
                }

                70% {
                    transform: translate(3px, 1px) rotate(-1deg);
                }

                80% {
                    transform: translate(-1px, -1px) rotate(1deg);
                }

                90% {
                    transform: translate(1px, 2px) rotate(0deg);
                }

                100% {
                    transform: translate(1px, -2px) rotate(-1deg);
                }
            }

            #showOfferButton {
                position: fixed;
                bottom: 20px;
                right: 20px;
                border: none;
                border-radius: 50%;
                padding: 15px 20px;
                cursor: pointer;
                z-index: 1000;
                transition: transform 0.3s ease;
            }

            #showOfferButton:hover {
                transform: scale(1.1);
            }
        </style>
        <!-- Special Offers Section -->
        <?php
        if ($result && mysqli_num_rows($result) > 0) {
            while ($row = mysqli_fetch_assoc($result)) {
                $offers[] = $row;
            }
        }
        ?>

        <?php if ($offers): ?>
            <button id="showOfferButton" class="special-offer-button">
                <img src="../assets/imgs/special-offer.png" alt="Special Offer">
            </button>

            <div id="specialOfferModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <?php foreach ($offers as $offer): ?>
                        <div class="offer-container">
                            <img src="<?php echo $offer['image_path']; ?>" alt="Special Offer" class="offer-image">
                            <div class="offer-details">
                                <h2><?php echo $offer['title']; ?></h2>
                                <p><?php echo $offer['description']; ?></p>
                                <?php
                                // Generate the appropriate URL based on the product type
                                if ($offer['product_type'] === 'menu') {
                                    $url = "./menu_categories.php?menu_id=" . $offer['product_id'];
                                } elseif ($offer['product_type'] === 'category') {
                                    $url = "./items.php?category_id=" . $offer['product_id'];
                                } elseif ($offer['product_type'] === 'item') {
                                    $url = "./single_item.php?food_item_id=" . $offer['product_id'];
                                } else {
                                    $url = "#"; // Fallback URL
                                }
                                ?>
                                <a href="<?php echo $url; ?>" class="offer-button">Explore</a>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endif; ?>

        <script>
            window.onload = function() {
                var modal = document.getElementById("specialOfferModal");
                var span = document.getElementsByClassName("close")[0];
                var button = document.getElementById("showOfferButton");

                // Check if modal and button exist before applying actions
                if (modal && span && button) {
                    // Automatically show the modal and hide the button after 5.2 seconds
                    setTimeout(function() {
                        modal.style.display = "block";
                        button.style.display = "none"; // Hide the button when the modal is shown
                    }, 5200); // 5200 milliseconds = 5.2 seconds

                    // Show the modal when the button is clicked and hide the button
                    button.onclick = function() {
                        modal.style.display = "block";
                        button.style.display = "none"; // Hide the button when the modal is shown
                    }

                    // Close the modal when the close button is clicked and show the button again
                    span.onclick = function() {
                        modal.style.display = "none";
                        button.style.display = "block"; // Show the button again
                    }

                    // Close the modal when clicking outside of it and show the button again
                    window.onclick = function(event) {
                        if (event.target == modal) {
                            modal.style.display = "none";
                            button.style.display = "block"; // Show the button again
                        }
                    }
                }
            };
        </script>

        <!-- header section starts  -->
        <header class="header">
            <section class="flex">
                <a href="#home"
                    class="header-logo"><?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?></a>

                <nav class="navbar">
                    <a href="#menu">Menus</a>
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

                <a href="#order" class="btn fade-up">order now</a>
            </section>
        </div>

        <!-- menus section starts -->
        <section id="menu" class="container mb-4" style="margin-top: 8rem">
            <h1 class="heading">Menus</h1>
           <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 center-cards">
            <?php
            include_once '../db.php';

            // Query to fetch menus
            $sql = "SELECT menu_id, menu_name, description, image_url FROM menu_tbl WHERE restaurant_id ='$restaurant_id'";
            $result = $conn->query($sql);

            while ($row = $result->fetch_assoc()) {
                echo '<div class="col">';
                echo '<a href="menu_categories.php?menu_id=' . htmlspecialchars($row["menu_id"]) . '" class="card-link">';
                echo '<div class="card shadow fade-up">';
                echo '<div class="card-img-top">';
                echo '<img src="../' . htmlspecialchars($row["image_url"]) . '" class="menu-img" alt="menu" />';
                echo '</div>';
                echo '<div class="card-body">';
                echo '<h4 class="card-title">' . htmlspecialchars($row["menu_name"]) . '</h4>';
                echo '<p class="card-text mb-3">' . htmlspecialchars($row["description"]) . '</p>';
                echo '<a href="./menu_categories.php?menu_id=' . htmlspecialchars($row["menu_id"]) . '" class="btn d-block mx-auto" style="width: 200px">Explore!</a>';
                echo '</div>';
                echo '</div>';
                echo '</a>';
                echo '</div>';
            }
            $conn->close();
            ?>
            </div>
        </section>
        <!-- menus section end -->

        <!-- order section starts -->
        <section class="order fade-up" id="order">
            <h1 class="heading">Order Now</h1>

            <form id="orderForm" action="./backend/place_order.php" method="post">
                <div class="display-orders">
                    <?php if (count($items) > 0) : ?>
                        <?php foreach ($items as $item) : ?>
                            <p><?php echo htmlspecialchars($item['name']); ?> <span>(
                                <?php echo htmlspecialchars($currency) ?><?php echo htmlspecialchars($item['price']); ?>/- x
                                    <?php echo htmlspecialchars($item['quantity']); ?> )</span></p>
                        <?php endforeach; ?>
                    <?php else : ?>
                        <p><span>Your cart is empty. </span></p>
                    <?php endif; ?>
                </div>
                <div class="grand-total">Grand Total : <span><?php echo htmlspecialchars($currency) ?><?php echo htmlspecialchars($total_price); ?>/-</span>
                </div>

                <div class="flex">
                    <div class="inputBox">
                        <span>Your Name :</span>
                        <input type="text" name="customer_name" class="box" placeholder="Enter your name" maxlength="20"
                            required />
                    </div>
                    <!-- Autofill room number from session -->
                    <div class="inputBox">
                        <span>Room Number :</span>
                        <input class="box" name="room_number" value="<?php echo htmlspecialchars($room_number); ?>"
                            readonly />
                    </div>
                    <!-- Note field for additional instructions -->
                    <div class="inputBox">
                        <span>Add a Note (optional):</span>
                        <textarea name="note" class="box" placeholder="Add any special instructions here..."></textarea>
                    </div>

                </div>


                <input type="hidden" name="action" value="place_order">
                <input type="submit" value="Order Now" class="btn" name="order" />
            </form>
        </section>
        <!-- order section ends -->

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

        function submitForm(event) {
            event.preventDefault(); // Prevent the default form submission

            // Fetch API example for submitting form data asynchronously
            const form = document.getElementById('orderForm');
            const formData = new FormData(form);

            fetch('./backend/place_order.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    console.log(data); // Log the response to inspect what is returned
                    if (data.status === 'success') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Order placed successfully!',
                            text: 'Your order has been placed. Thank you!',
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            // Reload the page after showing the SweetAlert
                            location.reload();
                        });
                    } else {
                        Swal.fire({
                            icon: 'error',
                            title: 'Failed',
                            text: 'Failed to place order. Please try again.'
                        });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Unexpected Error',
                        text: 'An unexpected error occurred. Please try again later.'
                    });
                });
        }

        // Attach the submitForm function to the form submit event
        document.getElementById('orderForm').addEventListener('submit', submitForm);
    </script>

    <!-- Gsap For Loading animation -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js"></script>

    <script src="../assets/js/animatescroll.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../assets/js/script.js"></script>
    <script src="../assets/js/loading-script.js"></script>

</body>

</html>