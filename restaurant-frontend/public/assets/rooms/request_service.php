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

// Retrieve room number and restaurant ID from session
$room_number = $_SESSION['room_number'];
$restaurant_id = $_SESSION['restaurant_id'];

$message = '';
$message_type = ''; // To store the type of message ('success' or 'error')

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $name = $_POST['name'];
    $message_content = $_POST['message'];
    $job_date = $_POST['job_date'];
    $job_time = $_POST['job_time'];
    $audioFilePath = null;

    // Combine the date and time into a single timestamp
    $job_datetime = strtotime("$job_date $job_time");
    $current_datetime = time();

    // Check if the selected date and time are in the past
    if ($job_datetime < $current_datetime) {
        $_SESSION['flash_message'] = [
            'text' => 'You cannot select a past date and time.',
            'type' => 'error'
        ];
        header('Location: request_service.php');
        exit();
    }

    // Handle audio file upload
    if (!empty($_POST['audioMessage'])) {
        $audioData = $_POST['audioMessage'];
        $audioData = str_replace('data:audio/wav;base64,', '', $audioData); // Remove the base64 metadata
        $audioData = base64_decode($audioData); // Decode the base64 data
        $audioFilePath = '../assets/voice/audio_' . time() . '.wav'; // Generate file path

        // Save the file to the server
        if (file_put_contents($audioFilePath, $audioData) === false) {
            $_SESSION['flash_message'] = [
                'text' => 'Failed to save audio file.',
                'type' => 'error'
            ];
            header('Location: request_service.php');
            exit();
        }
    }

    // Insert data into the database
    $stmt = $conn->prepare('INSERT INTO housekeeping_tbl (room_number, restaurant_id, name, message, job_date, job_time, audio_file) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $stmt->bind_param('iisssss', $room_number, $restaurant_id, $name, $message_content, $job_date, $job_time, $audioFilePath);
    $stmt->execute();

    if ($stmt->error) {
        $_SESSION['flash_message'] = [
            'text' => htmlspecialchars($stmt->error),
            'type' => 'error'
        ];
    } else {
        $_SESSION['flash_message'] = [
            'text' => 'Message sent successfully.',
            'type' => 'success'
        ];
    }

    $stmt->close();
    $conn->close();

    // Redirect back to the form page to prevent resubmission on refresh
    header('Location: request_service.php');
    exit();
}

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
// Fetch today's special offers
$today = date('Y-m-d');
$query = "SELECT * FROM special_offers_tbl WHERE start_date <= '$today' AND end_date >= '$today' AND restaurant_id = '$restaurant_id'";
$result = mysqli_query($conn, $query);
$offers = [];
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Service</title>
    <!-- FAVICON -->
    <link rel="icon" href="../assets/imgs/favicon.png" type="assets/imgs/x-icon" />

    <!-- custom css file link  -->
    <link rel="stylesheet" href="../assets/css/styles.css" />

    <!-- Animations css -->
    <link rel="stylesheet" href="../assets/css/animatescroll.css" />
    <!-- font awesome cdn link  -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.1.1/css/all.min.css" />

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">

    <!-- SweetAlert2 CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">

    <!-- Loader css -->
    <link rel="stylesheet" href="../assets/css/loading-styles.css" />

    <script src="https://cdnjs.cloudflare.com/ajax/libs/recorderjs/0.0.1/recorder.js"></script>

    <!-- Custom CSS -->

    <style>
        html,
        body {
            height: 100%;
            margin: 0;
            padding: 0;
        }

        #content {
            display: flex;
            flex-direction: column;
            min-height: 75%;
        }

        footer.footer {
            margin-top: auto;
            padding: 1rem;
            text-align: center;
            position: relative;
            bottom: 0;
            width: 100%;
        }

        h1 {
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .btn-primary {
            background-color: #2d7c7e;
            border: none;
        }

        .form-label {
            color: #555;
        }

        .form-label {
            font-size: 2rem;
            color: #555;
        }

        .form-control {
            font-size: 2rem;

        }

        .btn-primary {
            font-size: 2rem;
            background-color: #2d7c7e;
            border: none;
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
                                <a href="<?php echo $url; ?>" class="offer-button">View Offer</a>
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
                <div class="icons" id="navBar">
                    <div id="menu-btn" class="fas fa-bars"></div>
                </div>
                <nav class="navbar">
                    <a href="./index.php">Menus</a>
                    <a href="./requests.php">My Requests</a>
                </nav>
            </section>
        </header>
        <!-- header section ends -->
        <section id="menu" class="container mb-4" style="margin-top: 8rem">
            <div class="row justify-content-center">
                <div class="col-md-8 col-sm-12">
                    <div class="order mt-8 p-4 border rounded shadow-sm bg-light">
                        <h1 class="mb-4 text-center">Request Housekeeping Service</h1>
                        <form action="request_service.php" method="post" enctype="multipart/form-data">
                            <div class="mb-3">
                                <label for="name" class="form-label">Your Name:</label>
                                <input type="text" name="name" id="name" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label for="message" class="form-label">Message:</label>
                                <textarea name="message" id="message" class="form-control" rows="3" required></textarea>
                            </div>
                            <div class="mb-3">
                                <label for="job_date" class="form-label">Date:</label>
                                <input type="date" name="job_date" id="job_date" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label for="job_time" class="form-label">Time:</label>
                                <input type="time" name="job_time" id="job_time" class="form-control" required>
                            </div>
                            <div class="mb-3">
                                <label for="audioMessage" class="form-label">Audio Message (Optional):</label>
                                <button type="button" id="start" class="btn btn-primary">Start Recording</button>
                                <button type="button" id="stop" class="btn btn-danger" disabled>Stop Recording</button>
                                <button type="button" id="rerun" class="btn btn-secondary"
                                    style="display: none;">Re-record</button>
                                <audio id="audioPlayback" controls></audio>
                                <a id="downloadLink" download="recording.wav" style="display: none;">Download
                                    Recording</a>
                            </div>
                            <input type="hidden" name="audioMessage" id="audioMessage">
                            <button type="submit" class="btn btn-primary">Send Request</button>
                        </form>
                    </div>
                </div>
            </div>

            <script>
                let mediaRecorder;
                let recordedChunks = [];

                document.getElementById('start').addEventListener('click', async () => {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        audio: true
                    });

                    mediaRecorder = new MediaRecorder(stream);

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            recordedChunks.push(event.data);
                        }
                    };

                    mediaRecorder.onstart = () => {
                        document.getElementById('stop').disabled = false;
                        document.getElementById('start').disabled = true;
                        document.getElementById('start').textContent = 'Recording...'; // Change button text
                    };

                    mediaRecorder.onstop = () => {
                        const blob = new Blob(recordedChunks, {
                            type: 'audio/wav'
                        });
                        const reader = new FileReader();

                        reader.onloadend = function() {
                            document.getElementById('audioMessage').value = reader.result;
                            document.getElementById('audioPlayback').src = reader.result;
                        };

                        reader.readAsDataURL(blob);

                        recordedChunks = [];
                        document.getElementById('stop').disabled = true;
                        document.getElementById('rerun').style.display = 'inline-block';
                        document.getElementById('start').textContent =
                            'Start Recording'; // Reset button text
                    };

                    mediaRecorder.start();
                });

                document.getElementById('stop').addEventListener('click', () => {
                    mediaRecorder.stop();
                });

                document.getElementById('rerun').addEventListener('click', () => {
                    recordedChunks = [];
                    document.getElementById('audioMessage').value = '';
                    document.getElementById('audioPlayback').src = '';
                    document.getElementById('start').disabled = false;
                    document.getElementById('stop').disabled = true;
                    document.getElementById('rerun').style.display = 'none';
                    document.getElementById('start').textContent = 'Start Recording'; // Reset button text
                });
            </script>
        </section>



        <!-- Bootstrap JS Bundle with Popper -->
        <script src="https://stackpath.bootstrapcdn.com/bootstrap/5.2.3/js/bootstrap.bundle.min.js"></script>
        <!-- SweetAlert JS -->
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                <?php if (isset($_SESSION['flash_message'])) : ?>
                    Swal.fire({
                        icon: '<?php echo $_SESSION['flash_message']['type']; ?>',
                        title: '<?php echo ucfirst($_SESSION['flash_message']['type']); ?>',
                        text: '<?php echo $_SESSION['flash_message']['text']; ?>',
                        showConfirmButton: false, // Hide the OK button
                        timer: 1500 // Auto-close after 1.5 seconds
                    });
                    <?php unset($_SESSION['flash_message']); ?>
                <?php endif; ?>
            });
        </script>

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

</body>
<script>
    document.getElementById('job_date').addEventListener('change', function() {
        const jobDate = this.value;
        const jobTimeInput = document.getElementById('job_time');
        const today = new Date().toISOString().split('T')[0];

        // If the selected date is today, restrict the time to the future
        if (jobDate === today) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            jobTimeInput.min = `${hours}:${minutes}`;
        } else {
            jobTimeInput.min = ''; // Reset time restriction
        }
    });
</script>
<!-- Gsap For Loading animation -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js"></script>
<script src="../assets/js/loading-script.js"></script>
<script src="../assets/js/animatescroll.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="../assets/js/script.js"></script>

</html>