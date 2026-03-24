console.log('Backend Environment Variables:');
console.log('================================');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'NOT SET (will use localhost:3001)');
console.log('PORT:', process.env.PORT || '3000');
console.log('DB_DATABASE:', process.env.DB_DATABASE || 'NOT SET');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN || 'NOT SET');
console.log('\n✅ If FRONTEND_URL shows the IP address, new QR codes will work correctly!');
