import React, { useState, useEffect } from 'react';
import api from '../api';

export default function Vendors() {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await api.get('/vendors');
            setVendors(res.data);
        } catch (e) {
            console.error("Error fetching vendors:", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">Vendor Directory</h2>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-xs font-semibold tracking-wider">
                                <th className="p-4">ID</th>
                                <th className="p-4">Vendor Name</th>
                                <th className="p-4">GST Number</th>
                                <th className="p-4">State</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Phone</th>
                                <th className="p-4">Address</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                            {loading ? (
                                <tr><td colSpan="7" className="p-6 text-center text-slate-500">Loading vendors...</td></tr>
                            ) : vendors.length === 0 ? (
                                <tr><td colSpan="7" className="p-6 text-center text-slate-500">No vendors found.</td></tr>
                            ) : (
                                vendors.map((vendor) => (
                                    <tr key={vendor.vendor_id} className="hover:bg-indigo-50/50 transition-colors">
                                        <td className="p-4 font-mono text-indigo-600 font-semibold">#{vendor.vendor_id}</td>
                                        <td className="p-4 font-semibold text-slate-900">{vendor.vendor_name}</td>
                                        <td className="p-4">{vendor.gst_number}</td>
                                        <td className="p-4">{vendor.state}</td>
                                        <td className="p-4 text-slate-500">{vendor.email || '-'}</td>
                                        <td className="p-4 text-slate-500">{vendor.phone_number || '-'}</td>
                                        <td className="p-4 max-w-xs truncate text-slate-500" title={vendor.address}>{vendor.address || '-'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
