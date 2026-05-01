'use client';
import { useState, useEffect } from 'react';
import { Receipt, CreditCard, Download, Search } from 'lucide-react';

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(setBills).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>Billing & Invoices</h2>
          <p className="page-header-sub">Manage patient billing and trip charges</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={16} />
            <input type="text" placeholder="Search bill ID or patient..." />
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h3><Receipt size={16} /> All Invoices</h3>
        </div>
        <div className="section-body">
          <table>
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Patient</th>
                <th>Base Amount</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length > 0 ? bills.map((bill) => (
                <tr key={bill.bill_id}>
                  <td style={{ fontWeight: 600 }}>#BILL-{bill.bill_id}</td>
                  <td>{bill.patient_name}</td>
                  <td>৳{parseFloat(bill.amount).toLocaleString()}</td>
                  <td>৳{parseFloat(bill.tax).toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: 'var(--blue)' }}>৳{parseFloat(bill.total_amount).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${
                      bill.payment_status === 'Paid' ? 'badge-low' : 
                      bill.payment_status === 'Unpaid' ? 'badge-critical' : 
                      'badge-medium'
                    }`}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td>{new Date(bill.date_issued).toLocaleDateString()}</td>
                  <td>
                    <div className="action-btns">
                      <button className="btn btn-secondary btn-sm" title="Download Invoice">
                        <Download size={14} />
                      </button>
                      {bill.payment_status === 'Unpaid' && (
                        <button className="btn btn-primary btn-sm">
                          <CreditCard size={14} /> Pay
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No billing records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
