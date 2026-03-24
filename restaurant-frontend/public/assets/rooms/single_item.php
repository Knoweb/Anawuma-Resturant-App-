<?php
session_start();

// Redirect users to login if not authenticated
if (!isset($_SESSION['room_number']) || !isset($_SESSION['restaurant_id'])) {
    header('Location: ../login.php');
    exit();
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
    <title>Item</title>

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

    <!-- SweetAlert CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <!-- SweetAlert JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>

</head>


<body>
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

        .footer {
            padding: 0px 0;
            text-align: center;
            width: 100%;
        }

        /* Custom Alert Styles */
        .custom-alert {
            position: fixed;
            top: 3%;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px;
            border-radius: 5px;
            color: #fff;
            font-size: 12px;
            z-index: 1050;
            display: none;
            opacity: 0;
            transition: opacity 0.5s ease, top 0.5s ease;
        }

        .custom-alert.success {
            background-color: #28a745;
        }

        .custom-alert.error {
            background-color: #dc3545;
        }

        .custom-alert.show {
            display: block;
            opacity: 1;
            top: 3%;
        }
    </style>

    <div id="content">
        <!-- header section starts  -->
        <header class="header">
            <section class="flex">
                <a href="#home"
                    class="header-logo"><?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?></a>

                <nav class="navbar">
                    <a href="index.php">Menus</a>
                    <a href="request_service.php">Request Service</a>
                    <a href="requests.php">My Requests</a>
                </nav>

                <div class="icons">
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
                    <a class="fas fa-times" onclick="delete_item_from_cart('<?= $food_item_id ?>', '<?= $room_number ?>');"></a>
                <?php
                    echo '<img src="' . $image_url . '" alt="" />'; // Use the modified image URL here
                    echo '<div class="content">';
                    echo '<p>' . htmlspecialchars($item['name']) . ' <span>(' . htmlspecialchars($currency) . htmlspecialchars($item['price']) . '/- x ' . htmlspecialchars($item['quantity']) . ' )</span></p>';
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

    // Check if food item ID is provided and valid
    if (isset($_GET['food_item_id']) && filter_var($_GET['food_item_id'], FILTER_VALIDATE_INT)) {
        // Sanitize and cast the input to integer
        $food_item_id = (int) $_GET['food_item_id'];

        // Prepare and execute query to fetch food item details
        $sql = "SELECT f.*, c.currency FROM food_items_tbl f
            JOIN currency_types_tbl c ON f.currency_id = c.currency_id
            WHERE f.food_items_id = ? AND f.restaurant_id = ?";
        $stmt = $conn->prepare($sql);

        // Bind parameters and execute query
        $stmt->bind_param("ii", $food_item_id, $_SESSION['restaurant_id']);
        $stmt->execute();
        $result = $stmt->get_result();

        // Check if the food item exists
        if ($result->num_rows > 0) {
            // Fetch the food item data
            $row = $result->fetch_assoc();
            $food_item_name = htmlspecialchars($row['food_items_name'], ENT_QUOTES, 'UTF-8');
            $description = htmlspecialchars($row['description'], ENT_QUOTES, 'UTF-8');
            $price = htmlspecialchars($row['price'], ENT_QUOTES, 'UTF-8');
            $currency = htmlspecialchars($row['currency'], ENT_QUOTES, 'UTF-8');
            $category_id = htmlspecialchars($row['category_id'], ENT_QUOTES, 'UTF-8');
            $video_link = htmlspecialchars($row['video_link'], ENT_QUOTES, 'UTF-8');
            $blog_link = htmlspecialchars($row['blog_link'], ENT_QUOTES, 'UTF-8');

            // Fetch all images and store in an array
            $images = [];
            for ($i = 1; $i <= 4; $i++) {
                $image_url = htmlspecialchars($row["image_url_$i"], ENT_QUOTES, 'UTF-8');
                if (!empty($image_url)) {
                    $images[] = $image_url;
                }
            }

            // Limit the number of images to 5
            $images = array_slice($images, 0, 5);
    ?>
            <div class="container" style="margin-top: 8rem">
                <div class="row">
                    <div class="col-md-6 fade-right">
                        <div id="productCarousel" class="carousel slide" data-bs-ride="carousel">
                            <div class="carousel-inner">
                                <?php
                                foreach ($images as $index => $image_url) {
                                    $active = ($index == 0) ? 'active' : '';
                                    echo "<div class='carousel-item $active'>
                                            <img src='$image_url' class='d-block w-100' alt='Product Image " . ($index + 1) . "' />
                                          </div>";
                                }
                                ?>
                            </div>
                            <!-- Previous and Next controls -->
                            <a class="carousel-control-prev" href="#productCarousel" role="button" data-bs-slide="prev">
                                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Previous</span>
                            </a>
                            <a class="carousel-control-next" href="#productCarousel" role="button" data-bs-slide="next">
                                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Next</span>
                            </a>
                        </div>
                        <div class="mt-3 fade-right">
                            <!-- Thumbnail images -->
                            <div class="row">
                                <?php
                                foreach ($images as $index => $image_url) {
                                    echo "<div class='col-3'>
                                            <img src='$image_url' class='img-thumbnail' alt='Product Thumbnail " . ($index + 1) . "' data-bs-target='#productCarousel' data-bs-slide-to='$index' />
                                          </div>";
                                }
                                ?>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 fade-left">
                        <!-- Product details -->
                        <h2><?php echo $food_item_name; ?></h2>
                        <p class="price"><?php echo $currency; ?> <?php echo $price; ?></p>
                        <p class="short-description"><?php echo $description; ?></p>
                        <div class="purchase-container">
                            <span>Quantity :</span>
                            <input type="number" class="form-control quantity" value="1" min="1" placeholder="Quantity" />
                            <button type="button" class="btn add-to-cart mt-2"
                                onclick="addToCart(<?php echo $food_item_id; ?>)">Add to Cart</button>
                        </div>
                        <div class="mt-4">
                            <!-- Product video -->
                            <h4>Product Video</h4>
                            <div class="ratio ratio-16x9">
                                <iframe src="<?php echo $video_link; ?>" title="Product Video" allowfullscreen></iframe>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Additional product details and description -->
                <!-- Add more details and description as needed -->
                <div class="product-details mt-4 fade-down">
                    <h3>More Details</h3>
                    <!-- Additional details content -->
                </div>

                <div class="product-description mt-5 fade-up">
                    <h3>Description</h3>
                    <!-- Product description content -->
                </div>

                <div class="related-links mt-5 fade-right">
                    <!-- Related links -->
                    <h3>Related Links</h3>
                    <a href="<?php echo $blog_link; ?>" class="btn btn-secondary">About Item</a>
                    <!-- Add more related links as needed -->
                </div>
            </div>

    <?php
        } else {
            // Food item not found, display an error message or redirect
            echo "<div class='container'><div class='alert alert-danger mt-5'>Food item not found.</div></div>";
        }

        // Close the prepared statement and database connection
        $stmt->close();
        $conn->close();
    } else {
        // Food item ID is not provided, display an error message or redirect
        echo "<div class='container'><div class='alert alert-danger mt-5'>Food item ID not provided.</div></div>";
    }
    ?>

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
    </div>

    <script src="../assets/js/animatescroll.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../assets/js/script.js"></script>
    <script>
        // Function to show custom alert
        function showAlert(type, message) {
            const alertElement = document.createElement('div');
            alertElement.classList.add('custom-alert');
            alertElement.classList.add(type);
            alertElement.textContent = message;
            document.body.appendChild(alertElement);

            // Show the alert with a fade-in effect
            setTimeout(() => {
                alertElement.classList.add('show');
            }, 10);

            // Hide the alert after 1.5 seconds with a fade-out effect
            setTimeout(() => {
                alertElement.classList.remove('show');
                setTimeout(() => {
                    alertElement.remove();
                    location.reload(); // Refresh the page
                }, 500); // match the transition duration
            }, 1500);
        }

        // Function to add item to cart with custom alert
        function addToCart(foodItemId) {
            const quantity = document.querySelector('.quantity').value; // Get quantity value

            // Prepare form data
            const formData = new FormData();
            formData.append('action', 'add_to_cart');
            formData.append('food_item_id', foodItemId);
            formData.append('quantity', quantity);
            formData.append('room_number', '<?php echo htmlspecialchars($room_number); ?>');

            // Perform AJAX request
            fetch('backend/cart_operations.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        // Show success message using custom alert
                        showAlert('success', 'successfully added to cart');
                    } else {
                        // Show error message using custom alert
                        showAlert('error', 'Failed to add item to cart');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showAlert('error', 'An error occurred while processing your request');
                });
        }

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


</body>

</html>