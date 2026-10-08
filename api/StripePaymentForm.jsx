import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage("");

    try {
      // 1. Solicitar el clientSecret a tu API Serverless
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount * 100 }) // Convertir MXN a centavos
      });

      const { clientSecret, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      // 2. Confirmar el pago en Stripe
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)
        }
      });

      if (result.error) {
        setErrorMessage(result.error.message);
      } else if (result.paymentIntent.status === "succeeded") {
        if (onSuccess) onSuccess(result.paymentIntent);
      }
    } catch (err) {
      setErrorMessage(err.message || "Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", maxWidth: "400px" }}>
      <div style={{ padding: "12px", border: "1px solid #27272a", borderRadius: "6px", backgroundColor: "#18181b" }}>
        <CardElement
          options={{
            style: {
              base: {
                color: "#ffffff",
                fontSize: "16px",
                "::placeholder": { color: "#a1a1aa" }
              },
              invalid: { color: "#ef4444" }
            }
          }}
        />
      </div>

      {errorMessage && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>{errorMessage}</p>}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          padding: "10px",
          backgroundColor: loading ? "#2563eb" : "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: loading ? "wait" : "pointer"
        }}
      >
        {loading ? "Procesando..." : `Pagar $${amount} MXN`}
      </button>
    </form>
  );
}

export default function StripePaymentForm({ amount, onSuccess }) {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm amount={amount} onSuccess={onSuccess} />
    </Elements>
  );
}