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

        // 3. Submit Stage 4 Data (With Trash Samples)
        // Assume sequences 1 to 2
        const trashSamples = { "1": 3.5, "2": 4.5 };
        const stage4Data = {
            mic_value: 4.2,
            strength: 29.5,
            trash_percent: 4.0, // Avg of 3.5 and 4.5
            trash_percent_samples: JSON.stringify(trashSamples),
            report_document_path: "cts_report.pdf"
        };

        const res = await fetch(`http://localhost:3000/api/contracts/${contractId}/stage4`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(stage4Data)
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Stage 4 POST Failed:", res.status, errText);
            return;
        }
        console.log("Stage 4 Data Submitted.");

        // 4. Verify Fetch
        const fetchRes = await fetch(`http://localhost:3000/api/contracts/${contractId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const fetchData = await fetchRes.json();
        const s4 = fetchData.stage3_4;

        console.log("Fetched Stage 4 Data:", JSON.stringify(s4, null, 2));

        if (s4.trash_percent == 4 && s4.trash_percent_samples && s4.trash_percent_samples.includes('"1":3.5')) {
            console.log("Verification Passed! Data match.");
        } else {
            console.error("Verification Failed. Trash Samples:", s4.trash_percent_samples);
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
};

verify();
