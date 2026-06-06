'use client';
import { useState, useEffect, useCallback } from 'react';
import { Receipt, CreditCard, Download, ShieldCheck } from 'lucide-react';
import { useUser } from '@/lib/UserContext';
import { useToast } from '@/components/Toast';

export default function PatientBills() {
  const { activePatient } = useUser();
  const toast = useToast();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);

  const fetchBills = useCallback(async () => {
    if (!activePatient?.id) return;
    try {
      const r = await fetch(`/api/patient/bills?patientId=${activePatient.id}`);
      const data = await r.json();
      setBills(data);
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  }, [activePatient]);

  useEffect(() => {
    fetchBills();
    const interval = setInterval(fetchBills, 10000);
    return () => clearInterval(interval);
  }, [fetchBills]);

  const handlePay = async (billId) => {
    setPaying(billId);
    try {
      const r = await fetch('/api/patient/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId })
      });
      if (r.ok) {
        setBills(bills.map(b => b.bill_id === billId ? { ...b, payment_status: 'Paid' } : b));
        toast('Payment processed successfully!', 'success', { title: 'Payment Complete' });
      } else {
        toast('Failed to process payment', 'error', { title: 'Payment Error' });
      }
    } catch (err) {
      console.error(err);
      toast('Payment failed.', 'error', { title: 'Payment Error' });
    } finally {
      setPaying(null);
    }
  };

  if (!activePatient) return null;
  if (loading) return <div className="page-container"><div className="loading-container"><div className="spinner" /></div></div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h2>My Invoices</h2>
          <p className="page-header-sub">View and pay your automated emergency trip bills</p>
        </div>
        <div className="live-indicator"><div className="live-dot" /> LIVE</div>
      </div>

      <div className="section-card">
        <div className="section-header">
          <h3><Receipt size={16} /> Billing History for {activePatient?.name}</h3>
        </div>
        <div className="section-body">
          {bills.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {bills.map((bill) => (
                <div key={bill.bill_id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '16px', border: '1px solid var(--border-subtle)', borderRadius: '12px',
                  background: 'var(--bg-secondary)'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '18px' }}>#BILL-{bill.bill_id}</span>
                      <span className={`badge ${bill.payment_status === 'Paid' ? 'badge-low' : 'badge-critical'}`}>
                        {bill.payment_status}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '4px' }}>
                      Destination: {bill.hospital_name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Issued on {new Date(bill.date_issued).toLocaleDateString()}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--blue)', marginBottom: '12px' }}>
                      ৳{parseFloat(bill.total_amount).toLocaleString()}
                    </div>
                    {(bill.payment_status === 'Unpaid' || bill.payment_status === 'Pending') ? (
                      <button 
                        onClick={() => handlePay(bill.bill_id)}
                        disabled={paying === bill.bill_id}
                        className="btn btn-primary" 
                        style={{ padding: '8px 24px', borderRadius: '8px' }}
                      >
                        {paying === bill.bill_id ? 'Processing...' : <><CreditCard size={16} /> Pay Securely</>}
                      </button>
                    ) : (
                      <button className="btn btn-secondary" style={{ padding: '8px 24px', borderRadius: '8px', color: 'var(--green)' }} disabled>
                        <ShieldCheck size={16} /> Payment Verified
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              You have no pending or past invoices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
