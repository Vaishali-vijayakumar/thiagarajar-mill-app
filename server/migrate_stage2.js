const { db, run } = require('./db');

const migrate = async () => {
    try {
        console.log("Migrating Stage 2 Table...");

        const columns = [
            'uhml FLOAT(53)', 'ui FLOAT(53)', 'strength FLOAT(53)', 'elongation FLOAT(53)',
            'mic FLOAT(53)', 'rd FLOAT(53)', 'plus_b FLOAT(53)', 'gpt FLOAT(53)',
            'sfi FLOAT(53)', 'mat FLOAT(53)', 'sci FLOAT(53)', 'trash FLOAT(53)',
            'moisture FLOAT(53)', 'neps FLOAT(53)', 'stability FLOAT(53)'
        ];

        for (const col of columns) {
            try {
                const colName = col.split(' ')[0];
                await run(`ALTER TABLE stage2_manager_report ADD COLUMN ${col}`);
                console.log(`Added ${colName} column.`);
            } catch (e) {
                if (e.message.includes('duplicate column name')) console.log(`${col.split(' ')[0]} column already exists.`);
                else console.error(`Error adding ${col.split(' ')[0]}:`, e.message);
            }
        }

        console.log("Migration completed.");

    } catch (err) {
        console.error("Migration Failed:", err);
    }
};

migrate();
