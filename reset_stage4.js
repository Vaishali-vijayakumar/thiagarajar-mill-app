const { db, run } = require('./server/db');

const resetStage4 = async () => {
    try {
        console.log("Resetting Stage 4 data for all contracts...");
        await run(`UPDATE stage3_4_cts_samples SET 
            mic_value=NULL, strength=NULL, uhml=NULL, ui_percent=NULL, sfi=NULL, 
            elongation=NULL, rd=NULL, plus_b=NULL, colour_grade=NULL, mat=NULL, 
            sci=NULL, trash_percent=NULL, moisture_percent=NULL, test_date=NULL, 
            confirmation_date=NULL, remarks=NULL, report_document_path=NULL, 
            trash_percent_samples=NULL, tested_by=NULL
        `);
        console.log("Stage 4 columns set to NULL. Form should be blank.");

        // Also remove Chairman decision if any, to ensure it goes back to "Pending CTS Entry" status
        await run("DELETE FROM stage4_chairman_decision");
        console.log("Stage 4 Chairman decisions deleted.");

    } catch (e) {
        console.error("Error:", e);
    }
};

resetStage4();
