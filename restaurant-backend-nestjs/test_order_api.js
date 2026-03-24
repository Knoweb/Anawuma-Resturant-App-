const axios = require('axios');

const API_URL = 'http://192.168.8.127:3000/api';
const TABLE_KEY = '8c64ea2868a2923fcbf676d9f26cddde1343dfb9a7afe20daefe86af4c290aa0';

async function testOrderEndpoint() {
  console.log('🧪 Testing Order API Endpoint...\n');
  
  try {
    // Test 1: Resolve Table Info
    console.log('1️⃣  Testing table resolution...');
    const tableRes = await axios.get(`${API_URL}/qr/resolve/${TABLE_KEY}`);
    console.log('   ✅ Table resolved:', tableRes.data);
    console.log('');

    // Test 2: Get Food Items
    console.log('2️⃣  Testing food items fetch...');
    const itemsRes = await axios.get(`${API_URL}/food-items`);
    const restaurantItems = itemsRes.data.filter(i => i.restaurantId === 13);
    console.log(`   ✅ Found ${restaurantItems.length} food items for restaurant`);
    if (restaurantItems.length > 0) {
      console.log(`   Sample item data:`, restaurantItems[0]);
      console.log(`   Sample: ${restaurantItems[0].foodItemsName || restaurantItems[0].name} - Rs.${restaurantItems[0].price}`);
    }
    console.log('');

    // Test 3: Place Test Order
    console.log('3️⃣  Testing order placement...');
    const orderPayload = {
      notes: 'Test order from API test script',
      items: [
        {
          foodItemId: restaurantItems[0].foodItemId,
          qty: 1,
          notes: null
        }
      ]
    };

    const orderRes = await axios.post(
      `${API_URL}/orders`,
      orderPayload,
      {
        headers: {
          'x-table-key': TABLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Order placed successfully!');
    console.log(`   Order Number: ${orderRes.data.orderNo}`);
    console.log(`   Order ID: ${orderRes.data.orderId}`);
    console.log(`   Status: ${orderRes.data.status}`);
    console.log(`   Total: Rs.${orderRes.data.totalAmount}`);
    console.log('');

    console.log('🎉 All API tests passed! The order system is working correctly.');
    console.log('');
    console.log('📱 Try placing an order from your phone now!');

  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOrderEndpoint();
