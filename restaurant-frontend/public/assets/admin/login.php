<?php
session_start();
include_once '../db.php';

$response = ['success' => false, 'message' => ''];

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $email = $_POST['email'];
    $password = $_POST['password'];

    // First check in the admin_tbl
    $stmt = $conn->prepare("SELECT admin_id, password, role, restaurant_id FROM admin_tbl WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();
    $stmt->bind_result($admin_id, $hashed_password, $role, $restaurant_id);

    if ($stmt->num_rows > 0) {
        $stmt->fetch();
        if (password_verify($password, $hashed_password)) {
            // Check subscription status in the restaurant_tbl
            $stmt_subscription = $conn->prepare("SELECT subscription_status FROM restaurant_tbl WHERE restaurant_id = ?");
            $stmt_subscription->bind_param("i", $restaurant_id);
            $stmt_subscription->execute();
            $stmt_subscription->bind_result($subscription_status);
            $stmt_subscription->fetch();
            $stmt_subscription->close();

            if ($subscription_status === 'inactive') {
                $response['message'] = 'Your subscription is over. Please buy a new package.';
                $response['redirect'] = '../../pricing.php';
            } else {
                // Admin found, password matches, and subscription is active
                $_SESSION['admin_id'] = $admin_id;
                $_SESSION['role'] = $role;
                $_SESSION['restaurant_id'] = $restaurant_id;

                // Fetch privileges for the logged-in restaurant
                $stmt_privileges = $conn->prepare('SELECT p.privilege_name FROM restaurant_privileges_tbl rp
                                                   JOIN privileges_tbl p ON rp.privilege_id = p.privilege_id
                                                   WHERE rp.restaurant_id = ?');
                $stmt_privileges->bind_param('i', $restaurant_id);
                $stmt_privileges->execute();
                $result_privileges = $stmt_privileges->get_result();

                $privileges = [];
                while ($row = $result_privileges->fetch_assoc()) {
                    $privileges[] = $row['privilege_name'];
                }

                $_SESSION['privileges'] = $privileges;
                $stmt_privileges->close();

                // Redirect based on the role
                if ($role == 'admin') {
                    $response['success'] = true;
                    $response['redirect'] = 'index.php';
                } elseif ($role == 'steward') {
                    $response['success'] = true;
                    $response['redirect'] = 'notifications.php';
                } elseif ($role == 'housekeeper') {
                    $response['success'] = true;
                    $response['redirect'] = 'housekeeping.php';
                } else {
                    $response['message'] = "Login failed: Unknown role '$role' found. Please contact support.";
                }
            }
        } else {
            $response['message'] = 'Invalid password.';
        }
    } else {
        // Check in super_admin_tbl if not found in admin_tbl
        $stmt->close();
        $stmt = $conn->prepare("SELECT super_admin_id, password FROM super_admin_tbl WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        $stmt->bind_result($sadmin_id, $hashed_password);

        if ($stmt->num_rows > 0) {
            $stmt->fetch();
            if (password_verify($password, $hashed_password)) {
                // Super Admin found and password matches
                $_SESSION['sadmin_id'] = $sadmin_id;
                $_SESSION['role'] = 'super_admin'; // Assign 'super_admin' to the session

                $response['success'] = true;
                $response['redirect'] = '../s_admin/index.php';
            } else {
                $response['message'] = 'Invalid password.';
            }
        } else {
            $response['message'] = 'No user found with that email address.';
        }
    }

    $stmt->close();
    $conn->close();
    echo json_encode($response);
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anawuma | Admin Login</title>
    <!-- SweetAlert2 CSS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

    <!-- FONT AWESOME ICONS -->
    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        integrity="sha512-SnH5WK+bZxgPHs44uWIX+LLJAJ9/2PkPKZ5QiAj6Ta86w+fsb2TkcmfRyVX3pBnMFcV7oQPJkl9QevSCWr3W6A=="
        crossorigin="anonymous"
        referrerpolicy="no-referrer" />

    <!-- Bootstrap CSS -->
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" type="text/css" href="assets/css/iofrm-style.css">
    <link rel="stylesheet" type="text/css" href="assets/css/iofrm-theme16.css">
    <style>
        .password-container {
            position: relative;
        }

        .password-container input {
            padding-right: 40px;
        }

        .password-container i {
            position: absolute;
            right: 19px;
            top: 12px;
            cursor: pointer;
        }
    </style>
</head>

<body>
    <div class="form-body without-side">

        <div class="iofrm-layout">
            <div class="img-holder">
                <div class="bg"></div>
                <div class="info-holder">
                    <img src="assets/images/graphic3.svg" alt="">
                </div>
            </div>
            <div class="website-logo">
                <div class="logo">
                    <img class="logo-size" src="../../assets/images/logos/logo_square-rmbg.png" alt="">
                </div>
            </div>
            <div class="form-holder">
                <div class="form-content">
                    <div class="form-items">
                        <h3>Anawuma Login</h3>
                        
                        </p>
                        <form id="login-form" action="login.php" method="post">
                            <input type="email" id="email" name="email" class="form-control" placeholder="Email" required>
                            <div class="password-container">
                                <input
                                    type="password"
                                    name="password"
                                    class="form-control"
                                    id="password"
                                    placeholder="Password"
                                    required />
                                <i class="far fa-eye" id="togglePassword"></i>
                            </div>
                            <div class="form-button">
                                <button id="submit" type="submit" class="ibtn">Login</button> <a href="forget16.html">Forget password?</a>
                            </div>
                        </form>

                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Custom JS -->
    <script>
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            fetch('login.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            title: 'Success!',
                            text: 'Login successful, redirecting...',
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false
                        }).then(() => {
                            window.location.href = data.redirect;
                        });
                    } else {
                        if (data.redirect) {
                            Swal.fire({
                                title: 'Subscription Over!',
                                text: data.message,
                                icon: 'warning',
                                confirmButtonText: 'Show Packages'
                            }).then(() => {
                                window.location.href = data.redirect; // Redirect to the pricing page
                            });
                        } else {
                            Swal.fire({
                                title: 'Error!',
                                text: data.message || 'An error occurred.',
                                icon: 'error',
                                confirmButtonText: 'OK'
                            });
                        }
                    }
                })
                .catch(error => {
                    Swal.fire({
                        title: 'Error!',
                        text: 'An error occurred while processing your request.',
                        icon: 'error',
                        confirmButtonText: 'OK'
                    });
                });
        });
    </script>
    <script>
        // password eye toggle
        const passwordInput = document.getElementById("password");
        const toggleButton = document.getElementById("togglePassword");

        toggleButton.addEventListener("click", function() {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleButton.classList.remove("far", "fa-eye");
                toggleButton.classList.add("fas", "fa-eye-slash");
            } else {
                passwordInput.type = "password";
                toggleButton.classList.remove("fas", "fa-eye-slash");
                toggleButton.classList.add("far", "fa-eye");
            }
        });
    </script>
</body>

</html>