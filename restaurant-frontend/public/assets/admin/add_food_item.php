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
$videoTargetDir = "../assets/videos/item-videos/"; // Ensure the trailing slash

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

// Check if the form is submitted
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
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
            throw new Exception("File is too large.");
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
        $subcategory = isset($_POST['subcategory']) ? intval($_POST['subcategory']) : NULL;
        $blogLink = filter_var($_POST['blogLink'], FILTER_VALIDATE_URL) ? htmlspecialchars($_POST['blogLink'], ENT_QUOTES, 'UTF-8') : '';
        
        // Handle video file upload
        $videoLink = '';
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

        // Handle file uploads with validation (images are optional)
        $image1 = !empty($_FILES['image1']['name']) ? uploadFile($_FILES['image1'], $targetDir, $restaurant_id) : '';
        $image2 = !empty($_FILES['image2']['name']) ? uploadFile($_FILES['image2'], $targetDir, $restaurant_id) : '';
        $image3 = !empty($_FILES['image3']['name']) ? uploadFile($_FILES['image3'], $targetDir, $restaurant_id) : '';
        $image4 = !empty($_FILES['image4']['name']) ? uploadFile($_FILES['image4'], $targetDir, $restaurant_id) : '';

        // Check if the subcategory ID is valid or set it to NULL if not
        if ($subcategory !== NULL) {
            $stmtCheck = $conn->prepare("SELECT COUNT(*) FROM subcategory_tbl WHERE subcategory_id = ?");
            $stmtCheck->bind_param("i", $subcategory);
            $stmtCheck->execute();
            $stmtCheck->bind_result($count);
            $stmtCheck->fetch();
            $stmtCheck->close();

            if ($count == 0) {
                $subcategory = NULL;
            }
        }

        // Prepare SQL statement to insert data into the database
        $stmt = $conn->prepare("
            INSERT INTO food_items_tbl 
            (food_items_name, description, more_details, price, currency_id, category_id, subcategory_id, image_url_1, image_url_2, image_url_3, image_url_4, video_link, blog_link, restaurant_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param("sssdiiissssssi", $itemName, $description, $moreDetails, $price, $restaurantCurrencyId, $category, $subcategory, $image1, $image2, $image3, $image4, $videoLink, $blogLink, $restaurant_id);

        if ($stmt->execute()) {
            // Redirect to the form with a success message
            header("Location: add_food_item.php?success=1");
            exit();
        } else {
            throw new Exception("Error inserting data: " . $stmt->error);
        }
    } catch (Exception $e) {
        // Redirect with error message
        header("Location: add_food_item.php?error=" . urlencode($e->getMessage()));
        exit();
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Food Item</title>
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- SweetAlert2 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
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
        .form-control, .form-select {
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
        <button class="back-button" onclick="history.back();">
            <i class="fas fa-arrow-left"></i> Back
        </button>
        <h2>Add Food Item</h2>
        
        <form action="" method="post" enctype="multipart/form-data">
            <div class="mb-4">
                <label for="itemName" class="form-label">Item Name</label>
                <input type="text" id="itemName" name="itemName" class="form-control" required>
            </div>

            <div class="mb-4">
                <label for="description" class="form-label">Description</label>
                <textarea id="description" name="description" class="form-control" rows="4" maxlength="350" oninput="updateDescCounter()"></textarea>
                <div class="char-counter-container">
                    <span class="char-counter">Maximum 350 characters allowed</span>
                    <span class="char-counter remaining"><span id="desc-counter">350</span> characters remaining</span>
                </div>
            </div>

            <div class="mb-4">
                <label for="moreDetails" class="form-label">More Details</label>
                <textarea id="moreDetails" name="moreDetails" class="form-control" rows="4" maxlength="400" oninput="updateDetailsCounter()"></textarea>
                <div class="char-counter-container">
                    <span class="char-counter">Maximum 400 characters allowed</span>
                    <span class="char-counter remaining"><span id="details-counter">400</span> characters remaining</span>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="currency" class="form-label">Currency</label>
                    <input type="hidden" name="currency" value="<?php echo htmlspecialchars($restaurantCurrencyId, ENT_QUOTES, 'UTF-8'); ?>" />
                    <input type="text" id="currency" class="form-control" value="<?php echo htmlspecialchars($restaurantCurrency, ENT_QUOTES, 'UTF-8'); ?>" readonly />
                </div>
                <div class="col-md-6">
                    <label for="price" class="form-label">Price</label>
                    <input type="number" id="price" name="price" class="form-control" step="0.01" required>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="category" class="form-label">Category</label>
                    <select id="category" name="category" class="form-select" required>
                        <option value="">Select Category</option>
                        <?php
                        // Prepare SQL query to fetch categories for the specific restaurant_id
                        $stmt = $conn->prepare("SELECT category_id, category_name FROM category_tbl WHERE restaurant_id = ?");
                        $stmt->bind_param("i", $restaurant_id);
                        $stmt->execute();
                        $result = $stmt->get_result();

                        if ($result->num_rows > 0) {
                            while ($row = $result->fetch_assoc()) {
                                echo "<option value='" . htmlspecialchars($row["category_id"], ENT_QUOTES, 'UTF-8') . "'>" . htmlspecialchars($row["category_name"], ENT_QUOTES, 'UTF-8') . "</option>";
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
                        </select>
                    </div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="image1" class="form-label">Image 1</label>
                    <input type="file" id="image1" name="image1" class="form-control">
                    <div class="form-text">Optional (JPG, JPEG, PNG, GIF - Max 3MB)</div>
                </div>
                <div class="col-md-6">
                    <label for="image2" class="form-label">Image 2</label>
                    <input type="file" id="image2" name="image2" class="form-control">
                    <div class="form-text">Optional (JPG, JPEG, PNG, GIF - Max 3MB)</div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="image3" class="form-label">Image 3</label>
                    <input type="file" id="image3" name="image3" class="form-control">
                    <div class="form-text">Optional (JPG, JPEG, PNG, GIF - Max 3MB)</div>
                </div>
                <div class="col-md-6">
                    <label for="image4" class="form-label">Image 4</label>
                    <input type="file" id="image4" name="image4" class="form-control">
                    <div class="form-text">Optional (JPG, JPEG, PNG, GIF - Max 3MB)</div>
                </div>
            </div>

            <div class="row mb-4">
                <div class="col-md-6">
                    <label for="videoFile" class="form-label">Video File</label>
                    <input type="file" id="videoFile" name="videoFile" class="form-control" accept="video/*">
                    <div class="form-text">Optional (Browse video file from your laptop)</div>
                </div>
                <div class="col-md-6">
                    <label for="blogLink" class="form-label">Blog Link</label>
                    <input type="url" id="blogLink" name="blogLink" class="form-control">
                    <div class="form-text">Optional (must be a valid URL)</div>
                </div>
            </div>

            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button type="submit" class="btn btn-primary">Add Item</button>
            </div>
        </form>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Font Awesome -->
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
    <!-- SweetAlert2 JS -->
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

        // Subcategory handling
        document.addEventListener('DOMContentLoaded', function() {
            const categorySelect = document.getElementById('category');
            const subcategoryContainer = document.getElementById('subcategory-container');
            const subcategorySelect = document.getElementById('subcategory');

            // Initialize counters
            updateDescCounter();
            updateDetailsCounter();

            categorySelect.addEventListener('change', function() {
                const categoryId = this.value;

                if (categoryId) {
                    // Fetch subcategories based on the selected category
                    fetch(`get_subcategories.php?category_id=${categoryId}`)
                        .then(response => response.json())
                        .then(data => {
                            subcategorySelect.innerHTML =
                                '<option value="">Select Subcategory</option>';

                            data.forEach(subcategory => {
                                const option = document.createElement('option');
                                option.value = subcategory.subcategory_id;
                                option.textContent = subcategory.subcategory_name;
                                subcategorySelect.appendChild(option);
                            });

                            subcategoryContainer.style.display = data.length > 0 ? 'block' : 'none';
                        })
                        .catch(error => console.error('Error fetching subcategories:', error));
                } else {
                    subcategoryContainer.style.display = 'none';
                    subcategorySelect.innerHTML = '<option value="">Select Subcategory</option>';
                }
            });
        });
    </script>

    <?php
    if (isset($_GET['success']) && $_GET['success'] == 1) {
        echo "<script>
                 Swal.fire({
                    title: 'Success!',
                    text: 'Food item added successfully!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = 'index.php';
                });
              </script>";
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

    // Close the database connection
    $conn->close();
    ?>
</body>
</html>