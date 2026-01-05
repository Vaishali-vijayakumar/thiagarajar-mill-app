const testVendor = async () => {
    try {
        console.log("Logging in as manager...");
        const loginRes = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'manager', password: 'password' })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log("Login successful. Token obtained.");

        const vendorData = {
            vendor_name: "Verification Vendor 3",
            gst_number: "GSTVERIFY789",
            state: "Verify State 2",
            email: "verify@example.com",
            phone_number: "9998887776",
            address: "123 Verification Lane",
            is_privileged: true
        };

        console.log("Creating vendor...");
        const createRes = await fetch('http://localhost:3000/api/vendors', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(vendorData)
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            throw new Error(`Creation failed: ${err}`);
        }
        console.log("Vendor created successfully.");

        console.log("Fetching vendors to verify...");
        const listRes = await fetch('http://localhost:3000/api/vendors', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const vendors = await listRes.json();

        const createdVendor = vendors.find(v => v.gst_number === "GSTVERIFY789");
        if (createdVendor) {
            console.log("Verification Passed! Vendor found:", createdVendor);
            console.log("Email:", createdVendor.email);
            console.log("Phone:", createdVendor.phone_number);
            console.log("Address:", createdVendor.address);
        } else {
            console.error("Verification Failed! Vendor not found in list.");
        }

    } catch (e) {
        console.error("Verification Error:", e);
    }
};

testVendor();
