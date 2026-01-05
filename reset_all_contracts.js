const { db, run } = require('./server/db');

const resetAll = async () => {
    try {
        console.log("WARNING: Deleting ALL Contract Data...");

        await run("DELETE FROM stage_history");
        await run("DELETE FROM stage5_chairman_decision");
        await run("DELETE FROM stage5_payment_requisition");
        await run("DELETE FROM stage4_chairman_decision");
        await run("DELETE FROM stage3_4_cts_samples");
        await run("DELETE FROM stage2_chairman_decision");
        await run("DELETE FROM stage2_manager_report");
        await run("DELETE FROM contracts");

        // Optional: Reset Vendors if 'all' implies truly everything? 
        // Usually testers want to keep vendors. I'll keep them.

        // Reset Auto Increment for contracts if possible (sqlite_sequence)
        try {
            await run("DELETE FROM sqlite_sequence WHERE name='contracts'");
        } catch (e) { console.log("Could not reset sequence (minor)."); }

        console.log("SUCCESS: All contract data cleared. You have a fresh start.");
        console.log("(Users and Vendors were preserved).");

    } catch (e) {
        console.error("Error:", e);
    }
};

resetAll();
