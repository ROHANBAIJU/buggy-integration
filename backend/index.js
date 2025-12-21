// index.js
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config(); // Load env variables

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

const HYPERVERGE_APP_ID = process.env.HYPERVERGE_APP_ID;
const HYPERVERGE_APP_KEY = process.env.HYPERVERGE_APP_KEY;
const WORKFLOW_ID = process.env.WORKFLOW_ID;

// -------------------- /getAuthToken --------------------
app.post('/getAccessToken', async (req, res) => {
    try {
        const payload = {
            appId: HYPERVERGE_APP_ID,
            appKey: HYPERVERGE_APP_KEY,
            expiry:  12,
            transactionId: req.body.transactionId,
            workflowId: WORKFLOW_ID
        };

        const response = await fetch('https://ind-state.idv.hyperverge.co/v2/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// -------------------- /getResults --------------------
app.post('/getResults', async (req, res) => {
    try {
        const payload = {
            transactionid: req.body.transactionid
        };

        const response = await fetch('https://ind.idv.hyperverge.co/v1/output', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'appid': HYPERVERGE_APP_ID,
                'appkey': HYPERVERGE_APP_KEY,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
