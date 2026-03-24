// Test script to check if backend properly reads enable_housekeeping
const axios = require('axios');

async function testBackendAPI() {
  try {
    // First, login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'admin@test.com', // Change this to your actual admin email
      password: 'password123' // Change this to your actual password
    });

    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    console.log('Token:', token.substring(0, 20) + '...');

    // Get profile to see restaurant settings
    console.log('\n📋 Fetching profile...');
    const profileResponse = await axios.get('http://localhost:3000/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n✅ Profile data:');
    console.log('Restaurant ID:', profileResponse.data.data.restaurantId);
    console.log('Restaurant Settings:', JSON.stringify(profileResponse.data.data.restaurantSettings, null, 2));

    // Try to access housekeeping endpoint
    console.log('\n🧹 Testing housekeeping endpoint...');
    try {
      const housekeepingResponse = await axios.get('http://localhost:3000/api/housekeeping/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Housekeeping endpoint accessible!');
      console.log('Requests:', housekeepingResponse.data);
    } catch (error) {
      console.log('❌ Housekeeping endpoint failed:');
      console.log('Status:', error.response?.status);
      console.log('Message:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.log('\n💡 Please update the email/password in this script to match your actual admin credentials');
  }
}

testBackendAPI();
