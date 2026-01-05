import React, { useState, useEffect } from 'react';
import api from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Check, X } from 'lucide-react';

export default function Stage4_CTS() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contract, setContract] = useState(null);

    // CTS Fields
    const [formData, setFormData] = useState({
        mic_value: '', strength: '', uhml: '', ui_percent: '', sfi: '',
        elongation: '', rd: '', plus_b: '', colour_grade: '', mat: '',
        sci: '', trash_percent: '', moisture_percent: '',
        test_date: '', confirmation_date: '', remarks: '', report_document_path: ''
    });

    // Valid fields for iteration
    const fieldOrder = [
        'test_date', 'confirmation_date',
        'mic_value', 'strength', 'uhml', 'ui_percent', 'sfi',
        'elongation', 'rd', 'plus_b', 'colour_grade', 'mat',
        'trash_percent', 'moisture_percent', 'sci', 'report_document_path', 'remarks'
    ];

    const [approvalData, setApprovalData] = useState({ decision: 'Approve', remarks: '' });

    // Individual Trash Samples
    const [trashSamples, setTrashSamples] = useState({});
    const [sequences, setSequences] = useState([]);

    useEffect(() => { fetchContract(); }, [id]);

    const fetchContract = async () => {
        try {
            const res = await api.get(`/contracts/${id}`);
            setContract(res.data);
            if (res.data.stage3_4) {
                const s34 = res.data.stage3_4;
                // Load Form Data
                // SANITIZE: Ensure NULL or 0 becomes '' for display to force manual entry.
                // Only keep valid existing entries if explicitly non-zero/non-null (e.g. edit mode)
                // But user said "no value in prior". If it's the first time entering (no CTS entry yet), it should be empty.
                // If it is 'Pending Chairman Approval', the manager might want to see what they entered. 
                // We will assume "prior" means "defaults". If data exists, show it. If it's 0/null, show blank.

                const sanitized = {};
                const { trash_percent_samples, ...rest } = s34;

                Object.keys(rest).forEach(k => {
                    // If it's a measurement field and value is 0 or null, set to ''
                    if (['mic_value', 'strength', 'uhml', 'ui_percent', 'sfi', 'elongation', 'rd', 'plus_b', 'mat', 'sci', 'trash_percent', 'moisture_percent'].includes(k)) {
                        sanitized[k] = (rest[k] === null || rest[k] === 0) ? '' : rest[k];
                    } else {
                        sanitized[k] = rest[k] || '';
                    }
                });

                setFormData(prev => ({ ...prev, ...sanitized }));

                // Parse Sequences
                if (s34.sequence_start && s34.sequence_end) {
                    const startNum = parseInt(s34.sequence_start.split('/')[0]);
                    const endNum = parseInt(s34.sequence_end.split('/')[0]);
                    const suffix = s34.sequence_start.includes('/') ? '/' + s34.sequence_start.split('/')[1] : '';

                    if (!isNaN(startNum) && !isNaN(endNum)) {
                        const seq = [];
                        for (let i = startNum; i <= endNum; i++) {
                            seq.push({ num: i, label: `${i}${suffix}` });
                        }
                        setSequences(seq);
                    }
                }

                // Load Trash Samples
                if (trash_percent_samples) {
                    try {
                        setTrashSamples(JSON.parse(trash_percent_samples));
                    } catch (e) { console.error("Error parsing trash samples", e); }
                }
            }
        } catch (e) { console.error(e); }
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleTrashChange = (seq, val) => {
        setTrashSamples(prev => ({ ...prev, [seq]: val }));
    };

    const handleSubmitManager = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/contracts/${id}/stage4`, {
                ...formData,
                trash_percent_samples: JSON.stringify(trashSamples)
            });
            fetchContract();
        } catch (e) { alert(e.response?.data?.error); }
    };

    const handleSubmitChairman = async (decision) => {
        try {
            await api.post(`/contracts/${id}/stage4/decision`, { decision, remarks: approvalData.remarks });
            navigate('/dashboard');
        } catch (e) { alert(e.response?.data?.error); }
    };

    if (!contract) return <div>Loading...</div>;
    const isManager = user.role === 'Manager';
    const isChairman = user.role === 'Chairman';
    const isApproved = contract.stage4Decision?.decision === 'Approve';
    const isPendingApproval = contract.stage3_4?.mic_value && !isApproved;

    return (
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">CTS Entry & Approval</h2>

            {/* Manager CTS Form */}
            <div className={`bg-white border border-slate-200 p-8 rounded-xl shadow-sm mb-8 ${isPendingApproval || isApproved ? 'opacity-75 pointer-events-none' : ''}`}>
                <h3 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-2">CTS Parameters</h3>
                <form onSubmit={handleSubmitManager} className="space-y-6">
                    {/* General Fields */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {fieldOrder.map(key => (
                            <div key={key} className={key === 'remarks' || key === 'report_document_path' ? 'col-span-2' : ''}>
                                <label className="block text-slate-500 text-xs uppercase font-bold tracking-wide mb-1">{key.replace(/_/g, ' ')}</label>
                                <input
                                    type={key.includes('date') ? 'date' : (key === 'remarks' || key === 'report_document_path' || key === 'colour_grade' ? 'text' : 'number')}
                                    name={key}
                                    value={formData[key] || ''}
                                    onChange={handleChange}
                                    placeholder={key.includes('date') ? '' : `Enter ${key.replace(/_/g, ' ')}`}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                    step="any"
                                    readOnly={!isManager}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Trash Samples Grid */}
                    {sequences.length > 0 && (
                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                            <h4 className="text-lg font-bold text-slate-900 mb-4">Trash % per Sequence</h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                {sequences.map(item => (
                                    <div key={item.num}>
                                        <label className="block text-slate-500 text-xs font-bold mb-1">{item.label}</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={trashSamples[item.num] || ''}
                                            onChange={(e) => handleTrashChange(item.num, e.target.value)}
                                            className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg p-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            readOnly={!isManager}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isManager && !isPendingApproval && !isApproved && (
                        <div className="col-span-full pt-4">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-lg font-bold w-full shadow-lg hover:shadow-indigo-500/30 transition-all">Submit CTS Results</button>
                        </div>
                    )}
                </form>
            </div>

            {/* Chairman Approval */}
            {isChairman && isPendingApproval && !isApproved && (
                <div className="bg-white border border-amber-200 p-6 rounded-xl shadow-lg ring-1 ring-amber-100 flex items-center space-x-4">
                    <button onClick={() => handleSubmitChairman('Approve')} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold shadow-md"><Check /> <span>Approve</span></button>
                    <button onClick={() => handleSubmitChairman('Reject')} className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold shadow-md"><X /> <span>Reject</span></button>
                </div>
            )}
        </div>
    );
}
