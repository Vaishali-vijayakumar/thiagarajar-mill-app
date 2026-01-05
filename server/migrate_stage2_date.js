const { db, run } = require('./db');

const migrate = async () => {
    try {
        console.log("Migrating Stage 2 Table (Adding Date)...");
        try {
            await run("ALTER TABLE stage2_manager_report ADD COLUMN report_date DATE");
            console.log("Added report_date column.");
        } catch (e) {
            if (e.message.includes('duplicate column name')) console.log("report_date column already exists.");
            else console.error("Error adding report_date:", e.message);
        }
        console.log("Migration completed.");
    } catch (err) {
        console.error("Migration Failed:", err);
    }
};

migrate();
