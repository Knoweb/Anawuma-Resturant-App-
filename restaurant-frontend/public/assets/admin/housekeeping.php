<?php
// Start session and check for admin login
session_start();

// Ensure user is logged in and has the correct privileges
if (!isset($_SESSION['admin_id']) || !isset($_SESSION['restaurant_id']) || !in_array('QR Housekeeping System', $_SESSION['privileges'])) {
    header("Location: login.php");
    exit;
}

// Example: Run shell script for a "done" action
// $script_output = shell_exec('/var/www/restaurant-app-main/delete_old_files.sh 2>&1');

$restaurant_id = $_SESSION['restaurant_id'];

// Include database connection
include_once "../db.php"; // Ensure this path is correct

// Delete housekeeping requests older than 7 days
$query = "DELETE FROM housekeeping_tbl WHERE restaurant_id = ? AND job_date < NOW() - INTERVAL 7 DAY";
$stmt = $conn->prepare($query);
if ($stmt === false) {
    die('Prepare failed: ' . htmlspecialchars($conn->error));
}
$stmt->bind_param('i', $restaurant_id);
$stmt->execute();
$stmt->close();


// First, retrieve the audio file path for the specific request
$query = "SELECT audio_file FROM housekeeping_tbl WHERE id = ? AND restaurant_id = ?";
$stmt = $conn->prepare($query);
if ($stmt === false) {
    die('Prepare failed: ' . htmlspecialchars($conn->error));
}

$stmt->bind_param('ii', $request_id, $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();

// Safely retrieve the 'audio_file', check if it exists
$row = $result->fetch_assoc();
$audio_file = isset($row['audio_file']) && !empty($row['audio_file']) ? $row['audio_file'] : null;

$stmt->close();

// CSRF Token Check
if (isset($_POST['csrf_token']) && $_POST['csrf_token'] === $_SESSION['csrf_token']) {
    // Mark request as done if the form is submitted
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['request_id'])) {
        $request_id = intval($_POST['request_id']); // Ensure integer value

        // Validate request_id and handle action
        if ($request_id > 0) {
            if (isset($_POST['action']) && $_POST['action'] === 'delete') {
                // Delete the request
                $query = "DELETE FROM housekeeping_tbl WHERE id = ? AND restaurant_id = ?";
                $stmt = $conn->prepare($query);
                if ($stmt === false) {
                    die('Prepare failed: ' . htmlspecialchars($conn->error));
                }

                $stmt->bind_param('ii', $request_id, $restaurant_id);
                $stmt->execute();
                $stmt->close();

                // Delete the audio file if it exists
                if (!empty($audio_file) && file_exists($audio_file)) {
                    unlink($audio_file); // Delete the audio file from the server
                }

                // Return a JSON response
                echo json_encode(['success' => true, 'action' => 'delete']);
                exit;
            } else {
                // Mark as done
                $query = "UPDATE housekeeping_tbl SET status = 'done' WHERE id = ? AND restaurant_id = ?";
                $stmt = $conn->prepare($query);
                if ($stmt === false) {
                    die('Prepare failed: ' . htmlspecialchars($conn->error));
                }

                $stmt->bind_param('ii', $request_id, $restaurant_id);
                $stmt->execute();

                // Return a JSON response
                echo json_encode(['success' => true, 'action' => 'done']);
                exit;
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid request ID']);
            exit;
        }
    }
}

// Fetch housekeeping data for the specific restaurant_id
$query = 'SELECT housekeeping_tbl.*, rooms_tbl.room_number 
          FROM housekeeping_tbl 
          LEFT JOIN rooms_tbl 
          ON housekeeping_tbl.room_number = rooms_tbl.room_number
          WHERE housekeeping_tbl.restaurant_id = ? AND housekeeping_tbl.status = "pending"
          ORDER BY housekeeping_tbl.created_at DESC';

$stmt = $conn->prepare($query);
if ($stmt === false) {
    die('Prepare failed: ' . htmlspecialchars($conn->error));
}

$stmt->bind_param('i', $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result === false) {
    die('Execute failed: ' . htmlspecialchars($stmt->error));
}

$messages = $result->fetch_all(MYSQLI_ASSOC);

$stmt->close();
$conn->close();

// Generate CSRF Token
$_SESSION['csrf_token'] = bin2hex(random_bytes(32));
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Housekeeping Requests Admin Panel</title>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        /* Base styles */
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f9;
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
        }

        h2 {
            color: #333;
            margin-bottom: 20px;
            text-align: center;
        }

        .container {
            width: 100%;
            max-width: 1200px;
            padding: 20px;
            margin: 0 auto;
        }

        .top-bar {
            background-color: #333;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .back-button, .logout-button {
            padding: 8px 15px;
            background-color: #555;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.9em;
            text-decoration: none;
            transition: background-color 0.3s ease;
        }

        .back-button:hover, .logout-button:hover {
            background-color: #777;
        }
        
        .logout-button {
            background-color: #d9534f;
        }
        
        .logout-button:hover {
            background-color: #c9302c;
        }

        .card {
            background-color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
            padding: 20px;
            width: 100%;
            transition: box-shadow 0.3s ease;
            position: relative;
            box-sizing: border-box;
        }

        .card:hover {
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }

        .card h3 {
            margin: 0;
            margin-bottom: 10px;
            color: #444;
            font-size: 1.5em;
        }

        .card h5 {
            margin: 0;
            margin-bottom: 10px;
            color: #666;
            font-size: 1.2em;
        }

        .card p {
            margin: 5px 0;
            color: #666;
        }

        .card .date-time {
            color: #888;
            font-size: 0.9em;
        }

        .button-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }

        .button-group button {
            padding: 10px 15px;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
        }

        .done-button {
            background-color: #4CAF50;
        }

        .done-button:hover {
            background-color: #45a049;
        }

        .delete-button {
            background-color: #f44336;
        }

        .delete-button:hover {
            background-color: #e53935;
        }

        .no-messages {
            font-size: 1.2em;
            color: #777;
            text-align: center;
            margin-top: 50px;
        }
    </style>
</head>

<body>
    <div class="top-bar">
        <a href="index.php" class="back-button">Back</a>
        <a href="logout.php" class="logout-button">Logout</a>
    </div>
    <div class="container">
        <h2>Housekeeping Requests</h2>

        <div id="housekeeping_requests">
            <?php
            if (!empty($messages)) {
                foreach ($messages as $message) {
                    echo '<div class="card" id="request-' . htmlspecialchars($message['id']) . '">
                            <h3>Room ' . htmlspecialchars($message['room_number']) . '</h3>
                            <h5> ' . htmlspecialchars($message['name']) . '</h5>
                            <p><strong>Message:</strong> ' . htmlspecialchars($message['message']) . '</p>
                            <p class="date-time"><strong>Job Date:</strong> ' . htmlspecialchars($message['job_date']) . '</p>
                            <p class="date-time"><strong>Job Time:</strong> ' . htmlspecialchars($message['job_time']) . '</p>
                            ';

                    // Check if a voice message exists and display it
                    if (!empty($message['audio_file'])) {
                        echo '<p class="date-time"><strong>Voice Message:</strong> <audio controls>
                                <source src="' . htmlspecialchars($message['audio_file']) . '" type="audio/mpeg">
                                Your browser does not support the audio tag.
                              </audio></p>';
                    }

                    echo '<div class="button-group">
                                <button class="done-button" onclick="updateRequest(' . htmlspecialchars($message['id']) . ', \'done\')">Mark as Done</button>
                                <button class="delete-button" onclick="updateRequest(' . htmlspecialchars($message['id']) . ', \'delete\')">Delete</button>
                            </div>
                        </div>';
                }
            } else {
                echo '<p class="no-messages">No messages found for the specified criteria.</p>';
            }
            ?>
        </div>
    </div>

    <script>
        function updateRequest(requestId, action) {
            const csrfToken = '<?php echo $_SESSION['csrf_token']; ?>';

            if (action === 'delete') {
                // Show confirmation dialog for delete
                Swal.fire({
                    title: 'Are you sure?',
                    text: "This request will be deleted permanently!",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Yes, delete it!'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Proceed with delete action
                        const formData = new FormData();
                        formData.append('csrf_token', csrfToken);
                        formData.append('request_id', requestId);
                        formData.append('action', action);

                        fetch('', {
                                method: 'POST',
                                body: formData
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    Swal.fire('Deleted!', 'The request has been deleted.', 'success');
                                    document.getElementById('request-' + requestId).remove();
                                } else {
                                    Swal.fire('Error!', 'Unable to delete the request.', 'error');
                                }
                            });
                    }
                });
            } else {
                // Proceed with mark as done action
                const formData = new FormData();
                formData.append('csrf_token', csrfToken);
                formData.append('request_id', requestId);
                formData.append('action', action);

                fetch('', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            Swal.fire('Marked!', 'The request has been marked as done.', 'success');
                            document.getElementById('request-' + requestId).remove();
                        } else {
                            Swal.fire('Error!', 'Unable to mark the request as done.', 'error');
                        }
                    });
            }
        }

        setInterval(function() {
            location.reload(); // This refreshes the page every 60 seconds
        }, 60000); // 60000 milliseconds = 1 minute
    </script>
</body>

</html>