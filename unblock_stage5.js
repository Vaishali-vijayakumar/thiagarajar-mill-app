const { db, run } = require('./server/db');

const unblockStage5 = async () => {
    try {
        console.log("Unblocking Stage 5 for Contract 1...");
        await run("DELETE FROM stage5_chairman_decision WHERE contract_id = 1");
        console.log("Stage 5 Decision DELETED. Buttons should appear.");
    } catch (e) {
        console.error("Error:", e);
    }
};

unblockStage5();
