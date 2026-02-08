/**
 * HyperVerge KYC Integration - Frontend Component
 * 
 * This React component integrates the HyperVerge Web SDK for KYC verification.
 * 
 * Integration Flow:
 * 1. User clicks "HyperKYC" button
 * 2. Generate unique transactionId for this session
 * 3. Fetch auth token from backend with transactionId
 * 4. Initialize HyperKycConfig with the token (Option 2: token contains workflowId and transactionId)
 * 5. Launch SDK with workflow inputs
 * 6. User completes verification steps (document upload, selfie, etc.)
 * 7. SDK closes and triggers callback
 * 8. Fetch verification results from backend
 * 9. Display results on screen
 * 
 * BUGS FIXED:
 * 1. SDK script URL: Removed angle brackets from version (@<9.18.0> → @10.0.0)
 * 2. Token/TransactionId sync: Now fetches fresh token on each button click
 * 3. Missing workflow input: Added required MANUALNAME input
 * 4. TransactionId mismatch: Uses same transactionId for token generation and results fetch
 */

import './App.css';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Workflow inputs - these are passed to the SDK based on workflow configuration
// BUG FIX: Was empty {}, causing SDK to close immediately
// Each workflow defines required inputs in HyperVerge dashboard
const inputs = { MANUALNAME: "Rohan Baiju" }; 

function App() {
  // State to store verification results after workflow completion
  const [resultData, setResultData] = useState(null);

  /**
   * Handler for HyperKYC button click
   * 
   * BUG FIX: Previously, token was fetched once on page load with an initial transactionId.
   * This caused a mismatch - SDK ran with old token, but results were fetched for new transactionId.
   * 
   * SOLUTION: Now generates fresh transactionId and token on EACH button click,
   * ensuring token, SDK session, and results fetch all use the SAME transactionId.
   */
  const handleHyperKYCClick = async () => {
    // Generate new transaction ID for this session
    const newTransactionId = uuidv4();

    try {
      // Step 1: Fetch authentication token from backend
      // Backend generates JWT token containing transactionId and workflowId
      const response = await fetch('http://localhost:3000/getAccessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: newTransactionId })
      });
      const data = await response.json();
      const authToken = data.result.authToken;
      console.log('Access token generated for transactionId:', newTransactionId);

      // Step 2: Initialize HyperKycConfig with the token
      // Using Option 2: Token already contains workflowId and transactionId in JWT payload
      // Parameters: (authToken, showLandingPage)
      // - authToken: JWT from backend
      // - showLandingPage: false = skip intro page, true = show workflow overview
      const hyperKycConfig = new window.HyperKycConfig(authToken, false);
      
      // Step 3: Set workflow inputs (required by workflow configuration)
      hyperKycConfig.setInputs(inputs);

      // Step 4: Define callback handler for when SDK closes
      // This is called after user completes/cancels workflow
      const sdkCloseHandler = async () => {
        console.log('SDK closed, fetching results from backend...');
        try {
          // Fetch verification results from backend
          // BUG FIX: Now uses newTransactionId (matches the token's transactionId)
          const res = await fetch('http://localhost:3000/getResults', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: newTransactionId })
          });
          const fetchedResult = await res.json();
          console.log('Fetched verification results:', fetchedResult);

          // Display results in UI
          setResultData(fetchedResult);
        } catch (err) {
          console.error('Error fetching results:', err);
        }
      };

      // Step 5: Launch the HyperKYC SDK
      // This opens the verification modal where user completes KYC steps
      await window.HyperKYCModule.launch(hyperKycConfig, sdkCloseHandler);
    } catch (err) {
      console.error('Error in handleHyperKYCClick:', err);
    }
  };

  return (
    <div className="App" style={styles.container}>
      <button style={styles.button} onClick={handleHyperKYCClick}>
        HyperKYC
      </button>

      {resultData && (
        <div style={styles.resultContainer}>
          <h3>SDK Result:</h3>
          <pre>{JSON.stringify(resultData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px'
  },
  button: {
    padding: '15px 40px',
    fontSize: '18px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
    fontWeight: '600',
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
  },
  resultContainer: {
    marginTop: '20px',
    padding: '15px',
    border: '1px solid #ccc',
    borderRadius: '10px',
    width: '80%',
    maxHeight: '50vh',
    overflowY: 'auto',
  }
};

export default App;
