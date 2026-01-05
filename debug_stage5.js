const { db, get } = require('./server/db');

const checkStage5 = async () => {
    try {
        console.log("Checking Stage 5 status for Contract 1...");
        const decision = await get("SELECT * FROM stage5_chairman_decision WHERE contract_id = 1");
        console.log("Stage 5 Decision:", decision);

        const payment = await get("SELECT * FROM stage5_payment_requisition WHERE contract_id = 1");
        console.log("Stage 5 Payment:", payment ? "Exists" : "Missing");

    } catch (e) {
        console.error("Error:", e);
    }
};

checkStage5();
