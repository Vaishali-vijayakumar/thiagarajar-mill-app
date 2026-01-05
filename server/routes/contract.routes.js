const express = require('express');
const router = express.Router();
const { run, query, get } = require('../db');
const { authenticateToken } = require('../middleware/auth.middleware');

// --- Helper: Determine Stage ---
const getContractStage = async (contract_id) => {
    // Check Stage 5 Chairman (Closed or Rollback?)
    // If Decision is 'Approved', contract is Closed.
    const s5 = await get("SELECT * FROM stage5_chairman_decision WHERE contract_id = $1", [contract_id]);
    if (s5 && s5.decision === 'Approve') return { stage: 6, status: 'Closed' };
    if (s5 && s5.decision === 'Modify') return { stage: 5, status: 'Rollback Requested' }; // Back to Manager

    // Check Stage 5 Payment
    const s5p = await get("SELECT * FROM stage5_payment_requisition WHERE contract_id = $1", [contract_id]);
    if (s5p) return { stage: 5, status: "Pending Chairman Approval" };

    // Check Stage 4 Chairman
    const s4 = await get("SELECT * FROM stage4_chairman_decision WHERE contract_id = $1", [contract_id]);
    if (s4 && s4.decision === 'Approve') return { stage: 5, status: "Pending Payment Entry" };

    // Check Stage 4 CTS (Data Entered?)
    // Logic: If 'mic_value' is present (and not null), Stage 4 Manager done.
    const s4cts = await get("SELECT * FROM stage3_4_cts_samples WHERE contract_id = $1", [contract_id]);
    if (s4cts && s4cts.mic_value != null) return { stage: 4, status: "Pending Chairman Approval" };

    // Check Stage 3 Sampling (Sequence Entered?)
    if (s4cts && s4cts.sequence_start != null) return { stage: 4, status: "Pending CTS Entry" };

    // Check Stage 2 Chairman
    const s2 = await get("SELECT * FROM stage2_chairman_decision WHERE contract_id = $1", [contract_id]);
    if (s2 && s2.decision === 'Approve') return { stage: 3, status: "Pending Sampling" };

    // Check Stage 2 Manager
    const s2m = await get("SELECT * FROM stage2_manager_report WHERE contract_id = $1", [contract_id]);
    if (s2m) return { stage: 2, status: "Pending Chairman Approval" };

    return { stage: 2, status: "Pending Quality Entry" }; // Created
};

// --- ROUTES ---

// GET Contracts
router.get('/contracts', authenticateToken, async (req, res) => {
    try {
        const sql = `
            SELECT c.*, v.vendor_name, v.gst_number 
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.vendor_id
            ORDER BY c.contract_id DESC
        `;
        const contracts = await query(sql);

        const contractsWithStatus = await Promise.all(contracts.map(async (c) => {
            const statusObj = await getContractStage(c.contract_id);
            return { ...c, ...statusObj };
        }));

        res.json(contractsWithStatus);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

router.get('/contracts/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const contract = await get(`
            SELECT c.*, v.vendor_name, v.gst_number, v.vendor_type, v.state 
            FROM contracts c
            JOIN vendors v ON c.vendor_id = v.vendor_id
            WHERE c.contract_id = $1
        `, [id]);

        if (!contract) return res.status(404).json({ message: "Not found" });

        const statusObj = await getContractStage(id);

        // Fetch Stage Details
        const stage2 = await get("SELECT * FROM stage2_manager_report WHERE contract_id = $1", [id]);
        const stage2Decision = await get("SELECT * FROM stage2_chairman_decision WHERE contract_id = $1", [id]);
        const stage3_4 = await get("SELECT * FROM stage3_4_cts_samples WHERE contract_id = $1", [id]);
        const stage4Decision = await get("SELECT * FROM stage4_chairman_decision WHERE contract_id = $1", [id]);
        const stage5Payment = await get("SELECT * FROM stage5_payment_requisition WHERE contract_id = $1", [id]);
        const stage5Decision = await get("SELECT * FROM stage5_chairman_decision WHERE contract_id = $1", [id]);

        res.json({
            ...contract,
            ...statusObj,
            stage2, stage2Decision, stage3_4, stage4Decision, stage5Payment, stage5Decision
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 1: Create
router.post('/contracts', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });

    const { vendor_id, cotton_type, quality, quantity, price, document_path, entry_date } = req.body;
    const entered_by = req.user.user_id;

    try {
        const result = await run(
            `INSERT INTO contracts (vendor_id, cotton_type, quality, quantity, price, document_path, entry_date, entered_by) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING contract_id`,
            [vendor_id, cotton_type, quality, quantity, price, document_path, entry_date, entered_by]
        );

        const newContractId = result.rows[0].contract_id;

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [newContractId, 1, 'Created', entered_by, 'Contract Created']);

        res.json({ message: "Contract created", contract_id: newContractId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 2: Manager Quality Entry
router.post('/contracts/:id/stage2', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id } = req.params;
    // Only accepting Average values + Variety + Price + Date
    const { variety, price, report_date, report_document_path, uhml, ui, strength, elongation, mic, rd, plus_b, remarks } = req.body;

    try {
        await run(`INSERT INTO stage2_manager_report 
            (contract_id, variety, price, report_date, report_document_path, uhml, ui, strength, elongation, mic, rd, plus_b, entered_by, remarks, uploaded_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET
            variety=EXCLUDED.variety, price=EXCLUDED.price, report_date=EXCLUDED.report_date, report_document_path=EXCLUDED.report_document_path,
            uhml=EXCLUDED.uhml, ui=EXCLUDED.ui, strength=EXCLUDED.strength, elongation=EXCLUDED.elongation, mic=EXCLUDED.mic,
            rd=EXCLUDED.rd, plus_b=EXCLUDED.plus_b, entered_by=EXCLUDED.entered_by, remarks=EXCLUDED.remarks, uploaded_at=CURRENT_TIMESTAMP`,
            [id, variety, price, report_date, report_document_path, uhml, ui, strength, elongation, mic, rd, plus_b, req.user.user_id, remarks]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 2, 'Quality Entry', req.user.user_id, 'Manager entered quality reports (Averages)']);

        res.json({ message: "Stage 2 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 2: Chairman Decision
router.post('/contracts/:id/stage2/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id } = req.params;
    const { decision, remarks } = req.body; // Approve / Reject

    try {
        await run(`INSERT INTO stage2_chairman_decision (contract_id, decision, remarks, decided_by, decision_date) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET decision=EXCLUDED.decision, remarks=EXCLUDED.remarks, decided_by=EXCLUDED.decided_by, decision_date=CURRENT_TIMESTAMP`,
            [id, decision, remarks, req.user.user_id]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 2, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 2 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 3: Sampling (Manager)
router.post('/contracts/:id/stage3', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id } = req.params;
    const { sequence_start, sequence_end, arrival_date, lot_number } = req.body;

    try {
        // Insert or Update stage3_4 table (only sampling fields)
        // Check existence
        const existing = await get("SELECT * FROM stage3_4_cts_samples WHERE contract_id = $1", [id]);
        if (existing) {
            await run("UPDATE stage3_4_cts_samples SET sequence_start=$1, sequence_end=$2, arrival_date=$3, lot_number=$4 WHERE contract_id=$5",
                [sequence_start, sequence_end, arrival_date, lot_number, id]);
        } else {
            await run("INSERT INTO stage3_4_cts_samples (contract_id, sequence_start, sequence_end, arrival_date, lot_number) VALUES ($1, $2, $3, $4, $5)",
                [id, sequence_start, sequence_end, arrival_date, lot_number]);
        }

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 3, 'Sampling Entry', req.user.user_id, 'Sampling details entered']);

        res.json({ message: "Stage 3 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 4: CTS Entry (Manager)
router.post('/contracts/:id/stage4', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id } = req.params;
    // CTS Fields (Removed tested_by, Added trash_percent_samples)
    const { mic_value, strength, uhml, ui_percent, sfi, elongation, rd, plus_b, colour_grade, mat, sci, trash_percent, moisture_percent, test_date, confirmation_date, remarks, report_document_path, trash_percent_samples } = req.body;

    console.log(`[DEBUG] Stage 4 POST for ID ${id}`);
    console.log(`[DEBUG] Trash Samples Payload:`, trash_percent_samples);

    try {
        await run(`UPDATE stage3_4_cts_samples SET 
            mic_value=$1, strength=$2, uhml=$3, ui_percent=$4, sfi=$5, elongation=$6, rd=$7, plus_b=$8, colour_grade=$9, mat=$10, sci=$11, trash_percent=$12, moisture_percent=$13, test_date=$14, confirmation_date=$15, remarks=$16, report_document_path=$17, trash_percent_samples=$18
            WHERE contract_id=$19`,
            [mic_value, strength, uhml, ui_percent, sfi, elongation, rd, plus_b, colour_grade, mat, sci, trash_percent, moisture_percent, test_date, confirmation_date, remarks, report_document_path, trash_percent_samples, id]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 4, 'CTS Entry', req.user.user_id, 'CTS results entered']);

        res.json({ message: "Stage 4 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 4: Chairman Decision
router.post('/contracts/:id/stage4/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id } = req.params;
    const { decision, remarks } = req.body;

    try {
        await run(`INSERT INTO stage4_chairman_decision (contract_id, decision, remarks, decided_by, decision_date) 
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET decision=EXCLUDED.decision, remarks=EXCLUDED.remarks, decided_by=EXCLUDED.decided_by, decision_date=CURRENT_TIMESTAMP`,
            [id, decision, remarks, req.user.user_id]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 4, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 4 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 5: Payment Entry (Manager)
router.post('/contracts/:id/stage5', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Manager') return res.status(403).json({ message: "Manager only" });
    const { id } = req.params;
    const { invoice_value, tds_amount, cash_discount, net_amount_paid, bank_name, branch, account_no, ifsc_code, payment_mode, rtgs_reference_no } = req.body;

    try {
        // Assume update allowed if "Rollback" happened, deleting old or updating?
        // Let's use INSERT OR REPLACE logic or check if exists.
        // Schema has `payment_id` PK.
        // We should check if `contract_id` exists in payment table.
        const existing = await get("SELECT * FROM stage5_payment_requisition WHERE contract_id = $1", [id]);

        if (existing) {
            await run(`UPDATE stage5_payment_requisition SET 
                invoice_value=$1, tds_amount=$2, cash_discount=$3, net_amount_paid=$4, bank_name=$5, branch=$6, account_no=$7, ifsc_code=$8, payment_mode=$9, rtgs_reference_no=$10
                WHERE contract_id=$11`,
                [invoice_value, tds_amount, cash_discount, net_amount_paid, bank_name, branch, account_no, ifsc_code, payment_mode, rtgs_reference_no, id]);
        } else {
            await run(`INSERT INTO stage5_payment_requisition 
                (contract_id, invoice_value, tds_amount, cash_discount, net_amount_paid, bank_name, branch, account_no, ifsc_code, payment_mode, rtgs_reference_no, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                [id, invoice_value, tds_amount, cash_discount, net_amount_paid, bank_name, branch, account_no, ifsc_code, payment_mode, rtgs_reference_no, req.user.user_id]);
        }

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 5, 'Payment Entry', req.user.user_id, 'Payment requisition entered']);

        // RESET APPROVAL: If re-submitting after rollback, delete the previous decision so it becomes Pending again.
        await run("DELETE FROM stage5_chairman_decision WHERE contract_id = $1", [id]);

        res.json({ message: "Stage 5 Data Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STAGE 5: Chairman Decision (with Rollback)
router.post('/contracts/:id/stage5/decision', authenticateToken, async (req, res) => {
    if (req.user.role !== 'Chairman') return res.status(403).json({ message: "Chairman only" });
    const { id } = req.params;
    const { decision, remarks } = req.body; // Approve, Reject, Modify (Rollback)

    // Rollback logic:
    // If decision is 'Modify', it means Rollback to Manager.
    // We store this decision. `getContractStage` checks this.

    try {
        const isModified = decision === 'Modify' ? 1 : 0;

        await run(`INSERT INTO stage5_chairman_decision (contract_id, decision, is_modified, remarks, decided_by, decision_date) 
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (contract_id) DO UPDATE SET decision=EXCLUDED.decision, is_modified=EXCLUDED.is_modified, remarks=EXCLUDED.remarks, decided_by=EXCLUDED.decided_by, decision_date=CURRENT_TIMESTAMP`,
            [id, decision, isModified, remarks, req.user.user_id]);

        await run(`INSERT INTO stage_history (contract_id, stage_number, action, performed_by, remarks) VALUES ($1, $2, $3, $4, $5)`,
            [id, 5, decision, req.user.user_id, remarks]);

        res.json({ message: "Stage 5 Decision Saved" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
