// Debug script to identify rendering issues
console.log('=== DEBUG: App Initialization ===');
console.log('Environment:', import.meta.env.MODE);
console.log('API URL:', import.meta.env.VITE_API_URL);

// Test basic rendering
try {
  const testDiv = document.createElement('div');
  testDiv.innerHTML = 'Debug test - if you see this, React is working';
  document.body.appendChild(testDiv);
  
  setTimeout(() => {
    document.body.removeChild(testDiv);
    console.log('=== DEBUG: Basic DOM manipulation works ===');
  }, 2000);
} catch (error) {
  console.error('=== DEBUG: DOM Error:', error);
}

// Test API connectivity
const testAPI = async () => {
  try {
    const response = await fetch('/api/giveaways');
    const data = await response.json();
    console.log('=== DEBUG: API Response:', data);
  } catch (error) {
    console.error('=== DEBUG: API Error:', error);
  }
};

// Call the async function
testAPI();
