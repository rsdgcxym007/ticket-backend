// Updated imports to ES6 style
import newman from 'newman';
import fs from 'fs';
import path from 'path';

// Create Postman collection for API testing
const apiCollection = {
  info: {
    name: 'Ticket Booking API Tests',
    description: 'Comprehensive API test collection',
    schema:
      'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  auth: {
    type: 'bearer',
    bearer: [
      {
        key: 'token',
        value: '{{authToken}}',
        type: 'string',
      },
    ],
  },
  variable: [
    {
      key: 'baseUrl',
      value: 'http://localhost:3000/api/v1',
    },
    {
      key: 'authToken',
      value: '',
    },
    {
      key: 'testUserId',
      value: '',
    },
    {
      key: 'testOrderId',
      value: '',
    },
  ],
  item: [
    {
      name: '🔐 Authentication Tests',
      item: [
        {
          name: 'Register New User',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 201", function () {',
                  '    pm.response.to.have.status(201);',
                  '});',
                  'pm.test("Response has access token", function () {',
                  '    var jsonData = pm.response.json();',
                  '    pm.expect(jsonData).to.have.property("access_token");',
                  '    pm.collectionVariables.set("authToken", jsonData.access_token);',
                  '    pm.collectionVariables.set("testUserId", jsonData.user.id);',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'autotest@example.com',
                password: 'password123',
                name: 'Auto Test User',
                phone: '0123456789',
              }),
            },
            url: {
              raw: '{{baseUrl}}/auth/register',
              host: ['{{baseUrl}}'],
              path: ['auth', 'register'],
            },
          },
        },
        {
          name: 'Login User',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Response has access token", function () {',
                  '    var jsonData = pm.response.json();',
                  '    pm.expect(jsonData).to.have.property("access_token");',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'autotest@example.com',
                password: 'password123',
              }),
            },
            url: {
              raw: '{{baseUrl}}/auth/login',
              host: ['{{baseUrl}}'],
              path: ['auth', 'login'],
            },
          },
        },
      ],
    },
    {
      name: '🎫 Order Management Tests',
      item: [
        {
          name: 'Get All Orders',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Response has data array", function () {',
                  '    var jsonData = pm.response.json();',
                  '    pm.expect(jsonData).to.have.property("data");',
                  '    pm.expect(jsonData.data).to.be.an("array");',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/orders',
              host: ['{{baseUrl}}'],
              path: ['orders'],
            },
          },
        },
        {
          name: 'Get Order Statistics',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                  'pm.test("Response has statistics", function () {',
                  '    var jsonData = pm.response.json();',
                  '    pm.expect(jsonData).to.have.property("totalOrders");',
                  '    pm.expect(jsonData).to.have.property("totalRevenue");',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/orders/stats/overview',
              host: ['{{baseUrl}}'],
              path: ['orders', 'stats', 'overview'],
            },
          },
        },
      ],
    },
    {
      name: '🏟️ Zone & Seat Tests',
      item: [
        {
          name: 'Get All Zones',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/zones',
              host: ['{{baseUrl}}'],
              path: ['zones'],
            },
          },
        },
        {
          name: 'Get All Seats',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/seats',
              host: ['{{baseUrl}}'],
              path: ['seats'],
            },
          },
        },
      ],
    },
    {
      name: '📊 Analytics Tests',
      item: [
        {
          name: 'Daily Sales Analytics',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/analytics/daily-sales',
              host: ['{{baseUrl}}'],
              path: ['analytics', 'daily-sales'],
            },
          },
        },
        {
          name: 'Revenue Analytics',
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  'pm.test("Status code is 200", function () {',
                  '    pm.response.to.have.status(200);',
                  '});',
                ],
              },
            },
          ],
          request: {
            method: 'GET',
            header: [{ key: 'Authorization', value: 'Bearer {{authToken}}' }],
            url: {
              raw: '{{baseUrl}}/analytics/revenue',
              host: ['{{baseUrl}}'],
              path: ['analytics', 'revenue'],
            },
          },
        },
      ],
    },
  ],
};

// Save collection to file
fs.writeFileSync(
  path.join(__dirname, 'api-collection.json'),
  JSON.stringify(apiCollection, null, 2),
);

console.log('✅ API test collection created successfully');

// Run the collection if this script is executed directly
if (require.main === module) {
  newman.run(
    {
      collection: apiCollection,
      environment: {
        name: 'Test Environment',
        values: [{ key: 'baseUrl', value: 'http://localhost:3000/api/v1' }],
      },
      reporters: ['cli', 'json'],
      reporter: {
        json: {
          export: path.join(__dirname, 'newman-results.json'),
        },
      },
    },
    function (err) {
      if (err) {
        console.error('❌ Newman run failed:', err);
        process.exit(1);
      }
      console.log('✅ API tests completed successfully');
    },
  );
}
