const { db, run } = require('./db');

const migrate = async () => {
    try {
        console.log("Migrating Vendors Table...");

        // Add email column
        try {
            await run("ALTER TABLE vendors ADD COLUMN email VARCHAR(150)");
            console.log("Added email column.");
        } catch (e) {
            if (e.message.includes('duplicate column name')) console.log("email column already exists.");
            else console.error("Error adding email:", e.message);
        }

        // Add phone_number column
        try {
            await run("ALTER TABLE vendors ADD COLUMN phone_number VARCHAR(20)");
            console.log("Added phone_number column.");
        } catch (e) {
            if (e.message.includes('duplicate column name')) console.log("phone_number column already exists.");
            else console.error("Error adding phone_number:", e.message);
        }

        // Add address column
        try {
            await run("ALTER TABLE vendors ADD COLUMN address TEXT");
            console.log("Added address column.");
        } catch (e) {
            if (e.message.includes('duplicate column name')) console.log("address column already exists.");
            else console.error("Error adding address:", e.message);
        }

        console.log("Migration completed.");

    } catch (err) {
        console.error("Migration Failed:", err);
    }
};

migrate();
