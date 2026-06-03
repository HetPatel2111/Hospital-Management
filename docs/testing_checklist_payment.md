# Testing Checklist - Razorpay Payment Integration

Use this testing checklist to verify Razorpay Test Mode payment integrations across the application.

## 1. Automated Unit Verification
Ensure all backend unit tests pass successfully by running:
```bash
npm run test tests/paymentPortal.test.js
```
Expected output:
- `tests/paymentPortal.test.js (10 tests) ... passed`

---

## 2. Manual Verification Flow (Patient Portal)

### A. Appointment Booking & Initialization
1. Log in to the Patient Portal (e.g. `user1@gmail.com` / `123456789`).
2. Go to the "Appointments" tab.
3. Click "Book a consultation" and select an approved doctor.
4. Pick an available date and time slot, enter a reason, and click "Confirm Book".
5. **Expected result**:
   - The appointment is created.
   - The initial status badge displays **PENDING PAYMENT** in amber.
   - No consultation is yet confirmed.

### B. Payment Details Modal
1. Click on the newly booked appointment card to open the **Appointment Details Modal**.
2. **Expected result**:
   - Displays the doctor details, date, slot time, and visit reason.
   - Displays the **Consultation Fee** (e.g., ₹500).
   - Displays a prominent **Pay Now** button.

### C. Razorpay Checkout Launch
1. Click the **Pay Now** button in the modal.
2. **Expected result**:
   - The Razorpay checkout iframe loads dynamically (underlay lock overlay is visible).
   - Razorpay Checkout displays the merchant name ("AI Hospital Management"), doctor fee, and prefilled patient details.

### D. Successful Payment simulation
1. Inside the Razorpay Checkout, select **Card** payment.
2. Use the Razorpay Test Card numbers (e.g. Card: `4111 1111 1111 1111`, CVV: `123`, Expiry: Future date).
3. Click "Pay" and choose **Success** on the test OTP verification window.
4. **Expected result**:
   - The Razorpay modal closes.
   - The screen shows the locking overlay: "Verifying Payment Security...".
   - The backend signature verification matches the token signature.
   - The locking overlay disappears and displays a green **Payment Confirmed** success toast alert.
   - The details modal closes and the appointment status changes to **CONFIRMED**.

### E. Verify Transaction History
1. Navigate to the **Payments Log** page (`/patient/payments`).
2. **Expected result**:
   - The completed transaction is listed at the top of the table.
   - The payment status displays **SUCCESS** in green.
   - Click "View Details".
   - It reveals the Order ID, Payment ID, signature, payment method, paid timestamp, and refund status **NONE**.

---

## 3. Negative Scenarios & Error Handling

### A. Dismissing Payment Checkout
1. Click "Pay Now" on a `pending_payment` appointment.
2. Close the Razorpay checkout overlay.
3. **Expected result**:
   - The checkout closes safely.
   - The loading block disappears.
   - The appointment status remains **PENDING PAYMENT**.

### B. Duplicate Verification Check
1. Try sending a repeat verification request payload for an already completed order to `POST /api/v1/payments/verify`.
2. **Expected result**:
   - Backend returns `400 Bad Request`.
   - Error code: `DUPLICATE_VERIFICATION`.
   - Message: "This payment has already been verified and processed".

### C. Invalid Signature Validation Check
1. Dispatch a payload to `POST /api/v1/payments/verify` with an invalid `razorpaySignature`.
2. **Expected result**:
   - Backend returns `400 Bad Request`.
   - Error code: `INVALID_SIGNATURE`.
   - Message: "Payment signature verification failed".
   - The payment status in the database is updated to **FAILED**.

### D. Access Control Protection
1. Log in under `user2@gmail.com` (Patient 2).
2. Attempt to read payment details of Patient 1 via `GET /api/v1/payments/:id`.
3. **Expected result**:
   - Backend returns `403 Forbidden`.
   - Error code: `FORBIDDEN`.
   - Message: "You do not have permission to view this payment".
