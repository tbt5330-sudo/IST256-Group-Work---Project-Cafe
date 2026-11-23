
const { useState } = React;

function CafeReservationForm() {

  const emptyForm = () => ({
    customerName: '',
    customerEmail: '',
    reservationDate: '',
    reservationTime: '',
    groupSize: ''
  });

  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiResponse, setApiResponse] = useState(null);
  const [jsonOutput, setJsonOutput] = useState('');

  const change = event =>
    setForm(old => ({
      ...old,
      [event.target.name]: event.target.value
    }));

  async function submit(event) {
    event.preventDefault();

    setErrors([]);
    setSuccess('');
    setApiResponse(null);

    const item = {
      customerName: form.customerName.trim(),
      customerEmail: form.customerEmail.trim().toLowerCase(),
      reservationDate: form.reservationDate,
      reservationTime: form.reservationTime,
      groupSize: Number(form.groupSize)
    };

    const failures = [];

    if (item.customerName.length < 2) {
      failures.push('Please enter your name.');
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        item.customerEmail
      )
    ) {
      failures.push(
        'Please enter a valid email address.'
      );
    }

    if (
      !item.reservationDate ||
      Number.isNaN(Date.parse(item.reservationDate))
    ) {
      failures.push(
        'Select a valid reservation date.'
      );
    }

    if (!/^\d{2}:\d{2}$/.test(item.reservationTime)) {
      failures.push(
        'Select a reservation time.'
      );
    }

    if (
      !Number.isInteger(item.groupSize) ||
      item.groupSize < 1 ||
      item.groupSize > 20
    ) {
      failures.push('Group size must be 1–20.');
    }

    if (failures.length) {
      setErrors(failures);
      return;
    }

    setSaving(true);
    setJsonOutput(
      JSON.stringify(item, null, 2)
    );

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          (
            data.errors ||
            ['Reservation could not be saved.']
          ).join(' ')
        );
      }

      setApiResponse(data);
      setSuccess(
        'Your demo reservation has been saved.'
      );

      setForm(emptyForm());

    } catch (error) {
      setErrors([
        error.message ||
        'The reservation could not be saved.'
      ]);

    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card shopping-card shadow-sm">

      <div className="card-header">
        <h3 className="mb-0">Reservation Details</h3>
      </div>

      <div className="card-body p-4">

        <p className="text-muted">
          Submit a cafe reservation. All fields are required.
        </p>

        {errors.length > 0 && (
          <div className="alert alert-danger" role="alert">
            <ul>
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {success && (
          <div className="alert alert-success" role="status">
            {success}
          </div>
        )}

        <form onSubmit={submit}>

          <div className="mb-3">
            <label className="form-label" htmlFor="customerName">
              Full Name
            </label>

            <input
              type="text"
              className="form-control"
              id="customerName"
              name="customerName"
              value={form.customerName}
              onChange={change}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="customerEmail">
              Email Address
            </label>

            <input
              type="email"
              className="form-control"
              id="customerEmail"
              name="customerEmail"
              value={form.customerEmail}
              onChange={change}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="reservationDate">
              Reservation Date
            </label>

            <input
              type="date"
              className="form-control"
              id="reservationDate"
              name="reservationDate"
              value={form.reservationDate}
              onChange={change}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="reservationTime">
              Reservation Time
            </label>

            <input
              type="time"
              className="form-control"
              id="reservationTime"
              name="reservationTime"
              value={form.reservationTime}
              onChange={change}
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="groupSize">
              Number of Guests
            </label>

            <select
              className="form-select"
              id="groupSize"
              name="groupSize"
              value={form.groupSize}
              onChange={change}
              required
            >
              <option value="">Select group size</option>

              {Array.from(
                { length: 20 },
                (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} Guest{i ? 's' : ''}
                  </option>
                )
              )}

            </select>
          </div>

          <div className="d-grid">
            <button
              type="submit"
              className="btn btn-coffee btn-lg"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Reserve My Table'}
            </button>
          </div>

        </form>

        <div className="card shopping-card mt-4">

          <div className="card-header">
            <h4 className="mb-0">
              Reservation Information (JSON)
            </h4>
          </div>

          <div className="card-body">
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {jsonOutput ||
                'No reservation information submitted yet.'}
            </pre>
          </div>

        </div>

        {apiResponse && (
          <div className="alert alert-info mt-3">

            <h5>API Response</h5>

            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(apiResponse, null, 2)}
            </pre>

          </div>
        )}

      </div>
    </div>
  );
}

ReactDOM.render(
  <CafeReservationForm />,
  document.getElementById('reservationApp')
);
