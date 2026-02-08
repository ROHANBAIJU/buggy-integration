# HyperVerge KYC Integration - Debugging Report

## Assignment Completion Summary

**Student**: Rohan Baiju  
**Date**: February 6, 2026  
**Assignment**: Buggy SDK Integration and Debugging

---

## Project Overview

This project implements a complete end-to-end HyperVerge KYC verification system with:
- **Backend**: Express.js server handling secure API communication
- **Frontend**: React application with HyperVerge Web SDK v10.0.0
- **Integration**: Token-based authentication and results retrieval

---

## 5 Major Bugs Identified and Fixed

### Bug #1: Invalid SDK Script URL ❌ → ✅

**Location**: `frontend/index.html:12`

**Original Code**:
```html
<script src="https://hv-web-sdk-cdn.hyperverge.co/hyperverge-web-sdk@<9.18.0>/src/sdk.min.js"></script>
```

**Issue**: 
- Angle brackets `<>` in version number created invalid URL
- Browser returned 403 Forbidden error
- SDK script failed to load, causing `window.HyperKycConfig is not a constructor` error

**Fix**:
```html
<script src="https://hv-web-sdk-cdn.hyperverge.co/hyperverge-web-sdk@10.0.0/src/sdk.min.js"></script>
```

**Impact**: SDK now loads successfully, making HyperKycConfig available globally

---

### Bug #2: Wrong HTTP Method for Outputs API ❌ → ✅

**Location**: `backend/index.js:57`

**Original Code**:
```javascript
const response = await fetch(`https://ind.idv.hyperverge.co/v1/output?transactionId=${transactionId}`, {
    method: 'GET',
    // ...
});
```

**Issue**:
- HyperVerge outputs API requires POST method, not GET
- GET requests cannot have request body in HTTP spec
- API returned errors due to wrong method

**Fix**:
```javascript
const response = await fetch('https://ind.idv.hyperverge.co/v1/output', {
    method: 'POST',
    body: JSON.stringify(payload),
    // ...
});
```

**Impact**: Results API now works correctly, returning verification data

---

### Bug #3: Missing workflowId in Outputs API Call ❌ → ✅

**Location**: `backend/index.js:55-58`

**Original Code**:
```javascript
// Only sending transactionId via query parameter
const response = await fetch(`https://ind.idv.hyperverge.co/v1/output?transactionId=${transactionId}`, {
    method: 'GET',
    // No workflowId provided
});
```

**Issue**:
- HyperVerge outputs API requires BOTH `transactionId` AND `workflowId` in request body
- Without workflowId, API returned 404 Not Found error
- Results could not be retrieved

**Fix**:
```javascript
const payload = {
    transactionId: transactionId,
    workflowId: WORKFLOW_ID  // Added missing parameter
};

const response = await fetch('https://ind.idv.hyperverge.co/v1/output', {
    method: 'POST',
    body: JSON.stringify(payload),
    // ...
});
```

**Impact**: Backend successfully retrieves verification results with both required parameters

---

### Bug #4: Token/TransactionId Mismatch ❌ → ✅

**Location**: `frontend/src/App.jsx:14-31`

**Original Code**:
```javascript
// Token fetched ONCE on page load
useEffect(() => {
    const fetchToken = async () => {
        const response = await fetch('http://localhost:3000/getAccessToken', {
            body: JSON.stringify({ transactionId: initialId })
        });
        // Token contains initialId
        hyperKycConfig = new window.HyperKycConfig(data.result.authToken, false);
    };
    fetchToken();
}, []);

const handleHyperKYCClick = async () => {
    const newTransactionId = uuidv4(); // Creates NEW id
    // But uses OLD token with OLD transactionId!
    await window.HyperKYCModule.launch(hyperKycConfig, callback);
};
```

**Issue**:
- Token generated once on page load with initial transactionId
- Each button click created NEW transactionId but reused OLD token
- SDK ran with old transactionId, results fetched for new transactionId
- Mismatch caused 404 Not Found errors

**Fix**:
```javascript
// Remove initial token fetch, generate fresh token on each click
const handleHyperKYCClick = async () => {
    const newTransactionId = uuidv4();
    
    // Fetch fresh token with NEW transactionId
    const response = await fetch('http://localhost:3000/getAccessToken', {
        body: JSON.stringify({ transactionId: newTransactionId })
    });
    
    // Initialize SDK with fresh token
    const hyperKycConfig = new window.HyperKycConfig(authToken, false);
    
    // Fetch results using SAME transactionId
    // Inside callback: fetch with newTransactionId
};
```

**Impact**: Token, SDK session, and results fetch all use synchronized transactionId

---

### Bug #5: Missing Required Workflow Input ❌ → ✅

**Location**: `frontend/src/App.jsx:5`

**Original Code**:
```javascript
const inputs = {}; // Empty object
```

**Issue**:
- Workflow configured in HyperVerge dashboard requires `MANUALNAME` input
- SDK received empty inputs object
- Workflow immediately closed due to missing required field
- No verification steps displayed to user

**Fix**:
```javascript
const inputs = { MANUALNAME: "Rohan Baiju" };
```

**Impact**: SDK now launches successfully with required inputs, workflow completes properly

---

## Technical Architecture

### Backend (Express.js)

**File**: `backend/index.js`

**Endpoints**:

1. **POST /getAccessToken**
   - Generates JWT authentication token
   - Embeds transactionId and workflowId
   - Keeps appId and appKey secure on backend

2. **POST /getResults**
   - Fetches verification results from HyperVerge
   - Requires transactionId and workflowId
   - Returns complete verification data

**Environment Variables** (`.env`):
```
HYPERVERGE_APP_ID=c52h5j
HYPERVERGE_APP_KEY=HV:q7aqkdhe5b39vfmeg
WORKFLOW_ID=rb_sureguard_insurance
```

### Frontend (React + Vite)

**File**: `frontend/src/App.jsx`

**Integration Flow**:
1. User clicks "HyperKYC" button
2. Generate unique transactionId (UUID v4)
3. Fetch auth token from backend
4. Initialize HyperKycConfig (Option 2)
5. Set workflow inputs
6. Launch SDK
7. User completes verification
8. Fetch and display results

**SDK Configuration**: Option 2 (Token contains workflowId and transactionId)

---

## Debugging Methodology

### Step 1: Initial Analysis
- Reviewed assignment requirements
- Examined error messages in browser console
- Checked network tab for failed requests

### Step 2: SDK Loading Issues
- Identified 403 Forbidden error on SDK script
- Found angle brackets in version number
- Fixed URL to use proper version format

### Step 3: Environment Variables
- Backend showed "(0) env variables injected"
- Found quotes in .env file causing parsing issues
- Removed quotes, verified variables loaded correctly

### Step 4: SDK Initialization
- SDK opened and closed immediately
- Identified missing workflow inputs
- Added required MANUALNAME parameter

### Step 5: Results API Investigation
- Tested outputs API in Postman
- Discovered method should be POST, not GET
- Identified missing workflowId parameter
- Fixed API implementation to match documentation

### Step 6: TransactionId Synchronization
- Analyzed token generation flow
- Found mismatch between token and results request
- Refactored to generate fresh token per session

---

## Testing Results

✅ SDK script loads successfully (v10.0.0)  
✅ Backend generates valid auth tokens  
✅ SDK launches with correct configuration  
✅ Workflow inputs accepted by SDK  
✅ Verification process completes  
✅ Results API returns verification data  
✅ Frontend displays results correctly  

---

## Key Learnings

1. **HTTP Methods Matter**: GET vs POST has strict requirements in HTTP spec
2. **API Documentation**: Always verify against official docs, not assumptions
3. **Token Lifecycle**: Auth tokens must match the session they're used for
4. **Environment Variables**: Format matters - quotes can break parsing
5. **Workflow Configuration**: SDK inputs must match dashboard configuration
6. **Debugging Flow**: Network tab + Console logs reveal most integration issues

---

## Production Recommendations

1. **Use Webhooks**: Implement HyperVerge webhook for results instead of polling
2. **Error Handling**: Add comprehensive error handling and retry logic
3. **CSP Configuration**: Whitelist `*.edge.hyperverge.co` for v10.0.0
4. **Input Validation**: Validate workflow inputs before SDK launch
5. **Token Expiry**: Handle token expiration gracefully
6. **Logging**: Implement structured logging for debugging

---

## Files Modified

- `backend/index.js` - Fixed outputs API implementation
- `backend/.env` - Removed quotes from environment variables
- `frontend/src/App.jsx` - Fixed token flow and workflow inputs
- `frontend/index.html` - Fixed SDK script URL

---

## Conclusion

Successfully debugged and fixed all 5 major bugs in the HyperVerge KYC integration. The application now:
- Loads SDK correctly
- Generates valid authentication tokens
- Launches verification workflow with proper inputs
- Retrieves results using correct API format
- Maintains proper transactionId synchronization throughout the flow

All functionality tested and working as expected.
