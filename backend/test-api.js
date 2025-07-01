const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const BASE_URL = 'http://localhost:4000';

async function testAPI() {
  console.log('🧪 Testing Backend API...\n');

  try {
    // Test 1: Root endpoint
    console.log('1. Testing root endpoint...');
    const rootResponse = await fetch(`${BASE_URL}/`);
    const rootData = await rootResponse.text();
    console.log('✅ Root endpoint:', rootData);
    console.log('');

    // Test 2: Test database connection
    console.log('2. Testing database connection...');
    const dbResponse = await fetch(`${BASE_URL}/api/test-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company_id: 'company1' })
    });
    
    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log('✅ Database connection:', dbData);
    } else {
      const errorData = await dbResponse.json();
      console.log('❌ Database connection failed:', errorData);
    }
    console.log('');

    // Test 3: Initialize database
    console.log('3. Testing database initialization...');
    const initResponse = await fetch(`${BASE_URL}/api/init-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company_id: 'company1' })
    });
    
    if (initResponse.ok) {
      const initData = await initResponse.json();
      console.log('✅ Database initialization:', initData);
    } else {
      const errorData = await initResponse.json();
      console.log('❌ Database initialization failed:', errorData);
    }
    console.log('');

    // Test 4: Test products endpoint
    console.log('4. Testing products endpoint...');
    const productsResponse = await fetch(`${BASE_URL}/api/products`, {
      headers: {
        'company_id': 'company1'
      }
    });
    
    if (productsResponse.ok) {
      const productsData = await productsResponse.json();
      console.log('✅ Products endpoint:', productsData);
    } else {
      const errorData = await productsResponse.json();
      console.log('❌ Products endpoint failed:', errorData);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI(); 