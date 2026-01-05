const { db, run } = require('./db');

const migrate = async () => {
    try {
        console.log("Migrating Stage 3 Table...");
        // 1. Rename old table
        await run("ALTER TABLE stage3_4_cts_samples RENAME TO stage3_4_cts_samples_old");

        // 2. Create new table
        await run(`CREATE TABLE IF NOT EXISTS stage3_4_cts_samples (
            sample_id INTEGER PRIMARY KEY AUTOINCREMENT,
            contract_id INTEGER,
            sequence_start TEXT,
            sequence_end TEXT,
            lot_number TEXT,
            mic_value DECIMAL(4, 2),
            strength DECIMAL(5, 2),
            uhml DECIMAL(5, 2),
            ui_percent DECIMAL(5, 2),
            sfi DECIMAL(5, 2),
            elongation DECIMAL(4, 2),
            rd DECIMAL(5, 2),
            plus_b DECIMAL(5, 2),
            colour_grade TEXT,
            mat DECIMAL(4, 2),
            sci INTEGER,
            trash_percent DECIMAL(4, 2),
            moisture_percent DECIMAL(4, 2),
            arrival_date DATE,
            test_date DATE,
            tested_by TEXT,
            confirmation_date DATE,
            remarks TEXT,
            trash_percent_samples TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            report_document_path TEXT
        )`);

        // 3. Migrate Data (Cast integers to string if needed, mostly SQLite handles it)
        // Note: Old table had 'lot_number' at end, new table has it earlier over sequence fields? No, new table has 'lot_number' added.
        // Wait, old schema in init_db had 'lot_number' at the bottom? The viewed file showed it.
        // Let's migrate common columns.

        await run(`INSERT INTO stage3_4_cts_samples (
            contract_id, sequence_start, sequence_end, mic_value, strength, uhml, ui_percent, sfi, elongation, rd, plus_b, colour_grade, mat, sci, trash_percent, moisture_percent, arrival_date, test_date, tested_by, confirmation_date, remarks, trash_percent_samples, created_at, report_document_path, lot_number
        ) SELECT 
            contract_id, CAST(sequence_start AS TEXT), CAST(sequence_end AS TEXT), mic_value, strength, uhml, ui_percent, sfi, elongation, rd, plus_b, colour_grade, mat, sci, trash_percent, moisture_percent, arrival_date, test_date, tested_by, confirmation_date, remarks, trash_percent_samples, created_at, report_document_path, lot_number
        FROM stage3_4_cts_samples_old`);

        // 4. Drop old table
        await run("DROP TABLE stage3_4_cts_samples_old");

        console.log("Migration completed.");

    } catch (err) {
        console.error("Migration Failed:", err);
    }
};

migrate();
