const { db, run } = require('./server/db');

const forceMigrate = async () => {
    try {
        console.log("Attempting to add column trash_percent_samples...");
        await run("ALTER TABLE stage3_4_cts_samples ADD COLUMN trash_percent_samples TEXT");
        console.log("SUCCESS: Column added.");
    } catch (e) {
        if (e.message.includes("duplicate column name")) {
            console.log("INFO: Column already exists.");
        } else {
            console.error("ERROR:", e.message);
        }
    }
};

forceMigrate();
