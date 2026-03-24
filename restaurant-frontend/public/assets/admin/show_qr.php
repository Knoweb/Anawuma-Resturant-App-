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
if (!in_array('QR Menu System', $_SESSION['privileges'])) {
    header("Location: login.php");
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
function generateQRCode($login_url, $filename, $conn, $table_number, $login_credentials, $restaurant_id)
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

        // Insert the table entry into the database
        $stmt = $conn->prepare('INSERT INTO tables_tbl (table_number, qr_code_url, login_credentials, restaurant_id) VALUES (?, ?, ?, ?)');
        $stmt->bind_param("sssi", $table_number, $filename, $login_credentials, $restaurant_id);
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

// Handle individual QR code deletion
if (isset($_POST['delete_single']) && isset($_POST['table_number'])) {
    $table_number = (int)$_POST['table_number'];

    // Fetch the QR code URL to delete the file
    $stmt_fetch = $conn->prepare("SELECT qr_code_url FROM tables_tbl WHERE table_number = ? AND restaurant_id = ?");
    $stmt_fetch->bind_param("ii", $table_number, $restaurant_id);
    $stmt_fetch->execute();
    $stmt_fetch->bind_result($qr_code_url);
    $stmt_fetch->fetch();
    $stmt_fetch->close();

    // Check if the file exists and delete it
    if ($qr_code_url && file_exists($qr_code_url)) {
        unlink($qr_code_url);
    }

    // Delete the record from the database
    $stmt_delete = $conn->prepare("DELETE FROM tables_tbl WHERE table_number = ? AND restaurant_id = ?");
    $stmt_delete->bind_param("ii", $table_number, $restaurant_id);
    $stmt_delete->execute();
    $stmt_delete->close();

    // Return success response
    echo json_encode(['status' => 'success']);
    exit;
}

// Handle the form submission for generating QR code
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    if (isset($_POST['table_number'])) {
        $table_number = (int)$_POST['table_number'];

        // Check if the QR code for this table number already exists
        $stmt_check = $conn->prepare('SELECT * FROM tables_tbl WHERE table_number = ? AND restaurant_id = ?');
        $stmt_check->bind_param("ii", $table_number, $restaurant_id);
        $stmt_check->execute();
        $stmt_check->store_result();

        if ($stmt_check->num_rows > 0) {
            // QR code for this table number already exists
            echo json_encode(['status' => 'exists']);
            $stmt_check->close();
            exit;
        } else {
            $stmt_check->close();
            
            try {
                $login_credentials = generateRandomString(8); // Generate an 8-character random string
                $login_url = 'http://10.138.43.145/restaurant-app/menus/login.php?table_number=' . $table_number . '&login_credentials=' . urlencode($login_credentials) . '&restaurant_id=' . $restaurant_id;
                $filename = '../qrcodes/tables/' . $restaurant_id . '_table_' . $table_number . '.png'; // Include restaurant ID in the filename

                // Generate the QR code and insert into database
                generateQRCode($login_url, $filename, $conn, $table_number, $login_credentials, $restaurant_id);

                // Return the response as JSON
                echo json_encode(['status' => 'success', 'qr_code' => ['table_number' => $table_number, 'qr_code_url' => $filename]]);
                exit;
            } catch (Exception $e) {
                echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
                exit;
            }
        }
    } elseif (isset($_POST['delete_all'])) {
        // Fetch all QR code URLs from the database for the current restaurant_id
        $stmt_fetch = $conn->prepare("SELECT qr_code_url FROM tables_tbl WHERE restaurant_id = ?");
        $stmt_fetch->bind_param("i", $restaurant_id);
        $stmt_fetch->execute();
        $result = $stmt_fetch->get_result();
        $qr_codes = $result->fetch_all(MYSQLI_ASSOC);
        $stmt_fetch->close();

        // Delete all QR codes from the database for the current restaurant_id
        $stmt_delete = $conn->prepare("DELETE FROM tables_tbl WHERE restaurant_id = ?");
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

// Fetch all QR codes from the database for the current restaurant_id, ordered by table number
$qr_codes_result = $conn->prepare("SELECT table_number, qr_code_url FROM tables_tbl WHERE restaurant_id = ? ORDER BY table_number ASC");
$qr_codes_result->bind_param("i", $restaurant_id);
$qr_codes_result->execute();
$qr_codes_result->bind_result($table_number, $qr_code_url);
$qr_codes = [];
while ($qr_codes_result->fetch()) {
    $qr_codes[] = ['table_number' => $table_number, 'qr_code_url' => $qr_code_url];
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
                        <h4 class="card-title mb-0">Generate Custom QR Code</h4>
                    </div>
                    <div class="card-body">
                        <form id="qrForm">
                            <div class="mb-3">
                                <label for="tableNumber" class="form-label">Table Number</label>
                                <input type="number" class="form-control" id="tableNumber" name="table_number" min="1"
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
                        <h5 class="card-title">Table <?= htmlspecialchars($qr['table_number']) ?></h5>
                        <img src="<?= htmlspecialchars($qr['qr_code_url']) ?>" class="img-fluid mb-2"
                            alt="QR Code for Table <?= htmlspecialchars($qr['table_number']) ?>">
                        <a href="<?= htmlspecialchars($qr['qr_code_url']) ?>" class="btn btn-primary mb-2"
                            download>Download QR Code</a>
                        <button class="btn btn-danger delete-btn mb-2"
                            data-table-number="<?= htmlspecialchars($qr['table_number']) ?>">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
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
        // Delete individual QR code
        $('.delete-btn').on('click', function() {
            const tableNumber = $(this).data('table-number');

            Swal.fire({
                title: 'Are you sure?',
                text: "This action will delete this QR code.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: 'show_qr.php',
                        method: 'POST',
                        data: {
                            delete_single: true,
                            table_number: tableNumber
                        },
                        dataType: 'json',
                        success: function(response) {
                            if (response.status === 'success') {
                                Swal.fire({
                                    icon: 'success',
                                    title: 'Deleted!',
                                    text: 'The QR code has been deleted.',
                                    timer: 2000,
                                    showConfirmButton: false
                                }).then(() => {
                                    location
                                        .reload(); // Reload to update the list
                                });
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'An error occurred while deleting the QR code.',
                                    timer: 2000,
                                    showConfirmButton: false
                                });
                            }
                        },
                        error: function() {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'An error occurred while deleting the QR code.',
                                timer: 2000,
                                showConfirmButton: false
                            });
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
            var tableNumber = $('#tableNumber').val();

            $.ajax({
                url: 'show_qr.php',
                method: 'POST',
                data: {
                    table_number: tableNumber
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
                            $('#qrCodes').append(`
                             <div class="col-md-4">
                                <div class="card mb-2">
                                    <div class="card-body text-center">
                                        <h5 class="card-title">Table ${response.qr_code.table_number}</h5>
                                        <img src="${response.qr_code.qr_code_url}" class="img-fluid mb-2" alt="QR Code for Table ${response.qr_code.table_number}">
                                        <a href="${response.qr_code.qr_code_url}" class="btn btn-primary" download>Download QR Code</a>
                                    </div>
                                </div>
                            </div>
                            `);
                            $('#tableNumber').val('');
                        });
                    } else if (response.status === 'exists') {
                        Swal.fire({
                            icon: 'warning',
                            title: 'Already Exists',
                            text: 'QR code for this table number already exists.',
                            timer: 2000, // Auto-close after 2 seconds
                            showConfirmButton: false // Hide the OK button
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
                text: "This action will delete all QR codes.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, delete them!'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: 'show_qr.php',
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
                                    $('#qrCodes').empty();
                                });
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'An error occurred while deleting the QR codes.',
                                    timer: 2000, // Auto-close after 2 seconds
                                    showConfirmButton: false // Hide the OK button
                                });
                            }
                        },
                        error: function() {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: 'An error occurred while deleting the QR codes.',
                                timer: 2000, // Auto-close after 2 seconds
                                showConfirmButton: false // Hide the OK button
                            });
                        }
                    });
                }
            });
        });
    });
    </script>
</body>

</html>