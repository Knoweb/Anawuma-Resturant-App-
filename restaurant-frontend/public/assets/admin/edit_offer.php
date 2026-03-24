<?php
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

// Generate a CSRF token if it doesn't exist
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Database connection
include_once "../db.php";

$offer = null;
$error_message = '';
$success_message = '';
$errors = []; // Initialize an array to hold validation errors

// Fetch the offer to edit
if (isset($_GET['id'])) {
    $offer_id = $_GET['id'];
    $sql = "SELECT * FROM special_offers_tbl WHERE offer_id = ? AND restaurant_id = ?"; // Added restaurant_id for security
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $offer_id, $restaurant_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows == 0) {
        $_SESSION['message'] = "Offer not found or you don't have permission to edit this offer.";
        $_SESSION['msg_type'] = 'error';
        header("Location: index.php"); // Redirect to a suitable page
        exit;
    } else {
        $offer = $result->fetch_assoc();
        // If form is not submitted, these values will populate the form fields
        $title = $offer['title'];
        $description = $offer['description'];
        $end_date = $offer['end_date'];
        $image_path = $offer['image_path'];
        $start_date_display = $offer['start_date']; // To display original start date
    }
    $stmt->close();

    // Handle form submission to update the offer
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        // CSRF protection
        if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
            $errors[] = "Invalid CSRF token.";
        } else {
            // Sanitize input
            $title = htmlspecialchars(trim($_POST['title']), ENT_QUOTES, 'UTF-8');
            $description = htmlspecialchars(trim($_POST['description']), ENT_QUOTES, 'UTF-8');
            $end_date = htmlspecialchars(trim($_POST['end_date']), ENT_QUOTES, 'UTF-8');

            // Server-side Validations
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

            // Validate End Date
            if (empty($end_date)) {
                $errors[] = "End Date is required.";
            } else {
                $start_timestamp = strtotime($offer['start_date']); // Original start date
                $end_timestamp = strtotime($end_date);
                $current_timestamp = strtotime(date('Y-m-d')); // Get today's date timestamp

                if ($end_timestamp === false) {
                    $errors[] = "Invalid End Date format.";
                } else {
                    if ($end_timestamp < $start_timestamp) {
                        $errors[] = "End Date cannot be earlier than the Start Date (" . htmlspecialchars($offer['start_date']) . ").";
                    }
                    // Optionally, you might want to prevent setting end date in the past,
                    // but if the offer already started, it might be allowed to update to current or future.
                    // For this form, let's assume we can extend an ongoing offer or shorten it but not make it invalid.
                }
            }

            // Handle image upload
            $new_image_path = $offer['image_path']; // Default to the existing image path
            if (!empty($_FILES['image']['name'])) {
                $image = $_FILES['image'];
                $uploadDir = '../assets/imgs/offers/';

                // Ensure upload directory exists
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0777, true);
                }

                // File validation checks
                $check = getimagesize($image['tmp_name']);
                if ($check === false) {
                    $errors[] = 'Uploaded file is not an image.';
                }

                if ($image['error'] !== UPLOAD_ERR_OK) {
                    $errors[] = 'File upload error: ' . htmlspecialchars($image['error']);
                }

                $imageFileType = strtolower(pathinfo($image['name'], PATHINFO_EXTENSION));
                if (!in_array($imageFileType, ['jpg', 'jpeg', 'png', 'gif'])) {
                    $errors[] = 'Invalid file type. Only JPG, JPEG, PNG & GIF files are allowed.';
                }

                if ($image['size'] > 2 * 1024 * 1024) { // 2MB limit
                    $errors[] = 'File size exceeds 2MB limit.';
                }

                // If no image-specific errors, proceed with moving the file
                if (empty($errors)) {
                    $uniqueFileName = $restaurant_id . '-' . uniqid() . '-' . basename($image['name']);
                    $uploadFile = $uploadDir . $uniqueFileName;

                    if (!move_uploaded_file($image['tmp_name'], $uploadFile)) {
                        $errors[] = 'Failed to move uploaded file.';
                    } else {
                        // Delete old image if it exists and a new one was uploaded successfully
                        if (!empty($offer['image_path']) && file_exists($offer['image_path']) && $offer['image_path'] !== $uploadFile) {
                            unlink($offer['image_path']);
                        }
                        $new_image_path = $uploadFile;
                    }
                }
            }

            // If no validation errors, proceed with database update
            if (empty($errors)) {
                $sql_update = "UPDATE special_offers_tbl SET title=?, description=?, end_date=?, image_path=? WHERE offer_id=? AND restaurant_id=?";
                $stmt_update = $conn->prepare($sql_update);
                $stmt_update->bind_param("ssssii", $title, $description, $end_date, $new_image_path, $offer_id, $restaurant_id);

                if ($stmt_update->execute()) {
                    $_SESSION['message'] = "Offer updated successfully!";
                    $_SESSION['msg_type'] = 'success';
                    // Re-fetch offer details to update the form with new values
                    $offer['title'] = $title;
                    $offer['description'] = $description;
                    $offer['end_date'] = $end_date;
                    $offer['image_path'] = $new_image_path;
                } else {
                    $_SESSION['message'] = "Error updating offer: " . htmlspecialchars($stmt_update->error);
                    $_SESSION['msg_type'] = 'error';
                }
                $stmt_update->close();
            } else {
                // Store errors in session to display them
                $_SESSION['message'] = implode("<br>", $errors);
                $_SESSION['msg_type'] = 'error';
            }
            header("Location: edit_offer.php?id=" . $offer_id); // Redirect to prevent form resubmission
            exit;
        }
    }
} else {
    $_SESSION['message'] = "Offer ID not provided.";
    $_SESSION['msg_type'] = 'error';
    header("Location: index.php"); // Redirect if no ID
    exit;
}

// Close the main connection
$conn->close();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Edit Special Offer</title>
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
        <h2>Edit Offer</h2>
        <?php if ($offer) : // Only show form if offer data is available 
        ?>
            <form action="" method="POST" enctype="multipart/form-data" class="needs-validation" novalidate>
                <input type="hidden" name="csrf_token" value="<?php echo htmlspecialchars($_SESSION['csrf_token']); ?>">

                <div class="mb-4">
                    <label for="title" class="form-label">Offer Title:</label>
                    <input type="text" name="title" id="title" class="form-control" placeholder="Enter Offer Title"
                        value="<?php echo htmlspecialchars($offer['title']); ?>" minlength="3" maxlength="100" required
                        oninput="updateTitleCounter()">
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
                        oninput="updateDescCounter()"><?php echo htmlspecialchars($offer['description']); ?></textarea>
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
                    <label for="start_date_display" class="form-label">Start Date (Cannot be changed):</label>
                    <input type="date" id="start_date_display" class="form-control"
                        value="<?php echo htmlspecialchars($offer['start_date']); ?>" disabled>
                    <div class="form-text">The start date cannot be modified once the offer is created.</div>
                </div>

                <div class="mb-4">
                    <label for="end_date" class="form-label">End Date:</label>
                    <input type="date" name="end_date" id="end_date" class="form-control" required
                        value="<?php echo htmlspecialchars($offer['end_date']); ?>">
                    <div class="invalid-feedback">
                        End Date is required and cannot be earlier than the Start Date.
                    </div>
                </div>

                <div class="mb-4">
                    <label for="image" class="form-label">Image Upload:</label>
                    <input type="file" name="image" id="image" class="form-control" accept="image/jpeg,image/png,image/gif">
                    <div class="form-text">Leave blank to keep current image. JPG, JPEG, PNG, GIF formats only. Max 2MB.</div>
                    <?php if (isset($offer['image_path']) && !empty($offer['image_path']) && file_exists($offer['image_path'])) : ?>
                        <div class="mb-2 mt-3">
                            <p class="form-label">Current Image:</p>
                            <img src="<?php echo htmlspecialchars($offer['image_path']); ?>" alt="Current Image"
                                style="max-width: 200px; height: auto; border: 1px solid #ddd; padding: 5px; border-radius: 4px;">
                        </div>
                    <?php else : ?>
                        <div class="mb-2 mt-3 text-muted">No current image available.</div>
                    <?php endif; ?>
                    <div class="invalid-feedback">
                        Image file (JPG, JPEG, PNG, GIF) must be less than 2MB.
                    </div>
                </div>

                <button type="submit" class="btn btn-primary">Update Offer</button>
            </form>
        <?php else : ?>
            <div class="alert alert-danger" role="alert">
                <?php echo htmlspecialchars($error_message); ?>
            </div>
        <?php endif; ?>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>

    <script>
        // Character counter functions
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
                container.classList.remove('warning');
                container.classList.add('danger');
            }
            if (remaining < 0) {
                container.classList.add('danger');
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
                    html: message,
                    icon: msgType,
                    showConfirmButton: false,
                    timer: 3000
                }).then(() => {
                    // We stay on the same page for 'edit' to show updated values or errors
                    // No redirect needed for error, success will reload the page with updated data
                });

                <?php
                unset($_SESSION['message']);
                unset($_SESSION['msg_type']);
                ?>
            <?php endif; ?>

            // Date Picker Logic
            const startDateDisplayInput = document.getElementById('start_date_display');
            const endDateInput = document.getElementById('end_date');

            // Set the minimum allowed date for end_date to the current offer's start_date
            // This ensures end_date cannot be set earlier than the offer's original start date
            if (startDateDisplayInput.value) {
                endDateInput.min = startDateDisplayInput.value;
            } else {
                // Fallback: if start_date is somehow not set, ensure end_date min is at least today
                endDateInput.min = new Date().toISOString().split('T')[0];
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
                            if (imageInput.files.length > 0) { // Only validate if a new file is selected
                                const fileSize = imageInput.files[0].size; // in bytes
                                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                                const fileType = imageInput.files[0].type;
                                let imageValid = true;

                                if (fileSize > 2 * 1024 * 1024) { // 2MB
                                    imageInput.classList.add('is-invalid');
                                    imageInput.nextElementSibling.nextElementSibling.textContent = 'File size exceeds 2MB limit.';
                                    imageValid = false;
                                } else if (!allowedTypes.includes(fileType)) {
                                    imageInput.classList.add('is-invalid');
                                    imageInput.nextElementSibling.nextElementSibling.textContent = 'Invalid file type. Only JPG, JPEG, PNG & GIF files are allowed.';
                                    imageValid = false;
                                } else {
                                    imageInput.classList.remove('is-invalid');
                                    imageInput.classList.add('is-valid');
                                }

                                if (!imageValid) {
                                    event.preventDefault();
                                    event.stopPropagation();
                                }
                            } else {
                                // If no new image is uploaded, clear any previous invalid state
                                imageInput.classList.remove('is-invalid');
                                imageInput.classList.remove('is-valid');
                            }

                            form.classList.add('was-validated')
                        }, false)
                    })
            })()
        });
    </script>
</body>

</html>