const verify = async () => {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'manager', password: 'password' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Login successful.");

        // 2. Fetch Contracts
        const contractsRes = await fetch('http://localhost:3000/api/contracts', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const contractsData = await contractsRes.json();
        if (contractsData.length === 0) { console.log("No contracts found to test."); return; }
        const contractId = contractsData[0].contract_id;

        // 3. Submit Stage 3 Data with Formatting
        // Frontend sends: sequence_start: "1/25-26", sequence_end: "10/25-26" if date is Oct 2025
        const stage3Data = {
            sequence_start: "1/25-26",
            sequence_end: "10/25-26",
            arrival_date: "2025-10-18",
            lot_number: "LOT-ABC-123"
        };

        await fetch(`http://localhost:3000/api/contracts/${contractId}/stage3`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(stage3Data)
        });
        console.log("Stage 3 Data Submitted.");

        // 4. Verify Fetch
        const fetchRes = await fetch(`http://localhost:3000/api/contracts/${contractId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const fetchData = await fetchRes.json();
        const s3 = fetchData.stage3_4;

        if (s3.lot_number === "LOT-ABC-123" && s3.sequence_start === "1/25-26") {
            console.log("Verification Passed! Data match.");
        } else {
            console.error("Verification Failed:", s3);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
};

verify();
