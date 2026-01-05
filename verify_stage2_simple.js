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

        // 3. Submit Stage 2 Data (Simplified Payload)
        const stage2Data = {
            variety: "Test Variety",
            price: 55000,
            report_date: "2025-10-18",
            report_document_path: "doc/path",
            uhml: 30.16,
            ui: 84.1,
            strength: 31.46,
            elongation: 6.8,
            mic: 3.67,
            rd: 76.4,
            plus_b: 8.3,
            remarks: "Verified Averages"
        };

        await fetch(`http://localhost:3000/api/contracts/${contractId}/stage2`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(stage2Data)
        });
        console.log("Stage 2 Data Submitted.");

        // 4. Verify Fetch
        const fetchRes = await fetch(`http://localhost:3000/api/contracts/${contractId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const fetchData = await fetchRes.json();
        const s2 = fetchData.stage2;

        if (s2.report_date === "2025-10-18" && s2.uhml === 30.16) {
            console.log("Verification Passed! Data match.");
        } else {
            console.error("Verification Failed:", s2);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
};

verify();
