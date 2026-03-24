const QRCode = require('qrcode');
const fs = require('fs');

const qrURL = 'http://192.168.8.127:3001/qr/8c64ea2868a2923fcbf676d9f26cddde1343dfb9a7afe20daefe86af4c290aa0';

console.log('🔧 Generating QR Code for mobile access...\n');
console.log('📱 URL:', qrURL, '\n');

// Generate QR code as image file
QRCode.toFile('table5_qr_mobile.png', qrURL, {
  width: 500,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  }
}, function(err) {
  if (err) {
    console.error('❌ Error generating QR code:', err);
  } else {
    console.log('✅ QR Code saved as: table5_qr_mobile.png');
    console.log('\n📋 SCAN THIS QR CODE WITH YOUR PHONE\n');
    
    // Generate console QR code
    QRCode.toString(qrURL, { type: 'terminal', small: true }, function(err, url) {
      if (!err) {
        console.log(url);
      }
    });
  }
});
