import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';

export default function Stage1_Create() {
    const navigate = useNavigate();
    const [vendors, setVendors] = useState([]);
    const [showVendorModal, setShowVendorModal] = useState(false);

    // Contract Form State
    const [formData, setFormData] = useState({
        vendor_id: '',
        cotton_type: '',
        quality: '',
        quantity: '',
        price: '',
        document_path: 'doc/path/example.pdf', // Mock default
        entry_date: new Date().toISOString().split('T')[0]
    });

    // Vendor Form State
    const [vendorData, setVendorData] = useState({
        vendor_name: '',
        gst_number: '',
        state: '',
        email: '',
        phone_number: '',
        address: '',
        is_privileged: false
    });

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors');
            setVendors(res.data);
        } catch (e) { console.error(e); }
    };

    const handleContractChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleVendorChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setVendorData({ ...vendorData, [e.target.name]: value });
    };

    const submitContract = async (e) => {
        e.preventDefault();
        try {
            await api.post('/contracts', formData);
            navigate('/dashboard');
        } catch (e) {
            alert('Error creating contract: ' + (e.response?.data?.message || e.message));
        }
    };

    const submitVendor = async (e) => {
        e.preventDefault();
        try {
            await api.post('/vendors', vendorData);
            setShowVendorModal(false);
            fetchVendors();
            setVendorData({ vendor_name: '', gst_number: '', state: '', email: '', phone_number: '', address: '', is_privileged: false });
        } catch (e) {
            alert('Error adding vendor');
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Create New Contract</h2>

            <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
                <form onSubmit={submitContract} className="space-y-6">
                    {/* Vendor Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-slate-700 font-medium">Vendor</label>
                            <button type="button" onClick={() => setShowVendorModal(true)} className="text-indigo-600 text-sm flex items-center hover:text-indigo-500 font-semibold">
                                <Plus size={16} className="mr-1" /> Add New Vendor
                            </button>
                        </div>
                        <select name="vendor_id" value={formData.vendor_id} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer" required>
                            <option value="">Select Vendor</option>
                            {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name} - {v.gst_number}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-slate-600 mb-2 font-medium text-sm">Cotton Type</label>
                            <input type="text" name="cotton_type" placeholder="e.g. S-6, MCU-5, DCH-32" value={formData.cotton_type} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" required />
                        </div>
                        <div>
                            <label className="block text-slate-600 mb-2 font-medium text-sm">Quality</label>
                            <input type="text" name="quality" placeholder="e.g. Grade A, 28mm" value={formData.quality} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" required />
                        </div>
                        <div>
                            <label className="block text-slate-600 mb-2 font-medium text-sm">Quantity (Bales)</label>
                            <input type="number" name="quantity" placeholder="e.g. 100" value={formData.quantity} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" required />
                        </div>
                        <div>
                            <label className="block text-slate-600 mb-2 font-medium text-sm">Price </label>
                            <input type="number" name="price" placeholder="e.g. 55000" value={formData.price} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" required />
                        </div>
                        <div>
                            <label className="block text-slate-600 mb-2 font-medium text-sm">Entry Date</label>
                            <input type="date" name="entry_date" value={formData.entry_date} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" required />
                        </div>
                        <div>
                            <label className="block text-slate-600 mb-2 font-medium text-sm">Document Path</label>
                            <input type="text" name="document_path" placeholder="e.g. contracts/2026/001.pdf" value={formData.document_path} onChange={handleContractChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all" required />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:-translate-y-0.5">Create Contract</button>
                    </div>
                </form>
            </div>

            {/* Vendor Modal */}
            {showVendorModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
                        <button onClick={() => setShowVendorModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"><X /></button>
                        <h3 className="text-xl font-bold text-slate-900 mb-6">Add New Vendor</h3>
                        <form onSubmit={submitVendor} className="space-y-4">
                            <input type="text" name="vendor_name" placeholder="Vendor Name" value={vendorData.vendor_name} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" required />
                            <input type="text" name="gst_number" placeholder="GST Number" value={vendorData.gst_number} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" required />
                            <input type="text" name="state" placeholder="State" value={vendorData.state} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                            <input type="email" name="email" placeholder="Email" value={vendorData.email} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                            <input type="tel" name="phone_number" placeholder="Phone Number" value={vendorData.phone_number} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
                            <textarea name="address" placeholder="Address" value={vendorData.address} onChange={handleVendorChange} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg p-3 h-24 focus:ring-2 focus:ring-indigo-500" />
                            <div className="flex items-center space-x-2">
                                <input type="checkbox" name="is_privileged" checked={vendorData.is_privileged} onChange={handleVendorChange} id="priv" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="priv" className="text-slate-700 font-medium">Privileged Vendor</label>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg mt-4 shadow-lg hover:shadow-indigo-500/30 transition-all">Save Vendor</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
