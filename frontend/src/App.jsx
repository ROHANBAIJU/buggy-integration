import './App.css';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const inputs = {}; // Set your inputs here
var hyperKycConfig;

function App() {
  const [jwtToken, setJwtToken] = useState(null);
  const [transactionId, setTransactionId] = useState(uuidv4());
  const [resultData, setResultData] = useState(null); // <-- New state to store result

  // Fetch token when app loads
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch('http://localhost:3000/getAccessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId })
        });
        const data = await response.json();
        setJwtToken(data.result.authToken);
        hyperKycConfig = new window.HyperKycConfig(data.authToken, false);
      } catch (err) {
        console.error('Error fetching auth token:', err);
      }
    };

    fetchToken();
  }, []);

  const handleHyperKYCClick = async () => {
    if (!jwtToken) {
      console.warn('JWT token not ready yet.');
      return;
    }

    const newTransactionId = uuidv4();
    setTransactionId(newTransactionId);

    // Set inputs for SDK
    hyperKycConfig.setInputs(inputs);

    // Handler to know when SDK closes
    const sdkCloseHandler = async () => {
      console.log('SDK closed, fetching results from backend...');
      try {
        const res = await fetch('http://localhost:3000/getResults', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId })
        });
        const fetchedResult = await res.json();
        console.log('Fetched result from backend:', fetchedResult);

        // Update state to display on screen
        setResultData(fetchedResult);
      } catch (err) {
        console.error('Error fetching results:', err);
      }
    };

    // Launch SDK (handler only logs status, but actual result fetched from backend)
    await window.HyperKYCModule.launch(hyperKycConfig, sdkCloseHandler);
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
