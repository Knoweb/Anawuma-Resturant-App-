<?php
// Start a new session or resume the existing session
session_start();

// Check if the admin is logged in
if (!isset($_SESSION['admin_id'])) {
    // Redirect to login page if not logged in
    header("Location: login.php");
    exit;
}

// Ensure restaurant_id is available in the session
if (!isset($_SESSION['restaurant_id'])) {
    // Handle case where restaurant_id is not set in the session
    header("Location: logout.php");
    exit;
}
$restaurant_id = $_SESSION['restaurant_id'];

// Database connection
include_once "../db.php";

// Fetch restaurant details based on restaurant_id from session
$stmt_restaurant = $conn->prepare('SELECT restaurant_name, subscription_expiry_date, logo FROM restaurant_tbl WHERE restaurant_id = ?');
$stmt_restaurant->bind_param('i', $restaurant_id);
$stmt_restaurant->execute();
$stmt_restaurant->bind_result($restaurant_name, $subscription_expiry_date, $logo);
$stmt_restaurant->fetch();
$stmt_restaurant->close();

// Save the logo in session storage
$_SESSION['restaurant_logo'] = $logo;
$_SESSION['restaurant_name'] = $restaurant_name;

// Check if the subscription is about to expire within 3 days
$days_left = null;
$subscription_alert = false;
if ($subscription_expiry_date) {
    $expiry_date = new DateTime($subscription_expiry_date);
    $current_date = new DateTime();
    $interval = $current_date->diff($expiry_date);
    $days_left = $interval->days;

    if ($days_left <= 3) {
        $subscription_alert = true;
    }
}
// Fetch pending housekeeping count
$stmt_pending = $conn->prepare("SELECT COUNT(*) FROM housekeeping_tbl WHERE status = 'pending' AND restaurant_id = ?");
$stmt_pending->bind_param('i', $restaurant_id);
$stmt_pending->execute();
$stmt_pending->bind_result($pending_count);
$stmt_pending->fetch();
$stmt_pending->close();

// Fetch incomplete orders count
$total_incomplete_orders_count = 0;
$stmt = $conn->prepare("
    SELECT 
        (SELECT COUNT(*) FROM orders_tbl WHERE completed = 0 AND restaurant_id = ? AND steward_confirmation = 'confirmed' ) +
        (SELECT COUNT(*) FROM room_orders_tbl WHERE completed = 0 AND restaurant_id = ?) AS total_count
");
$stmt->bind_param('ii', $restaurant_id, $restaurant_id);
$stmt->execute();
$stmt->bind_result($total_incomplete_orders_count);
$stmt->fetch();
$stmt->close();

// Fetch pending steward confirmation count
$pending_steward_confirmation_count = 0;
$stmt = $conn->prepare("SELECT COUNT(*) FROM orders_tbl WHERE steward_confirmation = 'pending' AND restaurant_id = ?");
$stmt->bind_param('i', $restaurant_id); // Bind the restaurant_id as an integer
$stmt->execute();
$stmt->bind_result($pending_steward_confirmation_count);
$stmt->fetch();
$stmt->close();

// Fetch privileges for the logged-in restaurant
$privileges = [];
$stmt_privileges = $conn->prepare('
    SELECT p.privilege_name
    FROM restaurant_privileges_tbl rp
    JOIN privileges_tbl p ON rp.privilege_id = p.privilege_id
    WHERE rp.restaurant_id = ?
');
$stmt_privileges->bind_param('i', $restaurant_id);
$stmt_privileges->execute();
$stmt_privileges->bind_result($privilege_name);
while ($stmt_privileges->fetch()) {
    $privileges[] = $privilege_name;
}
$stmt_privileges->close();
$conn->close();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
    <meta name="description" content="" />
    <meta name="author" content="" />
    <title>Anawuma | Admin</title>
    <link href="assets/css/styles.css" rel="stylesheet" />
    <script src="https://use.fontawesome.com/releases/v6.3.0/js/all.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        .badge {
            position: relative;
            top: -10px;
            right: -10px;
            font-size: 12px;
        }
    </style>
</head>

<body class="sb-nav-fixed">
    <nav class="sb-topnav navbar navbar-expand navbar-dark bg-dark">
        <!-- Navbar Brand-->
        <a class="navbar-brand ps-3"
            href="index.php"><?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?></a>
        <!-- Sidebar Toggle-->
        <button class="btn btn-link btn-sm order-1 order-lg-0 me-4 me-lg-0" id="sidebarToggle" href="#!"><i
                class="fas fa-bars"></i></button>
        <!-- Navbar Search-->
        <form class="d-none d-md-inline-block form-inline ms-auto me-0 me-md-3 my-2 my-md-0">
        </form>
        <!-- Navbar-->
        <ul class="navbar-nav ms-auto ms-md-0 me-3 me-lg-4">
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" id="navbarDropdown" href="#" role="button" data-bs-toggle="dropdown"
                    aria-expanded="false"><i class="fas fa-user fa-fw"></i></a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                    <li>
                        <hr class="dropdown-divider" />
                    </li>
                    <li><a class="dropdown-item" style="color: red;" href="logout.php">Logout</a></li>
                </ul>
            </li>
        </ul>
    </nav>
    <div id="layoutSidenav">
        <div id="layoutSidenav_nav">
            <nav class="sb-sidenav accordion sb-sidenav-dark custom-navbar" id="sidenavAccordion">
                <div class="sb-sidenav-menu">
                    <div class="nav">
                        <?php if (in_array('QR Menu System', $privileges)) : ?>
                            <a class="nav-link" href="#" onclick="loadContent('menus.php')">
                                <div class="sb-nav-link-icon"><i class="fas fa-utensils"></i></div>
                                All Menus
                            </a>

                            <div class="sb-sidenav-menu-heading">Kitchen</div>
                            <a class="nav-link collapsed" href="#" data-bs-toggle="collapse"
                                data-bs-target="#collapseLayoutsMenus" aria-expanded="false"
                                aria-controls="collapseLayoutsMenus">
                                <div class="sb-nav-link-icon"><i class="fas fa-bars"></i></div>
                                Menus
                                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
                            </a>
                            <div class="collapse" id="collapseLayoutsMenus" aria-labelledby="headingOne"
                                data-bs-parent="#sidenavAccordion">
                                <nav class="sb-sidenav-menu-nested nav">
                                    <a class="nav-link" href="#" onclick="loadContent('add_menu.php')"> Add Menu</a>
                                    <a class="nav-link" href="#" onclick="loadContent('add_category.php')"> Add Category</a>
                                    <a class="nav-link" href="#" onclick="loadContent('add_subcategory.php')"> Add
                                        Subcategories</a>
                                    <a class="nav-link" href="add_food_item.php"> Add Food Items</a>
                                </nav>
                            </div>
                            <a class="nav-link collapsed" href="#" data-bs-toggle="collapse"
                                data-bs-target="#collapseLayoutsQRCodes" aria-expanded="false"
                                aria-controls="collapseLayoutsQRCodes">
                                <div class="sb-nav-link-icon"><i class="fas fa-qrcode"></i></div>
                                QR Codes
                                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
                            </a>
                            <div class="collapse" id="collapseLayoutsQRCodes" aria-labelledby="headingOne"
                                data-bs-parent="#sidenavAccordion">
                                <nav class="sb-sidenav-menu-nested nav">
                                    <a class="nav-link" href="#" onclick="loadContent('show_qr.php')"> All QR codes</a>
                                    <a class="nav-link" href="#" onclick="loadContent('generate_qr.php')"> Generate QR
                                        Codes</a>
                                </nav>
                            </div>
                            <a class="nav-link collapsed" href="#" data-bs-toggle="collapse"
                                data-bs-target="#collapseLayoutsKitchen" aria-expanded="false"
                                aria-controls="collapseLayoutsKitchen">
                                <div class="sb-nav-link-icon"><i class="fas fa-hamburger"></i></div>
                                Kitchen <?php if ($total_incomplete_orders_count > 0) : ?>
                                    <span class="badge bg-danger"
                                        id="incomplete-orders-badge"><?php echo $total_incomplete_orders_count; ?></span>
                                <?php endif; ?>

                                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
                            </a>
                            <div class="collapse" id="collapseLayoutsKitchen" aria-labelledby="headingOne"
                                data-bs-parent="#sidenavAccordion">
                                <nav class="sb-sidenav-menu-nested nav">
                                    <a class="nav-link" href="admin_kitchen.php">Orders
                                        <!-- Display incomplete orders count as a badge -->
                                        <?php if ($total_incomplete_orders_count > 0) : ?>
                                            <span class="badge bg-danger"
                                                id="incomplete-orders-badge"><?php echo $total_incomplete_orders_count; ?></span>
                                        <?php endif; ?>
                                        <a class="nav-link" href="old_orders.php">Old Orders</a>
                                </nav>
                            </div>
                            <a class="nav-link" href="notifications.php">
                                <div class="sb-nav-link-icon"><i class="fas fa-utensils"></i></div>
                                Steward Dashboard
                                <?php if ($pending_steward_confirmation_count > 0) : ?>
                                    <span class="badge bg-danger"
                                        id="pending-steward-badge"><?php echo $pending_steward_confirmation_count; ?></span>
                                <?php endif; ?>
                            </a>
                        <?php endif; ?>
                        <?php if (in_array('QR Housekeeping System', $privileges)) : ?>
                            <div class="sb-sidenav-menu-heading">Room Service</div>
                            <a class="nav-link collapsed" href="#" data-bs-toggle="collapse"
                                data-bs-target="#collapseLayoutsHkeeping" aria-expanded="false"
                                aria-controls="collapseLayoutsHkeeping">
                                <div class="sb-nav-link-icon"><i class="fas fa-broom"></i></div>
                                Housekeeping
                                <!-- Display the pending count as a badge -->
                                <?php if ($pending_count > 0) : ?>
                                    <span class="badge bg-danger" id="pending-hk-badge"><?php echo $pending_count; ?></span>
                                <?php endif; ?>
                                <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
                            </a>
                            <div class="collapse" id="collapseLayoutsHkeeping" aria-labelledby="headingOne"
                                data-bs-parent="#sidenavAccordion">
                                <nav class="sb-sidenav-menu-nested nav">
                                    <a class="nav-link" href="housekeeping.php"> Messages
                                        <!-- Display the pending count as a badge -->
                                        <?php if ($pending_count > 0) : ?>
                                            <span class="badge bg-danger"
                                                id="pending-hk-badge"><?php echo $pending_count; ?></span>
                                        <?php endif; ?>
                                    </a>
                                    <a class="nav-link" href="#" onclick="loadContent('show_room_qr.php')"> All Room QR
                                        codes</a>
                                    <a class="nav-link" href="#" onclick="loadContent('generate_room_qr.php')"> Generate
                                        Room QR Codes</a>
                                </nav>
                            </div>
                        <?php endif; ?>
                        <?php if (in_array('Special Offers', $privileges)) : ?>
                            <div class="sb-sidenav-menu-heading">Special Offers</div>
                            <a class="nav-link" href="add_offer.php">
                                <div class="sb-nav-link-icon"><i class="fas fa-tag"></i></div>
                                Add New Offer
                            </a>
                            <a class="nav-link" href="#" onclick="loadContent('show_offers.php')">
                                <div class="sb-nav-link-icon"><i class="fas fa-list"></i></div>
                                Manage Offers
                            </a>
                        <?php endif; ?>
                        <div class="sb-sidenav-menu-heading">Reports</div>
                        <a class="nav-link collapsed" href="#" data-bs-toggle="collapse"
                            data-bs-target="#collapseLayoutsReports" aria-expanded="false"
                            aria-controls="collapseLayoutsReports">
                            <div class="sb-nav-link-icon"><i class="fas fa-chart-bar"></i></div>
                            Reports
                            <div class="sb-sidenav-collapse-arrow"><i class="fas fa-angle-down"></i></div>
                        </a>
                        <div class="collapse" id="collapseLayoutsReports" aria-labelledby="headingOne"
                            data-bs-parent="#sidenavAccordion">
                            <nav class="sb-sidenav-menu-nested nav">
                                <a class="nav-link" href="#" onclick="loadContent('daily_report.php')"> Daily Report</a>
                                <a class="nav-link" href="#" onclick="loadContent('monthly_report.php')"> Monthly Report</a>
                            </nav>
                        </div>
                    </div>
                </div>

               
                      



               <!-- <div class="sb-sidenav-footer">
                    <div class="small">Logged in as:</div>
                    <?php echo htmlspecialchars($restaurant_name, ENT_QUOTES, 'UTF-8'); ?>
                </div>
                        -->
            </nav>
        </div>
        <div id="layoutSidenav_content">
            <main>
                <div class="content" id="content-area">
                    <!-- Content will be loaded dynamically here -->
                </div>
            </main>
            <footer class="py-4 bg-light mt-auto">
                <div class="container-fluid px-4">
                    <div class="d-flex align-items-center justify-content-between small">
                        <div class="text-muted">Copyright &copy; Knoweb PVT LTD <?php echo date("Y"); ?></div>
                    </div>
                </div>
            </footer>
        </div>
    </div>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js" crossorigin="anonymous">
    </script>
    <script src="assets/js/scripts.js"></script>
    <script>
        $(document).ready(function() {
            function refreshNavbar() {
                $.ajax({
                    url: 'fetch_nav_data.php',
                    type: 'GET',
                    dataType: 'json',
                    success: function(data) {
                        $('#incomplete-orders-badge').text(data.total_incomplete_orders_count).toggle(
                            data.total_incomplete_orders_count > 0);
                        $('#pending-hk-badge').text(data.pending_count).toggle(data.pending_count > 0);
                        $('#pending-steward-badge').text(data.pending_steward_confirmation_count)
                            .toggle(data.pending_steward_confirmation_count > 0);
                    },
                    error: function() {
                        console.error("Error fetching navbar data.");
                    }
                });
            }

            // Refresh navbar every minute
            setInterval(refreshNavbar, 10000); // 15000 ms = 0.5 minute
            refreshNavbar(); // Initial call to populate immediately
        });
    </script>
    <script>
        function loadContent(page) {
            // Get the current directory path and construct the full URL
            const currentPath = window.location.pathname;
            const adminDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
            const fullUrl = adminDir + page;
            
            console.log('loadContent called with page:', page);
            console.log('Current path:', currentPath);
            console.log('Admin dir:', adminDir);
            console.log('Full URL:', fullUrl);
            
            $.ajax({
                url: fullUrl,
                type: 'GET',
                dataType: 'html',
                success: function(response) {
                    console.log('Content loaded successfully for:', page);
                    $('#content-area').html(response);
                },
                error: function(xhr, status, error) {
                    console.error('Error loading page:', page);
                    console.error('Status:', status);
                    console.error('Error:', error);
                    console.error('XHR Status:', xhr.status);
                    console.error('XHR Response:', xhr.responseText);
                    $('#content-area').html('<div class="alert alert-danger">Error loading content. Check console for details.</div>');
                }
            });
        }

        $(document).ready(function() {
            // Fetch privileges from the session
            const currentPath = window.location.pathname;
            const adminDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
            
            $.get(adminDir + 'get_privileges.php', function(data) {
                const privileges = data.privileges;

                // Determine which page to load
                if (privileges.includes('QR Menu System') && privileges.includes(
                        'QR Housekeeping System')) {
                    loadContent('menus.php');
                } else if (privileges.includes('QR Menu System')) {
                    loadContent('menus.php');
                } else if (privileges.includes('QR Housekeeping System')) {
                    loadContent('housekeeping.php');
                } else {
                    loadContent('login.php'); // Default page if no relevant privileges are found
                }
            }, 'json');
        });
    </script>
   <!-- SweetAlert Toast for subscription expiry -->
   <?php if ($subscription_alert) : ?>
    <script>
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: 'Subscription Expiring Soon',
                html: 'Your subscription will expire in </br><?php echo $days_left; ?> day(s). </br> <a href="../../pricing.php" style="color: #3085d6; text-decoration: underline;">Renew Now</a>',
                showConfirmButton: false,
                timer: 8000,
                timerProgressBar: true
            });
        </script>
    <?php endif; ?>
</body>

</html>