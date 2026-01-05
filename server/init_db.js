const { run, pool } = require('./db');
const bcrypt = require('bcryptjs');

const initDb = async () => {

    // Postgres SQL Schema
    const schema = `
    CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        full_name VARCHAR(255),
        email VARCHAR(255),
        role VARCHAR(50),
        department VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        password VARCHAR(255)
    );

    CREATE TABLE IF NOT EXISTS vendors (
        vendor_id SERIAL PRIMARY KEY,
        vendor_name VARCHAR(255),
        is_privileged BOOLEAN,
        vendor_type VARCHAR(50),
        gst_number VARCHAR(50),
        state VARCHAR(100),
        email VARCHAR(150),
        phone_number VARCHAR(20),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
        contract_id SERIAL PRIMARY KEY,
        vendor_id INTEGER,
        cotton_type VARCHAR(100),
        quality VARCHAR(100),
        quantity REAL,
        price REAL,
        document_path TEXT,
        entry_date DATE,
        entered_by INTEGER,
        
        -- Quality Params (Stage 2/4)
        uhml REAL,
        ui REAL,
        strength REAL,
        elongation REAL,
        mic REAL,
        rd REAL,
        plus_b REAL,
        gpt REAL,
        sfi REAL,
        mat REAL,
        sci REAL,
        trash REAL,
        moisture REAL,
        neps REAL,
        stability REAL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        updated_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage1_chairman_decision (
        contract_id INTEGER PRIMARY KEY,
        decision VARCHAR(50),
        remarks TEXT,
        decision_date TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage2_manager_report (
        contract_id INTEGER PRIMARY KEY,
        variety VARCHAR(100),
        price REAL,
        report_date DATE,
        report_document_path TEXT,
        uploaded_at TIMESTAMP,
        uhml DOUBLE PRECISION,
        ui DOUBLE PRECISION,
        strength DOUBLE PRECISION,
        elongation DOUBLE PRECISION,
        mic DOUBLE PRECISION,
        rd DOUBLE PRECISION,
        plus_b DOUBLE PRECISION,
        gpt DOUBLE PRECISION,
        sfi DOUBLE PRECISION,
        mat DOUBLE PRECISION,
        sci DOUBLE PRECISION,
        trash DOUBLE PRECISION,
        moisture DOUBLE PRECISION,
        neps DOUBLE PRECISION,
        stability DOUBLE PRECISION,
        entered_by INTEGER,
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage2_chairman_decision (
        contract_id INTEGER PRIMARY KEY,
        decision VARCHAR(50),
        remarks TEXT,
        decided_by INTEGER,
        decision_date TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage3_4_cts_samples (
        sample_id SERIAL PRIMARY KEY,
        contract_id INTEGER,
        sequence_start VARCHAR(100),
        sequence_end VARCHAR(100),
        lot_number VARCHAR(100),
        mic_value DECIMAL(4, 2),
        strength DECIMAL(5, 2),
        uhml DECIMAL(5, 2),
        ui_percent DECIMAL(5, 2),
        sfi DECIMAL(5, 2),
        elongation DECIMAL(4, 2),
        rd DECIMAL(5, 2),
        plus_b DECIMAL(5, 2),
        colour_grade VARCHAR(50),
        mat DECIMAL(4, 2),
        sci INTEGER,
        trash_percent DECIMAL(4, 2),
        moisture_percent DECIMAL(4, 2),
        arrival_date DATE,
        test_date DATE,
        tested_by VARCHAR(100),
        confirmation_date DATE,
        remarks TEXT,
        trash_percent_samples TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        report_document_path TEXT
    );

    CREATE TABLE IF NOT EXISTS stage4_chairman_decision (
        contract_id INTEGER PRIMARY KEY,
        decision VARCHAR(50),
        remarks TEXT,
        decided_by INTEGER,
        decision_date TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage5_chairman_decision (
        contract_id INTEGER PRIMARY KEY,
        decision VARCHAR(50),
        is_modified BOOLEAN DEFAULT FALSE,
        remarks TEXT,
        decided_by INTEGER,
        decision_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage5_payment_requisition (
        payment_id SERIAL PRIMARY KEY,
        contract_id INTEGER,
        invoice_value DECIMAL(14,2) NOT NULL,
        tds_amount DECIMAL(14,2) DEFAULT 0,
        cash_discount DECIMAL(14,2) DEFAULT 0,
        net_amount_paid DECIMAL(14,2) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        branch VARCHAR(255) NOT NULL,
        account_no VARCHAR(100) NOT NULL,
        ifsc_code VARCHAR(50) NOT NULL,
        payment_mode VARCHAR(50) DEFAULT 'RTGS',
        rtgs_reference_no VARCHAR(100),
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage_history (
        history_id SERIAL PRIMARY KEY,
        contract_id INTEGER NOT NULL,
        stage_number INTEGER NULL,
        action VARCHAR(255) NULL,
        performed_by INTEGER NULL,
        remarks TEXT NULL,
        action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- View creation often cleaner if dropped first in dev environments or create or replace
    CREATE OR REPLACE VIEW vw_stage5_payment_details AS
    SELECT
        c.contract_id,
        v.vendor_name AS party_name,
        c.cotton_type,
        s2.variety,
        c.price AS contract_rate,
        c.quantity,
        s3.sequence_start AS lot_no,
        s3.arrival_date,
        p.invoice_value,
        p.tds_amount,
        p.cash_discount,
        p.net_amount_paid,
        p.bank_name,
        p.branch,
        p.account_no,
        p.ifsc_code,
        p.payment_mode,
        p.rtgs_reference_no,
        p.created_at
    FROM contracts c
    JOIN vendors v ON v.vendor_id = c.vendor_id
    LEFT JOIN stage2_manager_report s2 ON s2.contract_id = c.contract_id
    LEFT JOIN stage3_4_cts_samples s3 ON s3.contract_id = c.contract_id
    LEFT JOIN stage5_payment_requisition p ON p.contract_id = c.contract_id;
    `;

    try {
        console.log("Initializing Database...");

        // Split by semicolon but be careful with internal semicolons (not expected here though)
        // Actually, pool.query can execute multiple statements if supported, 
        // but explicit splitting is safer for error tracking or if the driver doesn't support multiple tokens.
        // However, standard pg doesn't support multiple statements in one query call unless configured generally?
        // It's strictly one statement per query usually. 
        // We will execute the huge block? No, 'pg' usually requires separate queries or a specific config.
        // The safest way is to execute table creations one by one.

        const statements = schema.split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            await run(stmt);
        }

        console.log("Tables created defined.");

        // Seed Users
        const passwordHash = await bcrypt.hash('password', 10);

        const seedUser = async (username, role, email) => {
            const res = await run("SELECT * FROM users WHERE username = $1", [username]);
            const exists = res.rows && res.rows.length > 0;

            if (!exists) {
                console.log(`Seeding user: ${username}`);
                await run(`INSERT INTO users (username, full_name, email, role, department, password) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [username, username + ' User', email, role, 'Dept', passwordHash]);
            }
        };

        // Note: Check if seed exists first to avoid duplicates if re-running
        // run() returns { changes, rows } per our db.js wrapper for updates, but select wrapper returns rows?
        // Actually db.run returns {changes, rows}. db.get returns row.

        // Wait, I need to check my new db.js implementation for `run` and `get`.
        // db.js: get -> returns res.rows[0]

        // Let's use get for check
        const checkUser = async (username) => {
            // get returns a direct row object or undefined
            const row = await require('./db').get("SELECT * FROM users WHERE username = $1", [username]);
            return !!row;
        }

        const seedUserSafe = async (username, role, email) => {
            const exists = await checkUser(username);
            if (!exists) {
                console.log(`Seeding user: ${username}`);
                await run(`INSERT INTO users (username, full_name, email, role, department, password) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [username, username + ' User', email, role, 'Dept', passwordHash]);
            }
        };

        await seedUserSafe('manager', 'Manager', 'manager@cotton.com');
        await seedUserSafe('chairman', 'Chairman', 'chairman@cotton.com');

        console.log("Done.");

    } catch (err) {
        console.error("Fatal Error:", err);
    } finally {
        pool.end();
    }
};

initDb();
