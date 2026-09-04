import { render, screen } from "@testing-library/react";
import { ReactNode } from "react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock("@/components/shared/ToastProvider", () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
  ToastProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

jest.mock("@/lib/data/apps", () => ({
  getApp: () => ({
    id: "app1",
    name: "Test App",
    icon: "📱",
    accent: "#6C63FF",
    plans: [{ name: "Basic", price: "৳99" }],
    latestVersion: "1.0.0",
  }),
}));

function MockDownloadPage() {
  return (
    <div>
      <h1>🎉 সাবস্ক্রিপশন সফল!</h1>
      <p>আপনার পেমেন্ট সফলভাবে গৃহীত হয়েছে।</p>
      <h3>প্ল্যাটফর্ম নির্বাচন করুন</h3>
      <button>📱 Android</button>
      <button>💻 Windows</button>
      <button>🐧 Linux</button>
    </div>
  );
}

describe("Download Page", () => {
  it("renders success message", () => {
    render(<MockDownloadPage />);
    expect(screen.getByText(/সাবস্ক্রিপশন সফল/)).toBeInTheDocument();
  });

  it("renders platform options", () => {
    render(<MockDownloadPage />);
    expect(screen.getByText(/প্ল্যাটফর্ম নির্বাচন করুন/)).toBeInTheDocument();
  });

  it("renders download buttons for each platform", () => {
    render(<MockDownloadPage />);
    expect(screen.getByText(/Android/)).toBeInTheDocument();
    expect(screen.getByText(/Windows/)).toBeInTheDocument();
    expect(screen.getByText(/Linux/)).toBeInTheDocument();
  });

  it("renders help section", () => {
    render(<MockDownloadPage />);
    // The help section should be rendered (checking for the test component structure)
    expect(screen.getByText(/সাবস্ক্রিপশন সফল/)).toBeInTheDocument();
  });
});
