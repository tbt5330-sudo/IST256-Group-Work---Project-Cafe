const { useState } = React;

// React useState connects store reservation data and dynamically updates the page when values change.
function CafeReservationForm() {

    const [cafeReservation, setCafeReservation] = useState({
        customerName: "",
        customerEmail: "",
        reservationDate: "",
        reservationTime: "",
        groupSize: ""
    });

    const [formErrors, setFormErrors] = useState([]);
    const [reservationSubmitted, setReservationSubmitted] = useState(false);
    const [jsonOutput, setJsonOutput] = useState("");
    const [apiResponse, setApiResponse] = useState(null);

    // React event handling captures user input and updates the reservation object.
    const updateReservationDetails = (event) => {

        const { name, value } = event.target;

        setCafeReservation({
            ...cafeReservation,
            [name]: value
        });
    };


    // Input validation verifies that fields are completed and that reservation data is in an acceptable format before submission.
    const submitReservation = async (event) => {

        event.preventDefault();

        setFormErrors([]);
        setReservationSubmitted(false);

        const errors = [];
        const customerName =
            cafeReservation.customerName.trim();
        const customerEmail =
            cafeReservation.customerEmail
                .trim()
                .toLowerCase();
        const reservationDate =
            cafeReservation.reservationDate;
        const reservationTime =
            cafeReservation.reservationTime;
        const groupSize =
            Number(cafeReservation.groupSize);

        if (!customerName) {errors.push("Full name is required.");}
        if (!customerEmail) {errors.push("Email address is required.");}
        if (!reservationDate) {errors.push("Reservation date is required.");}
        if (!reservationTime) {errors.push("Reservation time is required.");}
        if (!groupSize) {errors.push("Number of guests is required.");}
        if (groupSize < 1 || groupSize > 20) {errors.push("Party size must be between 1 and 20 guests.");}

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (customerEmail && !emailPattern.test(customerEmail)) 
        {
            errors.push("Please enter a valid email address.");
        }
        if (errors.length > 0) 
        {
            setFormErrors(errors);
            return;
        }


        // Reservation information is organized into a JSON object for storage.
        const newCafeReservation = {
            reservationId: Date.now(),
            customerName,
            customerEmail,
            reservationDate,
            reservationTime,
            groupSize
        };

        // JSON data is retrieved from local storage and updated with the new reservation.
        let cafeReservations = JSON.parse(localStorage.getItem("cafeReservations")) || [];

        cafeReservations.push(newCafeReservation);

        localStorage.setItem("cafeReservations",JSON.stringify(cafeReservations));

        // Formatted JSON output is displayed so users can view the reservation data structure.
        setJsonOutput(
            JSON.stringify(
                newCafeReservation,
                null,
                4
            )
        );


        try {
            // AJAX uses Fetch API to send reservation data to an external web service. (API isn't implemented yet)
            const reservationResponse =
                await fetch(
                    "https://api.example.com/cafeReservations",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(
                            newCafeReservation
                        )
                    }
                );

            if (!reservationResponse.ok) {
                throw new Error(
                    "Failed to submit reservation."
                );
            }

            // The JSON response returned from the server is converted into a JavaScript object.
            const savedReservation =
                await reservationResponse.json();

            setApiResponse(savedReservation);
            setReservationSubmitted(true);
            setCafeReservation({
                customerName: "",
                customerEmail: "",
                reservationDate: "",
                reservationTime: "",
                groupSize: ""
            });


        } catch (error) {

            console.log("Placeholder API endpoint not implemented:",error);

            setApiResponse({message:"Reservation data prepared successfully. API endpoint pending implementation."});

            setReservationSubmitted(true);

            setCafeReservation({
                customerName: "",
                customerEmail: "",
                reservationDate: "",
                reservationTime: "",
                groupSize: ""
            });
        }
    };

    //The following code is a placeholder for the future REST API implementation. It will not function as intended until we implement the API.
    return (
    <div className="card shopping-card shadow-sm">

        <div className="card-header">
            <h3 className="mb-0">Reservation Details</h3>
        </div>

        <div className="card-body p-4">

            <p className="text-muted mb-4">Please complete the form below to reserve your table. All fields are required.</p>

            {formErrors.length > 0 && (
                <div className="alert alert-danger"role="alert">
                    <h5>Please correct the following errors:</h5>
                    <ul className="mb-0">
                        {formErrors.map((error, index) => (
                            <li key={index}>
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {reservationSubmitted && (
                <div className="alert alert-success"role="alert">
                    <h5>Reservation Submitted!</h5>
                    <p className="mb-0">Thank you for choosing Cozy Corner Cafe. Your reservation details have been submitted.</p>
                </div>
            )}

            <form onSubmit={submitReservation}>

                <div className="mb-3">
                    <label htmlFor="customerName"className="form-label">Full Name</label>
                    <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        className="form-control"
                        value={cafeReservation.customerName}
                        onChange={updateReservationDetails}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="customerEmail"className="form-label">Email Address</label>
                    <input
                        type="email"
                        id="customerEmail"
                        name="customerEmail"
                        className="form-control"
                        value={cafeReservation.customerEmail}
                        onChange={updateReservationDetails}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="reservationDate"className="form-label">Reservation Date</label>
                    <input
                        type="date"
                        id="reservationDate"
                        name="reservationDate"
                        className="form-control"
                        value={cafeReservation.reservationDate}
                        onChange={updateReservationDetails}
                    />
                </div>

                <div className="mb-3">
                    <label htmlFor="reservationTime"className="form-label">Reservation Time</label>
                    <input
                        type="time"
                        id="reservationTime"
                        name="reservationTime"
                        className="form-control"
                        value={cafeReservation.reservationTime}
                        onChange={updateReservationDetails}
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="groupSize"className="form-label">Number of Guests</label>
                    <select
                        id="groupSize"
                        name="groupSize"
                        className="form-select"
                        value={cafeReservation.groupSize}
                        onChange={updateReservationDetails}
                    >
                        <option value="">Select group size</option>
                        {[...Array(20)].map((_, index) => (
                            <option
                                key={index + 1}
                                value={index + 1}
                            >
                                {index + 1} Guest
                                {index > 0 ? "s" : ""}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="d-grid">
                    <button type="submit"className="btn btn-coffee btn-lg">Reserve My Table</button>
                </div>

            </form>

            <div className="card shopping-card mt-4">
                <div className="card-header">
                    <h4 className="mb-0">Reservation Information (JSON)</h4>
                </div>

                <div className="card-body">
                    <pre
                        className="bg-light p-3 rounded"
                        style={{
                            whiteSpace: "pre-wrap"
                        }}
                    >
                        {jsonOutput ||
                            "No reservation information submitted yet."}
                    </pre>
                </div>
            </div>

            {apiResponse && (
                <div
                    className="alert alert-info mt-3"
                    role="alert"
                >
                    <h5>API Response</h5>
                    <pre>
                        {JSON.stringify(
                            apiResponse,
                            null,
                            4
                        )}
                    </pre>
                </div>
            )}

        </div>

    </div>
  );
}

ReactDOM.render(
    <CafeReservationForm />,
    document.getElementById("reservationApp")
);