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

// Function to generate QR codes for rooms
function generateRoomQRCode($login_url, $filename, $conn, $room_number, $login_credentials, $restaurant_id)
{
    $qrCode = new QrCode($login_url);
    $writer = new PngWriter();

    // Generate the QR code and save it to a file
    $result = $writer->write($qrCode);
    $result->saveToFile($filename);

    // Insert the room entry into the database
    $stmt = mysqli_prepare($conn, 'INSERT INTO rooms_tbl (room_number, qr_code_url, login_credentials, restaurant_id) VALUES (?, ?, ?, ?)');
    mysqli_stmt_bind_param($stmt, "sssi", $room_number, $filename, $login_credentials, $restaurant_id);
    mysqli_stmt_execute($stmt);
}

// Function to generate a random string for login credentials
function generateRandomString($length = 10)
{
    return substr(str_shuffle(str_repeat($x = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', ceil($length / strlen($x)))), 0, $length);
}

// Handle the form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['room_count'])) {
    $room_count = (int)$_POST['room_count'];
    $qr_codes = [];

    for ($i = 1; $i <= $room_count; $i++) {
        $room_number = $i;

        // Check if the QR code for this room number already exists
        $stmt_check = mysqli_prepare($conn, 'SELECT * FROM rooms_tbl WHERE room_number = ? AND restaurant_id = ?');
        mysqli_stmt_bind_param($stmt_check, "ii", $room_number, $restaurant_id);
        mysqli_stmt_execute($stmt_check);
        mysqli_stmt_store_result($stmt_check);

        if (mysqli_stmt_num_rows($stmt_check) > 0) {
            // QR code for this room number already exists, skip to the next room number
            mysqli_stmt_close($stmt_check);
            continue;
        }

        $login_credentials = generateRandomString(8); // Generate an 8-character random string
        
        // Fixed IP address for QR codes
        $login_url = 'http://10.138.43.145/restaurant-app/menus/room_login.php?room_number=' . $room_number . '&login_credentials=' . urlencode($login_credentials) . '&restaurant_id=' . $restaurant_id;
        $filename = '../qrcodes/rooms/' . $restaurant_id . '_room_' . $room_number . '.png'; // Include restaurant ID in the filename

        // Generate the QR code and insert into database
        generateRoomQRCode($login_url, $filename, $conn, $room_number, $login_credentials, $restaurant_id);

        // Add the QR code information to the array
        $qr_codes[] = [
            'room_number' => $room_number,
            'qr_code_url' => $filename
        ];

        mysqli_stmt_close($stmt_check);
    }

    // Close the connection
    mysqli_close($conn);

    // Return the response as JSON
    echo json_encode(['status' => 'success', 'qr_codes' => $qr_codes]);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generate Room QR Codes</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
</head>

<body>
    <div class="container mt-5">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h4 class="card-title mb-0">Generate Room QR Codes</h4>
                    </div>
                    <div class="card-body">
                        <form id="qrForm">
                            <div class="mb-3">
                                <label for="roomCount" class="form-label">Room Count in your Hotel</label>
                                <input type="number" class="form-control" id="roomCount" name="room_count" min="1"
                                    required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100">Generate QR Codes</button>
                        </form>
                        <div id="qrCodes" class="mt-3"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS and dependencies -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- SweetAlert2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
    <!-- AJAX form submission -->
    <script>
        $(document).ready(function() {
            $('#qrForm').on('submit', function(event) {
                event.preventDefault();
                var roomCount = $('#roomCount').val();

                $.ajax({
                    url: 'generate_room_qr.php',
                    method: 'POST',
                    data: {
                        room_count: roomCount
                    },
                    dataType: 'json',
                    success: function(response) {
                        if (response.status === 'success') {
                            Swal.fire({
                                title: 'Success!',
                                text: 'QR codes generated successfully.',
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false
                            });
                            $('#qrCodes').html('');
                            response.qr_codes.forEach(function(qr) {
                                $('#qrCodes').append(`
                                <div class="card mb-2">
                                    <div class="card-body">
                                       <h5 class="card-title">Room ${qr.room_number}</h5>
                                        <img src="${qr.qr_code_url}" class="img-fluid mb-2" alt="QR Code for Room ${qr.room_number}">
                                        <a href="${qr.qr_code_url}" class="btn btn-primary" download>Download QR Code</a>
                                    </div>
                                </div>
                            `);
                            });
                        } else {
                            Swal.fire({
                                title: 'Error!',
                                text: 'Something went wrong. Please try again.',
                                icon: 'error'
                            });
                        }
                    },
                    error: function(xhr, status, error) {
                        Swal.fire({
                            title: 'Error!',
                            text: 'An error occurred. Please try again later.',
                            icon: 'error'
                        });
                        console.error('Error:', error);
                        console.error('Status:', status);
                        console.error('Response:', xhr.responseText);
                    },
                    complete: function() {
                        // console.log('AJAX request completed.');
                    }
                });
            });
        });
    </script>
</body>

</html>