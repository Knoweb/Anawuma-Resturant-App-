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

// Get the restaurant ID from the session
$restaurant_id = $_SESSION['restaurant_id'];

// Database connection
include_once "../db.php";

// Fetch offers from the database for the specific restaurant
$sql = "SELECT * FROM special_offers_tbl WHERE restaurant_id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $restaurant_id);
$stmt->execute();
$result = $stmt->get_result();
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Special Offers</title>
    <!-- Bootstrap -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" />
    <!-- SweetAlert CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">
    <style>
        body {
            background-color: #f8f9fa;
        }

        .offer-card {
            border: 1px solid #dee2e6;
            border-radius: 10px;
            margin-bottom: 20px;
            padding: 20px;
            transition: transform 0.2s;
            background-color: #fff;
        }

        .offer-card:hover {
            transform: scale(1.02);
        }

        .offer-image {
            width: 100%;
            height: auto;
            border-radius: 10px;
        }

        .offer-title {
            font-size: 1.5rem;
            font-weight: bold;
        }

        .offer-description {
            font-size: 1rem;
            margin-bottom: 15px;
        }

        .actions {
            display: flex;
            justify-content: space-between;
        }

        .alert {
            margin-top: 20px;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1 class="mb-4">Manage Special Offers</h1>
        <?php if (isset($_GET['msg'])): ?>
            <div class="alert alert-success"><?php echo $_GET['msg']; ?></div>
        <?php endif; ?>
        <div class="mb-3">
            <a href="add_offer.php" class="btn btn-primary">Add New Offer</a>
        </div>
        <div class="row">
            <?php if ($result->num_rows > 0): ?>
                <?php while ($row = $result->fetch_assoc()): ?>
                    <div class="col-md-4">
                        <div class="offer-card">
                            <img src="<?php echo htmlspecialchars($row['image_path']); ?>" alt="Offer Image"
                                class="offer-image">
                            <h5 class="offer-title"><?php echo htmlspecialchars($row['title']); ?></h5>
                            <p class="offer-description"><?php echo htmlspecialchars($row['description']); ?></p>
                            <p><strong>Offer Type:</strong> <?php echo htmlspecialchars($row['product_type']); ?></p>
                            <p><strong>Start Date:</strong> <?php echo $row['start_date']; ?></p>
                            <p><strong>End Date:</strong> <?php echo $row['end_date']; ?></p>
                            <div class="actions">
                                <a href="edit_offer.php?id=<?php echo $row['offer_id']; ?>"
                                    class="btn btn-warning btn-sm">Edit</a>
                                <button class="btn btn-danger btn-sm"
                                    onclick="confirmDelete(<?php echo $row['offer_id']; ?>)">Delete</button>
                            </div>
                        </div>
                    </div>
                <?php endwhile; ?>
            <?php else: ?>
                <div class="col-12 text-center">
                    <p>No special offers found.</p>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- SweetAlert JS -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script>
        function confirmDelete(offerId) {
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Perform AJAX request to delete the offer
                    $.ajax({
                        url: 'delete_offer.php?id=' + offerId,
                        type: 'GET',
                        success: function(response) {
                            const res = JSON.parse(response);
                            if (res.success) {
                                Swal.fire(
                                    'Deleted!',
                                    res.message,
                                    'success'
                                ).then(() => {
                                    // Refresh the page or redirect
                                    location
                                        .reload(); // Reload the page to show the updated offers
                                });
                            } else {
                                Swal.fire(
                                    'Error!',
                                    res.message,
                                    'error'
                                );
                            }
                        },
                        error: function() {
                            Swal.fire(
                                'Error!',
                                'There was an error processing your request.',
                                'error'
                            );
                        }
                    });
                }
            });
        }
    </script>

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.3/dist/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
</body>

</html>

<?php
$stmt->close(); // Close the prepared statement
$conn->close(); // Close the database connection
?>