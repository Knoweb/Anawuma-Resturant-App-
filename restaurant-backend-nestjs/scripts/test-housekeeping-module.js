require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let authToken = null;
let testRoomKey = null;
let testRequestId = null;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

function section(msg) {
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}${msg}${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

async function login() {
  section('TEST 1: LOGIN (පිවිසීම)');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@housekeeping.com',
      password: 'test123'
    });
    
    // Handle different response structures
    authToken = response.data.access_tokeen || 
                response.data.access_token || 
                response.data.data?.access_tokeen ||
                response.data.data?.access_token ||
                response.data.accessToken;
    
    if (!authToken) {
      error('Login response did not contain access token!');
      info(`Response: ${JSON.stringify(response.data).substring(0, 300)}`);
      return false;
    }
    
    success(`Login successful! Token: ${authToken.substring(0, 20)}...`);
    
    const user = response.data.user || response.data.data?.user;
    if (user) {
      info(`User: ${user.email} (${user.role})`);
      info(`Restaurant ID: ${user.restaurantId}`);
      
      if (user.restaurantSettings?.enableHousekeeping) {
        success('Housekeeping module එක enabled කරලා තියෙනවා!');
      }
    }
    
    return true;
  } catch (err) {
    error(`Login failed: ${err.response?.data?.message || err.message}`);
    if (err.response?.data) {
      info(`Response: ${JSON.stringify(err.response.data)}`);
    }
    return false;
  }
}

async function testGenerateSingleQR() {
  section('TEST 2: SINGLE QR CODE GENERATION (එකක් generate කරන එක)');
  try {
    const response = await axios.post(
      `${API_URL}/room-qr`,
      {
        roomNo: 'Room 101'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    testRoomKey = response.data.roomKey;
    success(`QR Code generated for Room 101!`);
    info(`Room Key: ${testRoomKey}`);
    info(`QR URL: ${response.data.qrUrl}`);
    info(`Room QR ID: ${response.data.roomQrId}`);
    
    return true;
  } catch (err) {
    error(`Single QR generation failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testBulkQRGeneration() {
  section('TEST 3: BULK QR CODE GENERATION (bulk එකක් generate කරන එක)');
  try {
    const response = await axios.post(
      `${API_URL}/room-qr/bulk`,
      {
        roomCount: 15
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const data = response.data.data || response.data;
    const qrCodes = Array.isArray(data) ? data : [];
    
    success(`Bulk generation successful! Generated ${qrCodes.length} QR codes`);
    if (qrCodes.length > 0) {
      info(`First room: ${qrCodes[0].roomNo} (Key: ${qrCodes[0].roomKey?.substring(0, 16)}...)`);
      info(`Last room: ${qrCodes[qrCodes.length - 1].roomNo}`);
      
      // Save one more room key for testing
      if (!testRoomKey) {
        testRoomKey = qrCodes[0].roomKey;
      }
    }
    
    return true;
  } catch (err) {
    error(`Bulk QR generation failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testGetAllQRCodes() {
  section('TEST 4: FETCH ALL QR CODES (QR codes list එක fetch කරන එක)');
  try {
    const response = await axios.get(
      `${API_URL}/room-qr`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    success(`Fetched ${response.data.length} QR codes`);
    
    if (response.data.length > 0) {
      info(`Sample rooms: ${response.data.slice(0, 5).map(qr => qr.roomNo).join(', ')}`);
    }
    
    return true;
  } catch (err) {
    error(`Fetch QR codes failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testResolveRoomKey() {
  section('TEST 5: RESOLVE ROOM KEY (room key එක resolve කරන එක)');
  
  if (!testRoomKey) {
    error('No test room key available! Skipping...');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_URL}/qr/room/resolve/${testRoomKey}`
    );
    
    const data = response.data.data || response.data;
    
    success(`Room key resolved successfully!`);
    info(`Room Number: ${data.roomNo}`);
    info(`Restaurant ID: ${data.restaurantId}`);
    info(`Active: ${data.isActive}`);
    
    return true;
  } catch (err) {
    error(`Resolve room key failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testPublicRequestSubmission() {
  section('TEST 6: GUEST REQUEST SUBMISSION (guest කෙනෙක් request එකක් දාන එක)');
  
  if (!testRoomKey) {
    error('No test room key available! Skipping...');
    return false;
  }
  
  try {
    const response = await axios.post(
      `${API_URL}/housekeeping/request`,
      {
        requestType: 'CLEANING',
        message: 'Please clean the room. Thank you!'
      },
      {
        headers: { 
          'x-room-key': testRoomKey
        }
      }
    );
    
    const data = response.data.data || response.data;
    testRequestId = data.requestId;
    
    success(`Housekeeping request submitted successfully!`);
    info(`Request ID: ${testRequestId}`);
    info(`Room: ${data.roomNo}`);
    info(`Type: ${data.requestType}`);
    info(`Status: ${data.status}`);
    
    return true;
  } catch (err) {
    error(`Request submission failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testSubmitMultipleRequests() {
  section('TEST 7: SUBMIT MULTIPLE REQUESTS (requests කිහිපයක් දාන එක)');
  
  if (!testRoomKey) {
    error('No test room key available! Skipping...');
    return false;
  }
  
  const requestTypes = ['TOWELS', 'WATER', 'OTHER'];
  const messages = [
    'Need fresh towels please',
    'Can I get some bottled water?',
    'Need extra pillows'
  ];
  
  let successCount = 0;
  
  for (let i = 0; i < requestTypes.length; i++) {
    try {
      await axios.post(
        `${API_URL}/housekeeping/request`,
        {
          requestType: requestTypes[i],
          message: messages[i]
        },
        {
          headers: { 'x-room-key': testRoomKey }
        }
      );
      successCount++;
    } catch (err) {
      // Continue even if one fails
    }
  }
  
  success(`Submitted ${successCount} additional requests`);
  return successCount > 0;
}

async function testFetchAllRequests() {
  section('TEST 8: FETCH ALL REQUESTS (requests list එක fetch කරන එක)');
  try {
    const response = await axios.get(
      `${API_URL}/housekeeping/requests`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const data = response.data.data || response.data;
    const requests = Array.isArray(data) ? data : [];
    
    success(`Fetched ${requests.length} housekeeping requests`);
    
    if (requests.length > 0) {
      info(`Latest request: Room ${requests[0].roomNo} - ${requests[0].requestType} (${requests[0].status})`);
      
      const statusCounts = requests.reduce((acc, req) => {
        acc[req.status] = (acc[req.status] || 0) + 1;
        return acc;
      }, {});
      
      info(`Status breakdown: ${JSON.stringify(statusCounts)}`);
    }
    
    return true;
  } catch (err) {
    error(`Fetch requests failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testFilterRequests() {
  section('TEST 9: FILTER REQUESTS (filters test කරන එක)');
  
  try {
    // Test filter by status
    const statusResponse = await axios.get(
      `${API_URL}/housekeeping/requests?status=NEW`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    success(`Filter by status=NEW: Found ${statusResponse.data.length} requests`);
    
    // Test filter by type
    const typeResponse = await axios.get(
      `${API_URL}/housekeeping/requests?type=CLEANING`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    success(`Filter by type=CLEANING: Found ${typeResponse.data.length} requests`);
    
    // Test filter by room
    const roomResponse = await axios.get(
      `${API_URL}/housekeeping/requests?roomNo=Room 101`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    success(`Filter by roomNo=Room 101: Found ${roomResponse.data.length} requests`);
    
    return true;
  } catch (err) {
    error(`Filter requests failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function testUpdateRequestStatus() {
  section('TEST 10: UPDATE REQUEST STATUS (status update කරන එක)');
  
  if (!testRequestId) {
    error('No test request ID available! Skipping...');
    return false;
  }
  
  const statuses = ['IN_PROGRESS', 'DONE'];
  
  for (const status of statuses) {
    try {
      const response = await axios.patch(
        `${API_URL}/housekeeping/requests/${testRequestId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      success(`Status updated to: ${status}`);
      info(`Request ID: ${response.data.requestId}, Room: ${response.data.roomNo}`);
    } catch (err) {
      error(`Update to ${status} failed: ${err.response?.data?.message || err.message}`);
      return false;
    }
  }
  
  return true;
}

async function testDeleteQRCode() {
  section('TEST 11: DELETE QR CODE (QR code එකක් delete කරන එක)');
  
  try {
    // First create a test QR to delete
    const createResponse = await axios.post(
      `${API_URL}/room-qr`,
      {
        roomNo: 'Test Delete Room'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    const qrId = createResponse.data.roomQrId;
    info(`Created test QR with ID: ${qrId}`);
    
    // Now delete it
    await axios.delete(
      `${API_URL}/room-qr/${qrId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    success(`QR code deleted successfully!`);
    return true;
  } catch (err) {
    error(`Delete QR code failed: ${err.response?.data?.message || err.message}`);
    return false;
  }
}

async function printSummary(results) {
  section('TEST SUMMARY (සාරාංශය)');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed/total)*100).toFixed(1)}%\n`);
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    console.log(`${color}${icon} Test ${index + 1}: ${result.name}${colors.reset}`);
  });
  
  if (passed === total) {
    console.log(`\n${colors.green}🎉 සියලු tests pass වුනා! Module එක සම්පූර්ණයෙන්ම වැඩ කරනවා!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the errors above.${colors.reset}\n`);
  }
}

// Main test runner
async function runAllTests() {
  console.log(`${colors.blue}
╔═══════════════════════════════════════════════════════════╗
║     HOUSEKEEPING MODULE COMPREHENSIVE TEST SUITE          ║
║     Testing all functionality end-to-end                  ║
╚═══════════════════════════════════════════════════════════╝
  ${colors.reset}`);
  
  const results = [];
  
  // Run tests in sequence
  results.push({ name: 'Login', passed: await login() });
  results.push({ name: 'Generate Single QR', passed: await testGenerateSingleQR() });
  results.push({ name: 'Generate Bulk QR (15 rooms)', passed: await testBulkQRGeneration() });
  results.push({ name: 'Fetch All QR Codes', passed: await testGetAllQRCodes() });
  results.push({ name: 'Resolve Room Key', passed: await testResolveRoomKey() });
  results.push({ name: 'Guest Request Submission', passed: await testPublicRequestSubmission() });
  results.push({ name: 'Submit Multiple Requests', passed: await testSubmitMultipleRequests() });
  results.push({ name: 'Fetch All Requests', passed: await testFetchAllRequests() });
  results.push({ name: 'Filter Requests', passed: await testFilterRequests() });
  results.push({ name: 'Update Request Status', passed: await testUpdateRequestStatus() });
  results.push({ name: 'Delete QR Code', passed: await testDeleteQRCode() });
  
  // Print summary
  await printSummary(results);
  
  const failedCount = results.filter(r => !r.passed).length;
  process.exit(failedCount > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  error(`Test suite crashed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
