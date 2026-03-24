# Test API Key Authentication
# Restaurant ID 1 API Key

$apiKey = "9ef2e7e841f5e41dcad95882f5d4ca78bf8d70f7800ef220732d641e7fddef55"

Write-Host "`n🧪 Testing Public Order Creation with API Key`n" -ForegroundColor Cyan

# Test 1: Create order via header
Write-Host "Test 1: POST /orders with x-api-key header" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod `
        -Method POST `
        -Uri "http://localhost:3000/api/orders" `
        -Headers @{
            "x-api-key" = $apiKey
            "Content-Type" = "application/json"
        } `
        -Body (Get-Content test_order_with_apikey.json -Raw) `
        -ErrorAction Stop
    
    Write-Host "✓ Order Created Successfully!" -ForegroundColor Green
    Write-Host "  Order ID: $($response.orderId)" -ForegroundColor Cyan
    Write-Host "  Order No: $($response.orderNo)" -ForegroundColor Cyan
    Write-Host "  Table: $($response.tableNo)" -ForegroundColor Cyan
    Write-Host "  Total: `$$($response.totalAmount)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Create order via query param
Write-Host "Test 2: POST /orders with apiKey query parameter" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod `
        -Method POST `
        -Uri "http://localhost:3000/api/orders?apiKey=$apiKey" `
        -Headers @{"Content-Type" = "application/json"} `
        -Body '{"tableNo":"T-10","items":[{"foodItemId":50,"qty":1}]}' `
        -ErrorAction Stop
    
    Write-Host "✓ Order Created Successfully!" -ForegroundColor Green
    Write-Host "  Order ID: $($response.orderId)" -ForegroundColor Cyan
    Write-Host "  Table: $($response.tableNo)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}
