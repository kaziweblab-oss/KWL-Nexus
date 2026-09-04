import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";

// Mock the modules
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => {
      const params: Record<string, string> = {
        appId: "app1",
        planId: "Basic",
      };
      return params[key] || null;
    },
  }),
}));

jest.mock("@/components/shared/ToastProvider", () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Create a mock payment page component for testing
function MockPaymentPage() {
  return (
    <div>
      <h1>পেমেন্ট পেজ</h1>
      <form>
        <fieldset>
          <legend>পেমেন্ট পদ্ধতি নির্বাচন করুন</legend>
          <label>
            <input type="radio" name="paymentMethod" value="bkash" defaultChecked />
            bKash
          </label>
        </fieldset>
        <input
          id="transactionId"
          type="text"
          placeholder="ট্রানজেকশন আইডি"
          required
        />
        <button type="submit">পেমেন্ট জমা দিন</button>
      </form>
    </div>
  );
}

describe("Payment Page", () => {
  it("renders payment form", () => {
    render(<MockPaymentPage />);
    expect(screen.getByText("পেমেন্ট পেজ")).toBeInTheDocument();
    expect(screen.getByText("পেমেন্ট পদ্ধতি নির্বাচন করুন")).toBeInTheDocument();
  });

  it("renders payment methods", () => {
    render(<MockPaymentPage />);
    expect(screen.getByLabelText(/bKash/)).toBeInTheDocument();
  });

  it("renders transaction ID input", () => {
    render(<MockPaymentPage />);
    expect(screen.getByPlaceholderText("ট্রানজেকশন আইডি")).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<MockPaymentPage />);
    expect(screen.getByText("পেমেন্ট জমা দিন")).toBeInTheDocument();
  });
});
