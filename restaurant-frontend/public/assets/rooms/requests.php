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
        header("Location: login.php");
        exit();
    }
}

// Update the last activity time
$_SESSION['LAST_ACTIVITY'] = time();

// Retrieve room number and restaurant ID from session
$room_number = $_SESSION['room_number'];
$restaurant_id = $_SESSION['restaurant_id'];

// Fetch restaurant details based on restaurant_id from session
$stmt_restaurant = $conn->prepare('SELECT restaurant_name, email, contact_number, opening_time, closing_time FROM restaurant_tbl WHERE restaurant_id = ?');
$stmt_restaurant->bind_param('i', $restaurant_id);
$stmt_restaurant->execute();
$stmt_restaurant->bind_result($restaurant_name, $email, $contact_number, $opening_time, $closing_time);
$stmt_restaurant->fetch();
$stmt_restaurant->close();

// Query to fetch housekeeping requests for the logged-in room and restaurant
$sql = "SELECT * FROM housekeeping_tbl 
        WHERE room_number = ? AND restaurant_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $room_number, $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();

$housekeeping_requests = [];
while ($row = $result->fetch_assoc()) {
    $housekeeping_requests[] = $row;
}

$stmt->close();
$conn->close();
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

    <!-- Custom CSS -->
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

        .card {
            border: 1px solid #dee2e6;
            border-radius: 20px;
            margin-bottom: 20px;
            padding: 20px;
            transition: transform 0.2s;
        }

        .card:hover {
            transform: scale(1.02);
        }

        .footer {
            padding: 0px 0;
            text-align: center;
            width: 100%;
        }

        h4 {
            font-size: 20px;
        }

        p,
        button {
            font-size: 20px;
        }

        .card-body {
            text-align: center;
        }

        .center-cards {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
        }
    </style>
</head>

<body>

    <div id="content">
        <!-- header section starts  -->
        <header class="header">
            <section class="flex">
                <a href="#home" class="header-logo"><?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?></a>
                <div class="icons" id="navBar">
                    <div id="menu-btn" class="fas fa-bars"></div>
                </div>
                <nav class="navbar">
                    <a href="index.php">Menus</a>
                    <a href="request_service.php">New Requests</a>
                </nav>
            </section>
        </header>
        <!-- header section ends -->

        <section id="menu" class="container mb-4" style="margin-top: 8rem">
            <h1 class="heading">My Housekeeping Requests</h1>
            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4 center-cards">
                <?php if (!empty($housekeeping_requests)): ?>
                    <?php foreach ($housekeeping_requests as $request): ?>
                        <div class="col">
                            <div class="card shadow fade-up">
                                <div class="card-body">
                                    <p class="card-title">Request for <?= htmlspecialchars($request['job_date']) ?> at
                                        <?= htmlspecialchars($request['job_time']) ?></p>
                                    <h4 class="card-text mb-3"><?= htmlspecialchars($request['message']) ?></h4>
                                    <p class="card-text"><strong>Status:</strong> <?= htmlspecialchars($request['status']) ?>
                                    </p>
                                    <form class="cancel-form" id="cancel-form-<?= htmlspecialchars($request['id']) ?>"
                                        action="cancel_request.php" method="post">
                                        <input type="hidden" name="request_id" value="<?= htmlspecialchars($request['id']) ?>">
                                        <button type="button" class="btn btn-danger"
                                            onclick="confirmCancel(<?= htmlspecialchars($request['id']) ?>)">Cancel
                                            Request</button>
                                    </form>

                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <p class="empty">No housekeeping requests found.</p>
                <?php endif; ?>
            </div>
        </section>
    </div>

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
    <!-- footer section ends -->

    <!-- SweetAlert2 JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <script src="../assets/js/animatescroll.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="../assets/js/script.js"></script>
</body>
<script>
    function confirmCancel(requestId) {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you really want to cancel this request?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, cancel it!',
            cancelButtonText: 'No, keep it',
            onOpen: function() {
                document.body.style.overflow = 'auto';
            },
            onClose: function() {
                document.body.style.overflow = '';
            }
        }).then((result) => {
            if (result.isConfirmed) {
                document.getElementById('cancel-form-' + requestId).submit();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        <?php if (isset($_SESSION['message'])): ?>
            Swal.fire({
                title: 'Notification',
                text: "<?= $_SESSION['message'] ?>",
                icon: 'success',
                showConfirmButton: false,
                timer: 2000,
                onOpen: function() {
                    document.body.style.overflow = 'auto';
                },
                onClose: function() {
                    document.body.style.overflow = '';
                }
            });
            <?php unset($_SESSION['message']); ?>
        <?php endif; ?>
    });
</script>

</html>