/**
 * HyperVerge KYC Integration - Backend Server
 * 
 * This Express server acts as a secure intermediary between the frontend client
 * and HyperVerge's KYC APIs. It handles:
 * 1. Generating authentication tokens for SDK initialization
 * 2. Fetching verification results after workflow completion
 * 
 * Security: appId and appKey are kept secure on the backend and never exposed to frontend
 */

const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables from .env file
// BUG FIX: Removed quotes from .env values (they were causing parsing issues)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(bodyParser.json()); // Parse JSON request bodies
app.use(cors()); // Enable CORS for frontend communication

// Load HyperVerge credentials from environment variables
const HYPERVERGE_APP_ID = process.env.HYPERVERGE_APP_ID;
const HYPERVERGE_APP_KEY = process.env.HYPERVERGE_APP_KEY;
const WORKFLOW_ID = process.env.WORKFLOW_ID;

// Debug: Verify environment variables are loaded correctly
console.log('Environment Variables:');
console.log('HYPERVERGE_APP_ID:', HYPERVERGE_APP_ID);
console.log('HYPERVERGE_APP_KEY:', HYPERVERGE_APP_KEY ? '***' + HYPERVERGE_APP_KEY.slice(-4) : 'undefined');
console.log('WORKFLOW_ID:', WORKFLOW_ID);

/**
 * Endpoint: POST /getAccessToken
 * 
 * Purpose: Generate a short-lived authentication token for SDK initialization
 * 
 * Flow:
 * 1. Frontend sends a unique transactionId
 * 2. Backend calls HyperVerge's auth/token API with secure credentials
 * 3. Returns JWT token containing transactionId and workflowId
 * 4. Frontend uses this token to initialize the HyperKYC SDK
 * 
 * Security: This endpoint keeps appId and appKey secure on backend
 * 
 * Request Body: { transactionId: string }
 * Response: { status, result: { authToken }, workflowId }
 */
app.post('/getAccessToken', async (req, res) => {
    try {
        // Prepare payload for HyperVerge auth API
        const payload = {
            appId: HYPERVERGE_APP_ID,
            appKey: HYPERVERGE_APP_KEY,
            expiry: 1200, // Token valid for 20 minutes (1200 seconds)
            transactionId: req.body.transactionId, // Unique ID for this verification session
            workflowId: WORKFLOW_ID // Workflow configuration to execute
        };

        // Call HyperVerge's token generation API
        const response = await fetch('https://ind-state.idv.hyperverge.co/v2/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        console.log('Generated Auth Token for transactionId:', req.body.transactionId);
        
        // Return token to frontend (workflowId added for reference)
        res.json({ ...data, workflowId: WORKFLOW_ID });
    } catch (err) {
        console.error('Error generating access token:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * Endpoint: POST /getResults
 * 
 * Purpose: Fetch verification results after workflow completion
 * 
 * BUGS FIXED:
 * 1. Changed method from GET to POST (HyperVerge outputs API requires POST)
 * 2. Added workflowId to request body (was missing, causing 404 errors)
 * 3. Changed from query parameters to request body (correct API format)
 * 4. Fixed header names: appId and appKey (were lowercase: appid, appkey)
 * 
 * Flow:
 * 1. Frontend completes verification workflow
 * 2. Frontend sends transactionId to this endpoint
 * 3. Backend fetches results from HyperVerge outputs API
 * 4. Returns verification results (documents, face match, status, etc.)
 * 
 * Note: For production, use HyperVerge's webhook instead of polling
 * to avoid potential man-in-the-middle attacks
 * 
 * Request Body: { transactionId: string }
 * Response: { status, result: { verification data } }
 */
app.post('/getResults', async (req, res) => {
    try {
        const transactionId = req.body.transactionId;

        // Prepare payload for HyperVerge outputs API
        // MUST include both transactionId AND workflowId
        const payload = {
            transactionId: transactionId,
            workflowId: WORKFLOW_ID // BUG FIX: This was missing!
        };

        // Call HyperVerge outputs API
        // BUG FIX: Changed from GET to POST method
        const response = await fetch('https://ind.idv.hyperverge.co/v1/output', {
            method: 'POST', // BUG FIX: Was GET, should be POST
            headers: {
                'Content-Type': 'application/json',
                'appId': HYPERVERGE_APP_ID, // BUG FIX: Was lowercase 'appid'
                'appKey': HYPERVERGE_APP_KEY, // BUG FIX: Was lowercase 'appkey'
            },
            body: JSON.stringify(payload), // BUG FIX: Was using query params instead of body
        });

        const data = await response.json();
        console.log('Fetched results for transactionId:', transactionId);
        res.json(data);
    } catch (err) {
        console.error('Error fetching results:', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
