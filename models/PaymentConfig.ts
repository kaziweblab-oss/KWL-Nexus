import { Schema, model, models } from "mongoose";

// A singleton document keeps manual payment instructions editable by admins.
const PaymentConfigSchema = new Schema({
  bkash: { type: String, default: "" },
  nagad: { type: String, default: "" },
  rocket: { type: String, default: "" },
  helpText: { type: String, default: "Send the exact amount and keep your transaction ID." },
}, { timestamps: true });

export default models.PaymentConfig || model("PaymentConfig", PaymentConfigSchema);
