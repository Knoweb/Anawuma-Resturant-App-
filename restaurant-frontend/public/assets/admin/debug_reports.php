<?php
include_once 'db.php';

$restaurant_id = isset($_SESSION['restaurant_id']) ? $_SESSION['restaurant_id'] : 1;

// Check the structure of reports_tbl
echo "<h3>Reports Table Structure:</h3>";
$showColumns = "SHOW COLUMNS FROM reports_tbl";
$result = $conn->query($showColumns);
echo "<table border='1' style='border-collapse: collapse; margin: 20px 0;'>";
echo "<tr><th>Field</th><th>Type</th><th>Null</th><th>Key</th><th>Default</th><th>Extra</th></tr>";
while($row = $result->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . $row['Field'] . "</td>";
    echo "<td>" . $row['Type'] . "</td>";
    echo "<td>" . $row['Null'] . "</td>";
    echo "<td>" . $row['Key'] . "</td>";
    echo "<td>" . $row['Default'] . "</td>";
    echo "<td>" . $row['Extra'] . "</td>";
    echo "</tr>";
}
echo "</table>";

// Check sample data
echo "<h3>Sample Data from reports_tbl:</h3>";
$sampleQuery = "SELECT report_id, sales_date, sales_time, food_items_name, category_name, quantity, total_price FROM reports_tbl LIMIT 5";
$sampleResult = $conn->query($sampleQuery);

if($sampleResult && $sampleResult->num_rows > 0) {
    echo "<table border='1' style='border-collapse: collapse; margin: 20px 0;'>";
    echo "<tr><th>Report ID</th><th>Date</th><th>Time</th><th>Food Items Name</th><th>Category</th><th>Quantity</th><th>Total Price</th></tr>";
    while($row = $sampleResult->fetch_assoc()) {
        echo "<tr>";
        echo "<td>" . $row['report_id'] . "</td>";
        echo "<td>" . $row['sales_date'] . "</td>";
        echo "<td>" . $row['sales_time'] . "</td>";
        echo "<td>" . $row['food_items_name'] . "</td>";
        echo "<td>" . $row['category_name'] . "</td>";
        echo "<td>" . $row['quantity'] . "</td>";
        echo "<td>" . $row['total_price'] . "</td>";
        echo "</tr>";
    }
    echo "</table>";
} else {
    echo "No data found in reports_tbl";
}

$conn->close();
?>
