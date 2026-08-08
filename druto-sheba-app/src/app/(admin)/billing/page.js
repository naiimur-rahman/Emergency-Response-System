'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { Receipt, CreditCard, Download, Search, CheckCircle, X } from 'lucide-react';

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchBills = useCallback(() => {
    fetch(`/api/billing?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setBills)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useAutoRefresh(fetchBills);

  const handleMarkPaid = async (bill_id) => {
    try {
      const res = await fetch('/api/billing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bill_id, status: 'Paid' })
      });
      if (res.ok) fetchBills();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredBills = bills.filter(bill => {
    const term = searchTerm.toLowerCase();
    return (
      bill.bill_id.toString().includes(term) ||
      bill.patient_name.toLowerCase().includes(term) ||
      bill.trip_id.toLowerCase().includes(term)
    );
  });

  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Billing & Invoices</h2>
          <p className="page-header-sub">Manage patient billing and trip charges</p>
        </div>
        <div className="header-actions">
          <div className="search-box" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '10px', 
            padding: '8px 14px', 
            gap: '8px',
            width: '260px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search bill ID or patient..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ 
                border: 'none', 
                background: 'transparent', 
                color: 'var(--text-primary)', 
                outline: 'none', 
                width: '100%',
                fontSize: '13px'
              }}
            />
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
              {filteredBills.length > 0 ? filteredBills.map((bill) => (
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
                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Download Invoice"
                        onClick={() => setSelectedInvoice(bill)}
                      >
                        <Download size={14} />
                      </button>
                      {bill.payment_status === 'Unpaid' && (
                        <>
                          <button 
                            className="btn btn-secondary btn-sm"
                            title="Send Payment Reminder"
                            style={{ 
                              background: bill.payment_reminder_sent ? 'rgba(255,159,10,0.15)' : '',
                              color: bill.payment_reminder_sent ? '#ff9f0a' : ''
                            }}
                            onClick={async () => {
                              try {
                                const res = await fetch('/api/billing', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ bill_id: bill.bill_id, payment_reminder_sent: true })
                                });
                                if (res.ok) {
                                  alert('Payment reminder notification sent to patient!');
                                  fetchBills();
                                }
                              } catch (err) {
                                alert('Error: ' + err.message);
                              }
                            }}
                          >
                            📢 {bill.payment_reminder_sent ? 'Reminder Sent' : 'Send Reminder'}
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => handleMarkPaid(bill.bill_id)}>
                            <CheckCircle size={14} /> Mark Paid
                          </button>
                        </>
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

      {selectedInvoice && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '460px', padding: '26px',
            borderRadius: '16px', border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)', boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            display: 'flex', flexDirection: 'column', gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--blue)', fontSize: '18px', fontWeight: 800 }}>Druto Sheba Invoices</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Emergency Response System</span>
              </div>
              <span className={`badge ${
                selectedInvoice.payment_status === 'Paid' ? 'badge-low' : 
                selectedInvoice.payment_status === 'Unpaid' ? 'badge-critical' : 'badge-medium'
              }`}>
                {selectedInvoice.payment_status}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bill Reference:</span>
                <span style={{ fontWeight: 600 }}>#BILL-{selectedInvoice.bill_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Trip ID:</span>
                <span style={{ fontFamily: 'monospace' }}>{selectedInvoice.trip_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Patient Name:</span>
                <span style={{ fontWeight: 600 }}>{selectedInvoice.patient_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date Issued:</span>
                <span>{new Date(selectedInvoice.date_issued).toLocaleDateString()}</span>
              </div>

              <hr style={{ border: '0', borderTop: '1px dashed var(--border-subtle)', margin: '8px 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Base Amount:</span>
                <span>৳{parseFloat(selectedInvoice.amount).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tax (15%):</span>
                <span>৳{parseFloat(selectedInvoice.tax).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, marginTop: '8px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Total Amount:</span>
                <span style={{ color: 'var(--blue)' }}>৳{parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, justifyContent: 'center' }} 
                onClick={() => window.print()}
              >
                🖨️ Print Invoice
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ flex: 1, justifyContent: 'center' }} 
                onClick={() => setSelectedInvoice(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
