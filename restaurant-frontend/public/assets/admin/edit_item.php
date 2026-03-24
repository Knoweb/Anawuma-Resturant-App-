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

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

include_once '../db.php';

// Define the directory where uploaded images will be stored
$targetDir = "../assets/imgs/item-img/"; // Ensure the trailing slash

$food_items_id = $food_items_name = $description = $moreDetails = $price = $currency_id = $category_id = $subcategory_id = $video_link = $blog_link = '';
$image_urls = [];
$restaurantCurrencyId = ''; // Initialize for currency fetch
$restaurantCurrency = ''; // Initialize for currency fetch

// Fetch the currency for the restaurant
$currencyQuery = "
    SELECT c.currency_id, c.currency
    FROM restaurant_tbl r
    JOIN currency_types_tbl c ON r.currency_id = c.currency_id
    WHERE r.restaurant_id = ?";
$stmtCurrency = $conn->prepare($currencyQuery);
$stmtCurrency->bind_param("i", $restaurant_id);
$stmtCurrency->execute();
$stmtCurrency->bind_result($restaurantCurrencyId, $restaurantCurrency);
$stmtCurrency->fetch();
$stmtCurrency->close();

// Define the directory where uploaded videos will be stored
$videoTargetDir = "../assets/videos/item-videos/"; // Ensure the trailing slash

// Function to handle file upload and return the file path
function uploadFile($file, $targetDir, $restaurant_id)
{
    // Generate a unique filename to prevent overwriting existing files
    $fileName = $restaurant_id . '_' . uniqid() . '_' . basename($file['name']); // Prefix with restaurant ID
    $targetFilePath = $targetDir . $fileName;
    $imageFileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));

    // Check if image file is an actual image
    $check = getimagesize($file["tmp_name"]);
    if ($check === false) {
        throw new Exception("File is not an image.");
    }

    // Check file size (limit to 3MB)
    if ($file["size"] > 3000000) {
        throw new Exception("File is too large (max 3MB).");
    }

    // Allow only certain file formats
    $allowedFormats = ["jpg", "jpeg", "png", "gif"];
    if (!in_array($imageFileType, $allowedFormats)) {
        throw new Exception("Only JPG, JPEG, PNG & GIF files are allowed.");
    }

    // Move the uploaded file to the target directory
    if (!move_uploaded_file($file["tmp_name"], $targetFilePath)) {
        throw new Exception("Error uploading file.");
    }

    return $targetFilePath;
}

// Function to handle video file upload
function uploadVideoFile($file, $targetDir, $restaurant_id)
{
    // Generate a unique filename to prevent overwriting existing files
    $fileName = $restaurant_id . '_' . uniqid() . '_' . basename($file['name']); // Prefix with restaurant ID
    $targetFilePath = $targetDir . $fileName;
    $videoFileType = strtolower(pathinfo($targetFilePath, PATHINFO_EXTENSION));

    // Check file size (limit to 50MB for videos)
    if ($file["size"] > 52428800) { // 50MB in bytes
        throw new Exception("Video file is too large (max 50MB).");
    }

    // Allow only certain video formats
    $allowedFormats = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
    if (!in_array($videoFileType, $allowedFormats)) {
        throw new Exception("Only MP4, WebM, OGG, MOV, AVI & MKV video files are allowed.");
    }

    // Move the uploaded file to the target directory
    if (!move_uploaded_file($file["tmp_name"], $targetFilePath)) {
        throw new Exception("Error uploading video file.");
    }

    return '../assets/videos/item-videos/' . $fileName; // Return relative path for database
}

// Fetch existing food item data if food_items_id is provided
if (isset($_GET['food_items_id']) && is_numeric($_GET['food_items_id'])) {
    $food_items_id = intval($_GET['food_items_id']);

    $sql = "SELECT f.*
            FROM food_items_tbl f
            WHERE f.food_items_id = ? AND f.restaurant_id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ii', $food_items_id, $restaurant_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $food_items_name = htmlspecialchars($row['food_items_name'], ENT_QUOTES, 'UTF-8');
        $description = htmlspecialchars($row['description'], ENT_QUOTES, 'UTF-8');
        $moreDetails = htmlspecialchars($row['more_details'], ENT_QUOTES, 'UTF-8'); // Fetch more_details
        $price = htmlspecialchars($row['price'], ENT_QUOTES, 'UTF-8');
        $currency_id = $row['currency_id'];
        $category_id = $row['category_id'];
        $subcategory_id = $row['subcategory_id'];
        $video_link = htmlspecialchars($row['video_link'], ENT_QUOTES, 'UTF-8');
        $blog_link = htmlspecialchars($row['blog_link'], ENT_QUOTES, 'UTF-8');

        for ($i = 1; $i <= 4; $i++) {
            $image_urls["image_url_$i"] = htmlspecialchars($row["image_url_$i"], ENT_QUOTES, 'UTF-8');
        }
    } else {
        header("Location: items.php?error=" . urlencode("Food item not found or you don't have access."));
        exit;
    }
    $result->free_result();
    $stmt->close();
} else {
    header("Location: items.php?error=" . urlencode("Food item ID not specified or invalid."));
    exit;
}

// Handle form submission for update
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    try {
        // Ensure target directories exist
        if (!file_exists($targetDir)) {
            mkdir($targetDir, 0777, true);
        }
        if (!file_exists($videoTargetDir)) {
            mkdir($videoTargetDir, 0777, true);
        }

        // Sanitize and validate input data
        $itemName = htmlspecialchars($_POST['itemName'], ENT_QUOTES, 'UTF-8');
        $description = htmlspecialchars($_POST['description'], ENT_QUOTES, 'UTF-8');
        $moreDetails = htmlspecialchars($_POST['moreDetails'], ENT_QUOTES, 'UTF-8');
        $price = floatval($_POST['price']);
        $category = intval($_POST['category']);
        $subcategory = isset($_POST['subcategory']) && $_POST['subcategory'] !== '' ? intval($_POST['subcategory']) : NULL;
        $blogLink = filter_var($_POST['blogLink'], FILTER_VALIDATE_URL) ? htmlspecialchars($_POST['blogLink'], ENT_QUOTES, 'UTF-8') : '';
        
        // Handle video file upload
        $videoLink = $video_link; // Keep existing video if no new upload
        if (!empty($_FILES['videoFile']['name'])) {
            $videoLink = uploadVideoFile($_FILES['videoFile'], $videoTargetDir, $restaurant_id);
        }

        // Validate description length (max 350 characters)
        if (strlen($description) > 350) {
            throw new Exception("Description must be 350 characters or less.");
        }

        // Validate more details length (max 400 characters)
        if (strlen($moreDetails) > 400) {
            throw new Exception("More details must be 400 characters or less.");
        }

        // Handle image uploads
        $new_image_urls = [];
        for ($i = 1; $i <= 4; $i++) {
            $image_field_name = "image$i";
            if (!empty($_FILES[$image_field_name]['name'])) {
                // New image uploaded, process it
                $new_image_urls[$image_field_name] = uploadFile($_FILES[$image_field_name], $targetDir, $restaurant_id);
            } else {
                // No new image, retain existing one or set to NULL if intentionally cleared (not implemented in form yet)
                $new_image_urls[$image_field_name] = isset($image_urls["image_url_$i"]) ? $image_urls["image_url_$i"] : '';
            }
        }

        // Check if the subcategory ID is valid or set it to NULL if not
        if ($subcategory !== NULL) {
            $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM subcategory_tbl WHERE subcategory_id = ? AND parent_category_id = ? AND restaurant_id = ?");
            $stmtCheck->bind_param("iii", $subcategory, $category, $restaurant_id);
            $stmtCheck->execute();
            $stmtCheck->bind_result($count);
            $stmtCheck->fetch();
            $stmtCheck->close();

            if ($count == 0) {
                $subcategory = NULL; // Invalid subcategory for this category/restaurant
            }
        }


        // Prepare SQL statement to update data into the database
        $stmt = $conn->prepare("
            UPDATE food_items_tbl
            SET food_items_name = ?, description = ?, more_details = ?, price = ?, currency_id = ?, category_id = ?, subcategory_id = ?,
                image_url_1 = ?, image_url_2 = ?, image_url_3 = ?, image_url_4 = ?, video_link = ?, blog_link = ?
            WHERE food_items_id = ? AND restaurant_id = ?
        ");

        $stmt->bind_param(
            "sssdiiissssssii",
            $itemName,
            $description,
            $moreDetails,
            $price,
            $restaurantCurrencyId, // Use the fetched restaurantCurrencyId
            $category,
            $subcategory,
            $new_image_urls['image1'],
            $new_image_urls['image2'],
            $new_image_urls['image3'],
            $new_image_urls['image4'],
            $videoLink,
            $blogLink,
            $food_items_id,
            $restaurant_id
        );

        if ($stmt->execute()) {
            // Set success flag in session
            $_SESSION['update_success'] = true;
            // Redirect to the form with a success message
            header("Location: " . $_SERVER['PHP_SELF'] . "?food_items_id=" . $food_items_id);
            exit();
        } else {
            throw new Exception("Error updating data: " . $stmt->error);
        }
    } catch (Exception $e) {
        // Redirect with error message
        header("Location: " . $_SERVER['PHP_SELF'] . "?food_items_id=" . $food_items_id . "&error=" . urlencode($e->getMessage()));
        exit();
    }
}

// Fetch categories for the dropdown
$stmt_categories = $conn->prepare("SELECT category_id, category_name FROM category_tbl WHERE restaurant_id = ?");
$stmt_categories->bind_param("i", $restaurant_id);
$stmt_categories->execute();
$result_categories = $stmt_categories->get_result();

// If a category is already selected (e.g., on page load), fetch its subcategories
$current_subcategories = [];
if ($category_id !== null) {
    $stmt_subcategories = $conn->prepare("SELECT subcategory_id, subcategory_name FROM subcategory_tbl WHERE parent_category_id = ? AND restaurant_id = ?");
    $stmt_subcategories->bind_param("ii", $category_id, $restaurant_id);
    $stmt_subcategories->execute();
    $result_current_subcategories = $stmt_subcategories->get_result();
    while ($row = $result_current_subcategories->fetch_assoc()) {
        $current_subcategories[] = $row;
    }
    $stmt_subcategories->close();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Food Item</title>
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

        .current-image-preview {
            max-width: 100px;
            height: auto;
            margin-top: 5px;
            border-radius: 4px;
            box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>

<body>
    <div class="container">
        <button class="back-button" onclick="history.back();">
            <i class="fas fa-arrow-left"></i> Back
        </button>
        <h2>Edit Food Item</h2>

        <form action="<?php echo htmlspecialchars($_SERVER["PHP_SELF"]) . '?food_items_id=' . $food_items_id; ?>"
            method="post" enctype="multipart/form-data">
            <div class="mb-4">
                <label for="itemName" class="form-label">Item Name</label>
                <input type="text" id="itemName" name="itemName" class="form-control"
                    value="<?php echo $food_items_name; ?>" required>
            </div>

            <div class="mb-4">
                <label for="description" class="form-label">Description</label>
                <textarea id="description" name="description" class="form-control" rows="4" maxlength="350"
                    oninput="updateDescCounter()" required><?php echo $description; ?></textarea>
                <div class="char-counter-container">
                    <span class="char-counter">Maximum 350 characters allowed</span>
                    <span class="char-counter remaining"><span id="desc-counter">350</span> characters remaining</span>
                </div>
            </div>

            <div class="mb-4">
                <label for="moreDetails" class="form-label">More Details</label>
                <textarea id="moreDetails" name="moreDetails" class="form-control" rows="4" maxlength="400"
                    oninput="updateDetailsCounter()"><?php echo $moreDetails; ?></textarea>
                <div class="char-counter-container">
                    <span class="char-counter">Maximum 400 characters allowed</span>
                    <span class="char-counter remaining"><span id="details-counter">400</span> characters
                        remaining</span>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="currency" class="form-label">Currency</label>
                    <input type="hidden" name="currency"
                        value="<?php echo htmlspecialchars($restaurantCurrencyId, ENT_QUOTES, 'UTF-8'); ?>" />
                    <input type="text" id="currency" class="form-control"
                        value="<?php echo htmlspecialchars($restaurantCurrency, ENT_QUOTES, 'UTF-8'); ?>" readonly />
                </div>
                <div class="col-md-6">
                    <label for="price" class="form-label">Price</label>
                    <input type="number" id="price" name="price" class="form-control" step="0.01"
                        value="<?php echo $price; ?>" required>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="category" class="form-label">Category</label>
                    <select id="category" name="category" class="form-select" required>
                        <option value="">Select Category</option>
                        <?php
                        if ($result_categories->num_rows > 0) {
                            $result_categories->data_seek(0); // Reset pointer for second loop if needed
                            while ($row_category = $result_categories->fetch_assoc()) {
                                $selected = ($row_category["category_id"] == $category_id) ? "selected" : "";
                                echo "<option value='" . htmlspecialchars($row_category["category_id"], ENT_QUOTES, 'UTF-8') . "' $selected>" . htmlspecialchars($row_category["category_name"], ENT_QUOTES, 'UTF-8') . "</option>";
                            }
                        } else {
                            echo "<option value=''>No categories found</option>";
                        }
                        ?>
                    </select>
                </div>
                <div class="col-md-6">
                    <div id="subcategory-container" style="display: none;">
                        <label for="subcategory" class="form-label">Subcategory</label>
                        <select id="subcategory" name="subcategory" class="form-select">
                            <option value="">Select Subcategory</option>
                            <?php
                            // Populate subcategories if a category is already selected
                            if (!empty($current_subcategories)) {
                                foreach ($current_subcategories as $sub) {
                                    $selected = ($sub["subcategory_id"] == $subcategory_id) ? "selected" : "";
                                    echo "<option value='" . htmlspecialchars($sub["subcategory_id"], ENT_QUOTES, 'UTF-8') . "' $selected>" . htmlspecialchars($sub["subcategory_name"], ENT_QUOTES, 'UTF-8') . "</option>";
                                }
                            }
                            ?>
                        </select>
                    </div>
                </div>
            </div>

            <?php for ($i = 1; $i <= 4; $i++): ?>
                <div class="mb-4">
                    <label for="image<?php echo $i; ?>" class="form-label">Image <?php echo $i; ?></label>
                    <input type="file" id="image<?php echo $i; ?>" name="image<?php echo $i; ?>" class="form-control">
                    <div class="form-text">Optional (JPG, JPEG, PNG, GIF - Max 3MB). Uploading a new image will replace the
                        current one.</div>
                    <?php if (!empty($image_urls["image_url_$i"])): ?>
                        <div class="mt-2">
                            <p class="mb-0">Current Image <?php echo $i; ?>:</p>
                            <img src="<?php echo htmlspecialchars($image_urls["image_url_$i"]); ?>"
                                alt="Current Image <?php echo $i; ?>" class="current-image-preview">
                            <input type="hidden" name="existing_image<?php echo $i; ?>"
                                value="<?php echo htmlspecialchars($image_urls["image_url_$i"]); ?>">
                        </div>
                    <?php endif; ?>
                </div>
            <?php endfor; ?>


            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="videoFile" class="form-label">Video File</label>
                    <input type="file" id="videoFile" name="videoFile" class="form-control" accept="video/*">
                    <div class="form-text">Optional (Browse video file from your laptop)</div>
                    <?php if (!empty($video_link)) : ?>
                        <div class="mt-2">
                            <small class="text-muted">Current: <?php echo htmlspecialchars($video_link); ?></small>
                        </div>
                    <?php endif; ?>
                </div>
                <div class="col-md-6">
                    <label for="blogLink" class="form-label">Blog Link</label>
                    <input type="url" id="blogLink" name="blogLink" class="form-control"
                        value="<?php echo $blog_link; ?>">
                    <div class="form-text">Optional (must be a valid URL)</div>
                </div>
            </div>

            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button type="submit" class="btn btn-primary">Update Item</button>
            </div>
        </form>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <script>
        // Update character counters
        function updateDescCounter() {
            const description = document.getElementById('description');
            const counter = document.getElementById('desc-counter');
            const remaining = 350 - description.value.length;

            counter.textContent = remaining;
            updateCounterStyle(counter, remaining);
        }

        function updateDetailsCounter() {
            const details = document.getElementById('moreDetails');
            const counter = document.getElementById('details-counter');
            const remaining = 400 - details.value.length;

            counter.textContent = remaining;
            updateCounterStyle(counter, remaining);
        }

        function updateCounterStyle(counter, remaining) {
            const container = counter.closest('.char-counter');

            // Remove all classes first
            container.classList.remove('warning', 'danger');

            if (remaining < 50) {
                container.classList.add('warning');
            }
            if (remaining < 20) {
                container.classList.remove('warning');
                container.classList.add('danger');
            }
        }

        // Subcategory handling and initial load
        document.addEventListener('DOMContentLoaded', function () {
            const categorySelect = document.getElementById('category');
            const subcategoryContainer = document.getElementById('subcategory-container');
            const subcategorySelect = document.getElementById('subcategory');

            // Initialize counters on load
            updateDescCounter();
            updateDetailsCounter();

            // Function to fetch and update subcategories
            function fetchAndUpdateSubcategories() {
                const categoryId = categorySelect.value;
                subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>'; // Clear existing options

                if (categoryId) {
                    fetch(`get_subcategories.php?category_id=${categoryId}&restaurant_id=<?php echo $restaurant_id; ?>`)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Network response was not ok ' + response.statusText);
                            }
                            return response.json();
                        })
                        .then(data => {
                            if (data.length > 0) {
                                subcategoryContainer.style.display = 'block';
                                data.forEach(subcategory => {
                                    const option = document.createElement('option');
                                    option.value = subcategory.subcategory_id;
                                    option.textContent = subcategory.subcategory_name;
                                    subcategorySelect.appendChild(option);
                                });
                                // Set the selected subcategory if it exists
                                const currentSubcategoryId = '<?php echo $subcategory_id; ?>';
                                if (currentSubcategoryId) {
                                    subcategorySelect.value = currentSubcategoryId;
                                }
                            } else {
                                subcategoryContainer.style.display = 'none';
                            }
                        })
                        .catch(error => console.error('Error fetching subcategories:', error));
                } else {
                    subcategoryContainer.style.display = 'none';
                }
            }

            // Call on page load to populate subcategories based on the pre-selected category
            fetchAndUpdateSubcategories();

            // Add event listener for category change
            categorySelect.addEventListener('change', function () {
                fetchAndUpdateSubcategories();
            });
        });
    </script>

    <?php
    if (isset($_SESSION['update_success']) && $_SESSION['update_success']) {
        echo "<script>
                    Swal.fire({
                        title: 'Success!',
                        text: 'Food item updated successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                         // No redirection here, stay on the same page to confirm update
                    });
                </script>";
        unset($_SESSION['update_success']); // Clear the session variable
    } elseif (isset($_GET['error'])) {
        echo "<script>
                    Swal.fire({
                        title: 'Error!',
                        text: '" . addslashes(htmlspecialchars($_GET['error'], ENT_QUOTES, 'UTF-8')) . "',
                        icon: 'error',
                        timer: 5000,
                        showConfirmButton: true
                    });
                </script>";
    }

    // Close the database connection (only if not already closed by included files)
    // $conn->close(); // This might already be closed by db.php, be careful not to close twice
    ?>
</body>

</html>