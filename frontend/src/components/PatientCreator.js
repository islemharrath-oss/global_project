import React, { useState } from 'react';
import './PatientCreator.css';
import { createPatient } from '../api';

const initialForm = {
  username: '',
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  medical_record_number: '',
  date_of_birth: '',
  phone: '',
  address: '',
  emergency_contact: '',
};

function PatientCreator({ onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        ...form,
        date_of_birth: form.date_of_birth || null,
      };
      const result = await createPatient(payload);
      setMessage(`Patient created: ${result.patient?.full_name || form.username}`);
      setForm(initialForm);
      if (onCreated) onCreated(result);
    } catch (err) {
      setError(err.message || 'Unable to create patient');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="patient-card">
      <div className="patient-card__header">
        <h3>Patient account</h3>
        <p>Create a patient profile linked to your doctor account.</p>
      </div>

      {message ? <div className="patient-alert patient-alert--success">{message}</div> : null}
      {error ? <div className="patient-alert patient-alert--error">{error}</div> : null}

      <form className="patient-form" onSubmit={handleSubmit}>
        {[
          ['username', 'Username'],
          ['email', 'Email'],
          ['first_name', 'First name'],
          ['last_name', 'Last name'],
          ['medical_record_number', 'Record number'],
          ['date_of_birth', 'Date of birth'],
          ['phone', 'Phone'],
          ['emergency_contact', 'Emergency contact'],
        ].map(([field, label]) => (
          <label key={field}>
            {label}
            <input
              type={field === 'date_of_birth' ? 'date' : 'text'}
              value={form[field]}
              onChange={(e) => updateField(field, e.target.value)}
              required={field !== 'email' && field !== 'phone' && field !== 'emergency_contact' && field !== 'date_of_birth'}
            />
          </label>
        ))}
        <label className="patient-full-width">
          Address
          <textarea
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            rows="3"
          />
        </label>
        <label className="patient-full-width">
          Temporary password
          <input
            type="password"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            required
          />
        </label>
        <button type="submit" className="patient-submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create patient'}
        </button>
      </form>
    </section>
  );
}

export default PatientCreator;
