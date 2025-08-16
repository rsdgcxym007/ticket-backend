#!/usr/bin/env node

/**
 * 📧 NestJS Email API Test
 * ทดสอบการส่งอีเมลผ่าน NestJS application API
 */

const http = require('http');
const querystring = require('querystring');

console.log(
  '🔧 Testing NestJS Email API - ' + new Date().toLocaleString('th-TH'),
);
console.log();

// ฟังก์ชันสำหรับเรียก API
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;

    const options = {
      hostname: 'localhost',
      port: 4000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Email-Test-Script/1.0',
      },
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: response,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }

    req.end();
  });
}

async function testEmailAPI() {
  try {
    console.log('📋 Available tests:');
    console.log('   1. Health check');
    console.log('   2. Direct email test (if endpoint exists)');
    console.log();

    // 1. Health Check
    console.log('⚡ Testing application health...');
    const healthResponse = await makeRequest('GET', '/health');
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.body, null, 2)}`);
    console.log();

    // 2. ทดสอบ email endpoint ต่าง ๆ
    const emailEndpoints = [
      '/api/v1/email/test',
      '/api/email/test',
      '/email/test',
      '/test-email',
    ];

    console.log('📧 Testing email endpoints...');
    const testEmailData = {
      email: 'rsdgcxym@gmail.com',
      subject: '🧪 API Email Test - ' + new Date().toLocaleString('th-TH'),
      message:
        'This is a test email sent through NestJS API with updated Gmail credentials.',
      recipientName: 'Test Recipient',
    };

    for (const endpoint of emailEndpoints) {
      try {
        console.log(`   Testing: ${endpoint}`);
        const response = await makeRequest('POST', endpoint, testEmailData);
        console.log(`   Status: ${response.statusCode}`);

        if (response.statusCode === 200 || response.statusCode === 201) {
          console.log(`   ✅ Success! ${endpoint}`);
          console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
          return; // สำเร็จแล้ว ไม่ต้องทดสอบต่อ
        } else if (response.statusCode !== 404) {
          console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
      console.log();
    }

    console.log('📊 Summary:');
    console.log('   - Application is running on port 4000');
    console.log(
      '   - Health check:',
      healthResponse.statusCode === 200 ? '✅ OK' : '❌ Failed',
    );
    console.log(
      '   - Email endpoints: Need JWT authentication or different path',
    );
    console.log();
    console.log('💡 Next steps:');
    console.log('   1. Check email service directly in application logs');
    console.log('   2. Use proper JWT token for authenticated endpoints');
    console.log('   3. Monitor PM2 logs for email sending attempts');
  } catch (error) {
    console.error('❌ API Test failed:');
    console.error(`   Error: ${error.message}`);

    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check if NestJS app is running: pm2 status');
    console.log('   2. Check application logs: pm2 logs ticket-backend-prod');
    console.log('   3. Verify port 4000 is accessible: ss -tlnp | grep :4000');
  }
}

// รันการทดสอบ
testEmailAPI().catch(console.error);
