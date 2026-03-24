<?php
// Database connection
include_once "../db.php";

// Start the session
session_start();

// Redirect to login page if the admin is not logged in
if (!isset($_SESSION['admin_id'])) {
    header("Location: login.php");
    exit;
}

// Check if the restaurant has access to the Special Offers privilege
if (!in_array('Special Offers', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Initialize error array
$errors = [];

// Check if the form was submitted
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Retrieve and sanitize form data
    $title = htmlspecialchars(trim($_POST['title']), ENT_QUOTES, 'UTF-8');
    $description = htmlspecialchars(trim($_POST['description']), ENT_QUOTES, 'UTF-8');
    $product_type = htmlspecialchars(trim($_POST['product_type']), ENT_QUOTES, 'UTF-8');
    $product_id = htmlspecialchars(trim($_POST['product_id']), ENT_QUOTES, 'UTF-8');
    $start_date = htmlspecialchars(trim($_POST['start_date']), ENT_QUOTES, 'UTF-8');
    $end_date = htmlspecialchars(trim($_POST['end_date']), ENT_QUOTES, 'UTF-8');

    // Server-side Validation
    // Validate Title
    if (empty($title)) {
        $errors[] = "Offer Title is required.";
    } elseif (strlen($title) < 3 || strlen($title) > 100) {
        $errors[] = "Offer Title must be between 3 and 100 characters.";
    }

    // Validate Description
    if (empty($description)) {
        $errors[] = "Offer Description is required.";
    } elseif (strlen($description) < 10 || strlen($description) > 500) {
        $errors[] = "Offer Description must be between 10 and 500 characters.";
    }

    // Validate Product Type
    $allowed_product_types = ['menu', 'category', 'item'];
    if (!in_array($product_type, $allowed_product_types)) {
        $errors[] = "Invalid Product Type selected.";
    }

    // Validate Product ID (assuming it's an integer)
    if (empty($product_id) || !is_numeric($product_id)) {
        $errors[] = "Product selection is invalid.";
    } else {
        $product_id = intval($product_id); // Convert to integer after validation
    }

    // Validate Start Date and End Date
    if (empty($start_date)) {
        $errors[] = "Start Date is required.";
    }
    if (empty($end_date)) {
        $errors[] = "End Date is required.";
    }

    // Check if dates are valid and in correct order
    if (!empty($start_date) && !empty($end_date)) {
        $start_timestamp = strtotime($start_date);
        $end_timestamp = strtotime($end_date);
        $current_timestamp = strtotime(date('Y-m-d')); // Get today's date timestamp

        if ($start_timestamp === false || $end_timestamp === false) {
            $errors[] = "Invalid date format.";
        } else {
            if ($start_timestamp < $current_timestamp) {
                $errors[] = "Start Date cannot be in the past.";
            }
            if ($end_timestamp < $start_timestamp) {
                $errors[] = "End Date cannot be earlier than Start Date.";
            }
        }
    }

    // Handle file upload only if no other errors and a file is present
    $image_path = ''; // Initialize image path
    if (empty($errors)) {
        if (!empty($_FILES['image']['name'])) {
            $image = $_FILES['image'];
            $uploadDir = '../assets/imgs/offers/'; // Directory to save uploaded images
            
            // Create directory if it doesn't exist
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            $uniqueFileName = $restaurant_id . '-' . uniqid() . '-' . basename($image['name']); // Unique file name with restaurant ID
            $uploadFile = $uploadDir . $uniqueFileName; // Final file path

            // Check if the uploaded file is an image
            $check = getimagesize($image['tmp_name']);
            if ($check === false) {
                $errors[] = 'File is not an image.';
            }

            // Check for upload errors
            if ($image['error'] !== UPLOAD_ERR_OK) {
                $errors[] = 'File upload error: ' . htmlspecialchars($image['error']);
            }

            // Limit file types and sizes (e.g., 2MB)
            $imageFileType = strtolower(pathinfo($uploadFile, PATHINFO_EXTENSION));
            if (!in_array($imageFileType, ['jpg', 'jpeg', 'png', 'gif'])) {
                $errors[] = 'Invalid file type. Only JPG, JPEG, PNG & GIF files are allowed.';
            }

            if ($image['size'] > 2 * 1024 * 1024) { // 2MB limit
                $errors[] = 'File size exceeds 2MB limit.';
            }

            // If no file-specific errors, attempt to move the file
            if (empty($errors)) {
                if (!move_uploaded_file($image['tmp_name'], $uploadFile)) {
                    $errors[] = 'Failed to move uploaded file.';
                } else {
                    $image_path = $uploadFile;
                }
            }
        } else {
            $errors[] = "Image is required for the offer.";
        }
    }


    // If no validation errors, proceed with database insertion
    if (empty($errors)) {
        // Query to count existing offers for today
        $current_date = date('Y-m-d');
        $countQuery = $conn->prepare("SELECT COUNT(*) FROM special_offers_tbl WHERE DATE(start_date) = ? AND restaurant_id = ?");
        $countQuery->bind_param("si", $current_date, $restaurant_id);
        $countQuery->execute();
        $countQuery->bind_result($offer_count);
        $countQuery->fetch();
        $countQuery->close();

        // Check if the count of today's offers is less than 3
        if ($offer_count < 3) {
            // Prepare the SQL statement to prevent SQL injection
            $stmt = $conn->prepare("INSERT INTO special_offers_tbl (title, description, image_path, product_type, product_id, start_date, end_date, restaurant_id) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssisi", $title, $description, $image_path, $product_type, $product_id, $start_date, $end_date, $restaurant_id);

            // Execute the SQL statement
            if ($stmt->execute()) {
                $_SESSION['message'] = 'Offer added successfully!';
                $_SESSION['msg_type'] = 'success';
            } else {
                $_SESSION['message'] = 'Error adding offer: ' . htmlspecialchars($stmt->error);
                $_SESSION['msg_type'] = 'error';
            }
            $stmt->close();
        } else {
            $_SESSION['message'] = 'You can only add a maximum of 3 special offers per day.';
            $_SESSION['msg_type'] = 'error';
        }
    } else {
        // Store errors in session to display them
        $_SESSION['message'] = implode("<br>", $errors);
        $_SESSION['msg_type'] = 'error';
    }
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// Check if the request for products was made (AJAX call)
if (isset($_GET['type']) && isset($_GET['restaurant_id'])) {
    $product_type = htmlspecialchars(trim($_GET['type']));
    $ajax_restaurant_id = intval($_GET['restaurant_id']); // Use a separate variable for AJAX restaurant_id

    // Prepare the SQL query based on product type
    switch ($product_type) {
        case 'menu':
            $sql = "SELECT menu_id AS id, menu_name AS name FROM menu_tbl WHERE restaurant_id = ?";
            break;
        case 'category':
            $sql = "SELECT category_id AS id, category_name AS name FROM category_tbl WHERE restaurant_id = ?";
            break;
        case 'item':
            $sql = "SELECT food_items_id AS id, food_items_name AS name FROM food_items_tbl WHERE restaurant_id = ?";
            break;
        default:
            echo json_encode([]); // Return an empty array if no valid type provided
            exit();
    }

    // Use prepared statements for fetching products
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $ajax_restaurant_id); // Bind the restaurant ID
    $stmt->execute();
    $result = $stmt->get_result();
    $products = [];

    // Fetch the products
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $products[] = $row; // Add each product to the array
        }
    }

    // Return the products as JSON
    header('Content-Type: application/json');
    echo json_encode($products);
    $stmt->close();
    mysqli_close($conn);
    exit(); // Exit after returning JSON
}

// Close the connection if it's not an AJAX request and not being used for post
if (empty($_POST) && empty($_GET['type'])) {
    $conn->close();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Special Offer</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <style>
        body {
            padding: 20px;
            background-color: #f8f9fa;
        }

        .container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            padding: 25px;
            margin-top: 20px;
        }

        .back-button {
            display: inline-block;
            margin-bottom: 20px;
            padding: 8px 16px;
            background-color: #6c757d;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.3s;
            text-decoration: none;
            font-size: 14px;
        }

        .back-button:hover {
            background-color: #5a6268;
            color: white;
        }

        .form-label {
            font-weight: 500;
            margin-bottom: 8px;
        }

        .char-counter-container {
            display: flex;
            justify-content: space-between;
            margin-top: 5px;
            margin-bottom: 10px;
        }

        .char-counter {
            font-size: 0.8rem;
            color: #6c757d;
        }

        .char-counter.remaining {
            text-align: right;
        }

        .char-counter.warning {
            color: #fd7e14;
        }

        .char-counter.danger {
            color: #dc3545;
            font-weight: bold;
        }

        .form-text {
            margin-top: 5px;
            font-size: 0.85rem;
            color: #6c757d;
        }

        .form-control,
        .form-select {
            padding: 10px;
            border-radius: 4px;
        }

        .btn-primary {
            padding: 10px 20px;
            font-weight: 500;
        }

        h2 {
            color: #343a40;
            margin-bottom: 25px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
    </style>
</head>

<body>
    <div class="container">
        <a href="javascript:history.back()" class="back-button"><i class="fas fa-arrow-left"></i> Back</a>
        <h2>Add Special Offer</h2>

        <form action="" method="POST" enctype="multipart/form-data" class="needs-validation" novalidate>
            <div class="mb-4">
                <label for="title" class="form-label">Offer Title:</label>
                <input type="text" name="title" id="title" class="form-control" placeholder="Enter Offer Title"
                    minlength="3" maxlength="100" required oninput="updateTitleCounter()">
                <div class="char-counter-container">
                    <span class="char-counter">Minimum 3, Maximum 100 characters</span>
                    <span class="char-counter remaining"><span id="title-counter">100</span> characters
                        remaining</span>
                </div>
                <div class="invalid-feedback">
                    Offer Title is required and must be between 3 and 100 characters.
                </div>
            </div>

            <div class="mb-4">
                <label for="description" class="form-label">Offer Description:</label>
                <textarea name="description" id="description" class="form-control"
                    placeholder="Enter Offer Description" minlength="10" maxlength="500" required
                    oninput="updateDescCounter()"></textarea>
                <div class="char-counter-container">
                    <span class="char-counter">Minimum 10, Maximum 500 characters</span>
                    <span class="char-counter remaining"><span id="desc-counter">500</span> characters
                        remaining</span>
                </div>
                <div class="invalid-feedback">
                    Offer Description is required and must be between 10 and 500 characters.
                </div>
            </div>

            <div class="mb-4">
                <label for="image" class="form-label">Upload Image:</label>
                <input type="file" name="image" id="image" class="form-control" accept="image/jpeg,image/png,image/gif" required>
                <div class="form-text">JPG, JPEG, PNG, GIF formats only. Max 2MB.</div>
                <div class="invalid-feedback">
                    An image file (JPG, JPEG, PNG, GIF) is required and must be less than 2MB.
                </div>
            </div>

            <div class="mb-4">
                <label for="product_type" class="form-label">Select Product Type:</label>
                <select name="product_type" id="product_type" class="form-select" required>
                    <option value="" disabled selected>Select a product type</option>
                    <option value="menu">Menu</option>
                    <option value="category">Category</option>
                    <option value="item">Item</option>
                </select>
                <div class="invalid-feedback">
                    Please select a product type.
                </div>
            </div>

            <div class="mb-4">
                <label for="product_id" class="form-label">Select Product:</label>
                <select name="product_id" id="product_id" class="form-select" required>
                    <option value="" disabled selected>Select a product</option>
                    </select>
                <div class="invalid-feedback">
                    Please select a product.
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="start_date" class="form-label">Start Date:</label>
                    <input type="date" name="start_date" id="start_date" class="form-control" required>
                    <div class="invalid-feedback">
                        Start Date is required and cannot be in the past.
                    </div>
                </div>
                <div class="col-md-6">
                    <label for="end_date" class="form-label">End Date:</label>
                    <input type="date" name="end_date" id="end_date" class="form-control" required min="">
                    <div class="invalid-feedback">
                        End Date is required and cannot be earlier than the Start Date.
                    </div>
                </div>
            </div>
            <button type="submit" class="btn btn-primary">Add Offer</button>
        </form>

        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>

        <script>
            // Function to update character counters
            function updateTitleCounter() {
                const titleInput = document.getElementById('title');
                const counterSpan = document.getElementById('title-counter');
                const remaining = 100 - titleInput.value.length;
                counterSpan.textContent = remaining;
                updateCounterStyle(counterSpan, remaining);
            }

            function updateDescCounter() {
                const descriptionInput = document.getElementById('description');
                const counterSpan = document.getElementById('desc-counter');
                const remaining = 500 - descriptionInput.value.length;
                counterSpan.textContent = remaining;
                updateCounterStyle(counterSpan, remaining);
            }

            function updateCounterStyle(counterSpan, remaining) {
                const container = counterSpan.closest('.char-counter');
                container.classList.remove('warning', 'danger');
                if (remaining < 50 && remaining >= 0) {
                    container.classList.add('warning');
                }
                if (remaining < 20 && remaining >= 0) {
                    container.classList.remove('warning'); // Remove warning if danger applies
                    container.classList.add('danger');
                }
                if (remaining < 0) {
                    container.classList.add('danger'); // If over limit
                }
            }


            $(document).ready(function() {
                // Initialize character counters on page load
                updateTitleCounter();
                updateDescCounter();

                // SweetAlert notifications based on PHP session variables
                <?php if (isset($_SESSION['message'])) : ?>
                    const message = "<?php echo addslashes($_SESSION['message']); ?>";
                    const msgType = "<?php echo $_SESSION['msg_type']; ?>";

                    Swal.fire({
                        title: msgType === 'success' ? "Success!" : "Error!",
                        html: message, // Use html for potential <br> tags
                        icon: msgType,
                        showConfirmButton: false, // Hide the OK button
                        timer: 3000 // Set a timer for 3 seconds
                    }).then(() => {
                        <?php if ($_SESSION['msg_type'] === 'success') : ?>
                            // Redirect to the index page after the alert
                            window.location.href = "index.php"; // Change to your index page for successful addition
                        <?php endif; ?>
                    });

                    <?php
                    // Clear the session variables after displaying the message
                    unset($_SESSION['message']);
                    unset($_SESSION['msg_type']);
                    ?>
                <?php endif; ?>

                // Handle dynamic product loading based on selected product type
                $('#product_type').on('change', function() {
                    const productType = this.value;
                    const productSelect = $('#product_id');
                    const restaurantId = <?php echo json_encode($restaurant_id); ?>; // Pass restaurant_id to JS

                    productSelect.empty().append(
                        '<option value="" disabled selected>Select a product</option>');

                    if (productType) {
                        $.get(`?type=${productType}&restaurant_id=${restaurantId}`, function(data) {
                            if (data.length > 0) {
                                data.forEach(function(product) {
                                    productSelect.append(
                                        `<option value="${product.id}">${product.name}</option>`
                                    );
                                });
                            } else {
                                productSelect.append('<option value="" disabled>No products found</option>');
                            }
                        }).fail(function() {
                            console.error('Error fetching products');
                            productSelect.append('<option value="" disabled>Error loading products</option>');
                        });
                    }
                });

                // Date Picker logic
                const startDateInput = document.getElementById('start_date');
                const endDateInput = document.getElementById('end_date');
                const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

                // Set min date for start date to today
                startDateInput.min = today;

                // Update min date for end date when start date changes
                startDateInput.addEventListener('change', function() {
                    if (this.value) {
                        endDateInput.min = this.value;
                        // If end date is before new start date, clear it
                        if (endDateInput.value && endDateInput.value < this.value) {
                            endDateInput.value = '';
                        }
                    } else {
                        endDateInput.min = today; // If start date cleared, reset end date min to today
                    }
                });

                // Set initial min date for end date (on page load, it should be today if start_date is empty)
                if (!startDateInput.value) {
                    endDateInput.min = today;
                }


                // Bootstrap Form Validation (Client-side)
                (function() {
                    'use strict'
                    const forms = document.querySelectorAll('.needs-validation')
                    Array.prototype.slice.call(forms)
                        .forEach(function(form) {
                            form.addEventListener('submit', function(event) {
                                if (!form.checkValidity()) {
                                    event.preventDefault()
                                    event.stopPropagation()
                                }

                                // Custom validation for image file
                                const imageInput = document.getElementById('image');
                                const fileSize = imageInput.files[0] ? imageInput.files[0].size : 0; // in bytes
                                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                                const fileType = imageInput.files[0] ? imageInput.files[0].type : '';

                                if (imageInput.hasAttribute('required') && !imageInput.files[0]) {
                                    imageInput.classList.add('is-invalid');
                                    event.preventDefault();
                                    event.stopPropagation();
                                } else if (imageInput.files[0]) {
                                    if (fileSize > 2 * 1024 * 1024) { // 2MB
                                        imageInput.classList.add('is-invalid');
                                        imageInput.nextElementSibling.nextElementSibling.textContent = 'File size exceeds 2MB limit.';
                                        event.preventDefault();
                                        event.stopPropagation();
                                    } else if (!allowedTypes.includes(fileType)) {
                                        imageInput.classList.add('is-invalid');
                                        imageInput.nextElementSibling.nextElementSibling.textContent = 'Invalid file type. Only JPG, JPEG, PNG & GIF files are allowed.';
                                        event.preventDefault();
                                        event.stopPropagation();
                                    } else {
                                        imageInput.classList.remove('is-invalid');
                                        imageInput.classList.add('is-valid');
                                    }
                                } else {
                                     imageInput.classList.remove('is-invalid'); // In case it was previously invalid
                                }


                                form.classList.add('was-validated')
                            }, false)
                        })
                })()
            });
        </script>

    </div>
</body>

</html>