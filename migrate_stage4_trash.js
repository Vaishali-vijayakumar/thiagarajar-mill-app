const { db, run, query } = require('./server/db');

const checkAndMigrate = async () => {
    try {
        console.log("Checking schema for stage3_4_cts_samples...");
        const columns = await query("PRAGMA table_info(stage3_4_cts_samples)");
        const colNames = columns.map(c => c.name);
        console.log("Columns:", colNames);

        if (!colNames.includes('trash_percent_samples')) {
            console.log("Column trash_percent_samples is MISSING. Adding it...");
            await run("ALTER TABLE stage3_4_cts_samples ADD COLUMN trash_percent_samples TEXT");
            console.log("Column added.");
        } else {
            console.log("Column trash_percent_samples ALREADY EXISTS.");
        }

        if (colNames.includes('tested_by')) {
            console.log("Column tested_by EXISTS (should optionally be unused).");
            // We can't DROP COLUMN easily in SQLite without recreation, but we can ignore it.
        }

    } catch (e) {
        console.error("Error:", e);
    }
};

checkAndMigrate();
