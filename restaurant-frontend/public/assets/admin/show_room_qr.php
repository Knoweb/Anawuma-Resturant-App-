<?php
// Start a new session or resume the existing session
session_start();

// Check if the admin is logged in
if (!isset($_SESSION['admin_id'])) {
    // Redirect to login page if not logged in
    header("Location: login.php");
    exit;
}
// Check if the restaurant has access to the Housekeeping privilege
if (!in_array('QR Housekeeping System', $_SESSION['privileges'])) {
    header("Location: login.php"); // Redirect to a 'No Access' page
    exit;
}

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Include necessary dependencies and setup autoload
require '../vendor/autoload.php';

// Database connection setup
include_once "../db.php";

// Use Endroid QR Code namespaces
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

// Function to generate QR codes
function generateQRCode($login_url, $filename, $conn, $room_number, $login_credentials, $restaurant_id)
{
    try {
        // Ensure directory exists
        $dir = dirname($filename);
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }
        
        $qrCode = new QrCode($login_url);
        $writer = new PngWriter();

        // Generate the QR code and save it to a file
        $result = $writer->write($qrCode);
        $result->saveToFile($filename);

        // Insert the room entry into the database
        $stmt = $conn->prepare('INSERT INTO rooms_tbl (room_number, qr_code_url, login_credentials, restaurant_id) VALUES (?, ?, ?, ?)');
        $stmt->bind_param("sssi", $room_number, $filename, $login_credentials, $restaurant_id);
        $stmt->execute();
        $stmt->close();
        
        return true;
    } catch (Exception $e) {
        throw new Exception("QR Code generation failed: " . $e->getMessage());
    }
}

// Function to generate a random string for login credentials
function generateRandomString($length = 10)
{
    return substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length / strlen($x)))), 0, $length);
}

// Handle the deletion of a specific room QR code
if (isset($_POST['delete_room']) && isset($_POST['room_number'])) {
    $room_number = (int)$_POST['room_number'];

    // Fetch the QR code URL for the specified room number and restaurant
    $stmt_fetch = $conn->prepare("SELECT qr_code_url FROM rooms_tbl WHERE room_number = ? AND restaurant_id = ?");
    $stmt_fetch->bind_param("ii", $room_number, $restaurant_id);
    $stmt_fetch->execute();
    $result = $stmt_fetch->get_result();
    $qr_code = $result->fetch_assoc();
    $stmt_fetch->close();

    if ($qr_code) {
        // Delete the QR code entry from the database
        $stmt_delete = $conn->prepare("DELETE FROM rooms_tbl WHERE room_number = ? AND restaurant_id = ?");
        $stmt_delete->bind_param("ii", $room_number, $restaurant_id);
        $stmt_delete->execute();
        $stmt_delete->close();

        // Delete the QR code image file
        if (file_exists($qr_code['qr_code_url'])) {
            unlink($qr_code['qr_code_url']);
        }

        // Return success response
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'QR code not found.']);
    }
    exit;
}


// Handle the form submission for generating QR code
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['room_number'])) {
        $room_number = (int)$_POST['room_number'];

        // Check if the QR code for this room number already exists
        $stmt_check = $conn->prepare('SELECT * FROM rooms_tbl WHERE room_number = ? AND restaurant_id = ?');
        $stmt_check->bind_param("ii", $room_number, $restaurant_id);
        $stmt_check->execute();
        $stmt_check->store_result();

        if ($stmt_check->num_rows > 0) {
            // QR code for this room number already exists
            echo json_encode(['status' => 'exists']);
            $stmt_check->close();
            exit;
        } else {
            $stmt_check->close();
            
            try {
                $login_credentials = generateRandomString(8); // Generate an 8-character random string
                
                // Fixed IP address for QR codes
                $login_url = 'http://10.138.43.145/restaurant-app/menus/room_login.php?room_number=' . $room_number . '&login_credentials=' . urlencode($login_credentials) . '&restaurant_id=' . $restaurant_id;
                $filename = '../qrcodes/rooms/' . $restaurant_id . '_room_' . $room_number . '.png'; // Include restaurant ID in the filename

                // Generate the QR code and insert it into the database
                generateQRCode($login_url, $filename, $conn, $room_number, $login_credentials, $restaurant_id);

                // Return the response as JSON
                echo json_encode(['status' => 'success', 'qr_code' => ['room_number' => $room_number, 'qr_code_url' => $filename]]);
                exit;
            } catch (Exception $e) {
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
                exit;
            }
        }
    } elseif (isset($_POST['delete_all'])) {
        // Fetch all QR code URLs from the database for the current restaurant_id
        $stmt_fetch = $conn->prepare("SELECT qr_code_url FROM rooms_tbl WHERE restaurant_id = ?");
        $stmt_fetch->bind_param("i", $restaurant_id);
        $stmt_fetch->execute();
        $result = $stmt_fetch->get_result();
        $qr_codes = $result->fetch_all(MYSQLI_ASSOC);
        $stmt_fetch->close();

        // Delete all QR codes from the database for the current restaurant_id
        $stmt_delete = $conn->prepare("DELETE FROM rooms_tbl WHERE restaurant_id = ?");
        $stmt_delete->bind_param("i", $restaurant_id);
        $stmt_delete->execute();
        $stmt_delete->close();

        // Delete QR code files from storage
        foreach ($qr_codes as $qr_code) {
            if (file_exists($qr_code['qr_code_url'])) {
                unlink($qr_code['qr_code_url']);
            }
        }

        // Return success response
        echo json_encode(['status' => 'success']);
        exit;
    }
}

// Fetch all QR codes from the database for the current restaurant_id, ordered by room number
$qr_codes_result = $conn->prepare("SELECT room_number, qr_code_url FROM rooms_tbl WHERE restaurant_id = ? ORDER BY CAST(room_number AS UNSIGNED) ASC");
$qr_codes_result->bind_param("i", $restaurant_id);
$qr_codes_result->execute();
$qr_codes_result->bind_result($room_number, $qr_code_url);
$qr_codes = [];
while ($qr_codes_result->fetch()) {
    $qr_codes[] = ['room_number' => $room_number, 'qr_code_url' => $qr_code_url];
}
$qr_codes_result->close();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Show QR Codes</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- SweetAlert2 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css" rel="stylesheet">
</head>

<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="card-title mb-0">Generate Room QR Code</h4>
                    </div>
                    <div class="card-body">
                        <form id="qrForm">
                            <div class="mb-3">
                                <label for="roomNumber" class="form-label">Room Number</label>
                                <input type="number" class="form-control" id="roomNumber" name="room_number" min="1"
                                    required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Generate QR Code</button>
                        </form>
                        <form id="deleteForm" class="mt-3">
                            <button type="submit" name="delete_all" class="btn btn-danger w-100">Delete All QR
                                Codes</button>
                        </form>
                        <div id="message" class="mt-3"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-4" id="qrCodes">
            <?php foreach ($qr_codes as $qr) : ?>
                <div class="col-md-4">
                    <div class="card mb-2">
                        <div class="card-body text-center">
                            <h5 class="card-title">Room <?= htmlspecialchars($qr['room_number']) ?></h5>
                            <img src="<?= htmlspecialchars($qr['qr_code_url']) ?>" class="img-fluid mb-2"
                                alt="QR Code for Room <?= htmlspecialchars($qr['room_number']) ?>">
                            <a href="<?= htmlspecialchars($qr['qr_code_url']) ?>" class="btn btn-primary" download>Download
                                QR Code</a>
                            <button class="btn btn-danger delete-qr"
                                data-room-number="<?= htmlspecialchars($qr['room_number']) ?>">Delete</button>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- Bootstrap JS and dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- SweetAlert2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        $(document).ready(function() {
            // Existing code for generating and deleting all QR codes...

            // Event listener for individual delete buttons
            $(document).on('click', '.delete-qr', function() {
                var roomNumber = $(this).data('room-number');
                var qrCard = $(this).closest('.col-md-4'); // Select the card to remove after deletion

                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This will delete the QR code for Room ' + roomNumber + '!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        $.ajax({
                            url: 'show_room_qr.php',
                            method: 'POST',
                            data: {
                                delete_room: true,
                                room_number: roomNumber
                            },
                            dataType: 'json',
                            success: function(response) {
                                if (response.status === 'success') {
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Deleted!',
                                        text: 'The QR code for Room ' +
                                            roomNumber + ' has been deleted.',
                                        timer: 2000,
                                        showConfirmButton: false
                                    }).then(() => {
                                        qrCard
                                            .remove(); // Remove the QR code card from the page
                                    });
                                }
                            }
                        });
                    }
                });
            });
        });
    </script>

    <!-- AJAX form submission -->
    <script>
        $(document).ready(function() {
            $('#qrForm').on('submit', function(event) {
                event.preventDefault();
                var roomNumber = $('#roomNumber').val();

                $.ajax({
                    url: 'show_room_qr.php',
                    method: 'POST',
                    data: {
                        room_number: roomNumber
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.status === 'success') {
                            Swal.fire({
                                icon: 'success',
                                title: 'Success',
                                text: 'QR code generated successfully.',
                                timer: 2000, // Auto-close after 2 seconds
                                showConfirmButton: false // Hide the OK button
                            }).then(() => {
                                // Append the QR code to the page after the alert closes
                                $('#qrCodes').append(`
        <div class="col-md-4">
            <div class="card mb-2">
                <div class="card-body text-center">
                    <h5 class="card-title">Room ${response.qr_code.room_number}</h5>
                    <img src="${response.qr_code.qr_code_url}" class="img-fluid mb-2" alt="QR Code for Room ${response.qr_code.room_number}">
                    <a href="${response.qr_code.qr_code_url}" class="btn btn-primary" download>Download QR Code</a>
                </div>
            </div>
        </div>`);
                            });
                        } else if (response.status === 'exists') {
                            Swal.fire({
                                icon: 'warning',
                                title: 'Already Exists',
                                text: 'A QR code for this room number already exists.'
                            });
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: response.message || 'An error occurred while generating the QR code.',
                                showConfirmButton: true
                            });
                        }
                    },
                    error: function(xhr, status, error) {
                        var errorMsg = 'An error occurred while generating the QR code.';
                        try {
                            var response = JSON.parse(xhr.responseText);
                            if (response.message) {
                                errorMsg = response.message;
                            }
                        } catch(e) {
                            errorMsg += ' Status: ' + status;
                        }
                        Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: errorMsg,
                            showConfirmButton: true
                        });
                    }
                });
            });

            $('#deleteForm').on('submit', function(event) {
                event.preventDefault();

                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This will delete all QR codes for rooms!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete them!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        $.ajax({
                            url: 'show_room_qr.php',
                            method: 'POST',
                            data: {
                                delete_all: true
                            },
                            dataType: 'json',
                            success: function(response) {
                                if (response.status === 'success') {
                                    Swal.fire({
                                        icon: 'success',
                                        title: 'Deleted!',
                                        text: 'All QR codes have been deleted.',
                                        timer: 2000, // Auto-close after 2 seconds
                                        showConfirmButton: false // Hide the OK button
                                    }).then(() => {
                                        $('#qrCodes')
                                            .empty(); // Clear the QR codes from the page
                                    });
                                }
                            }
                        });
                    }
                });
            });

        });
    </script>
</body>

</html>