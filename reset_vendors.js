const { db, run } = require('./server/db');

const resetVendors = async () => {
    try {
        console.log("WARNING: Deleting ALL Vendors...");

        await run("DELETE FROM vendors");

        try {
            await run("DELETE FROM sqlite_sequence WHERE name='vendors'");
        } catch (e) { console.log("Could not reset sequence (minor)."); }

        console.log("SUCCESS: All vendors cleared.");

    } catch (e) {
        console.error("Error:", e);
    }
};

resetVendors();
