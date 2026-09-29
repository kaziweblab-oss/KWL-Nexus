import { render, screen } from "@testing-library/react";
import Home from "@/app/(public)/page";
import AppDetailPage from "@/app/(public)/apps/[id]/page";
import { AdminStatCards } from "@/components/admin/AdminStatCards";
import { LanguageProvider } from "@/components/shared/LanguageProvider";

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: null, status: "unauthenticated" }), signIn: jest.fn(), signOut: jest.fn() }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), refresh: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => ({ get: jest.fn(() => null) }),
  usePathname: () => "/",
  notFound: jest.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));
jest.mock("@/lib/db/connect", () => ({ connectToDatabase: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/models/App", () => ({ __esModule: true, default: { findOne: jest.fn() } }));
jest.mock("@/models/Plan", () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock("@/models/AppVersion", () => ({ __esModule: true, default: { find: jest.fn() } }));
jest.mock("@/models/Feedback", () => ({ __esModule: true, default: { aggregate: jest.fn() } }));
jest.mock("@/components/shared/PaymentRequestForm", () => ({ PaymentRequestForm: () => <div data-testid="pay-form" /> }));
jest.mock("@/components/shared/FeedbackForm", () => ({ FeedbackForm: () => <div data-testid="feedback-form" /> }));

import App from "@/models/App";
import Plan from "@/models/Plan";
import AppVersion from "@/models/AppVersion";
import Feedback from "@/models/Feedback";

test("homepage exposes the store promise and browse CTA", () => {
  render(<LanguageProvider><Home /></LanguageProvider>);
  expect(screen.getByRole("heading", { name: /Go Further/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Explore Apps/ })).toHaveAttribute("href", "/apps");
});

test("app detail page renders a published db app", async () => {
  (App.findOne as jest.Mock).mockReturnValue({ lean: () => Promise.resolve({ _id: "app1", name: "KWL Video Downloader", slug: "kwl-video-downloader", description: "Downloader", category: "Multimedia", downloadCount: 7, latestVersion: "1.0.7", features: [], screenshots: [], downloadUrl: {} }) });
  (Plan.find as jest.Mock).mockResolvedValue([]);
  (AppVersion.find as jest.Mock).mockReturnValue({ sort: () => Promise.resolve([]) });
  (Feedback.aggregate as jest.Mock).mockResolvedValue([]);
  const ui = await AppDetailPage({ params: { id: "kwl-video-downloader" } });
  render(<LanguageProvider>{ui as unknown as React.ReactElement}</LanguageProvider>);
  expect(screen.getByRole("heading", { name: "KWL Video Downloader" })).toBeInTheDocument();
  expect(screen.getByTestId("pay-form")).toBeInTheDocument();
});

test("app detail page 404s for unknown apps", async () => {
  (App.findOne as jest.Mock).mockReturnValue({ lean: () => Promise.resolve(null) });
  await expect(AppDetailPage({ params: { id: "nope" } })).rejects.toThrow("NEXT_NOT_FOUND");
});

test("admin dashboard metrics render for overview", () => {
  render(<LanguageProvider><AdminStatCards /></LanguageProvider>);
  expect(screen.getByText("Total Apps")).toBeInTheDocument();
  expect(screen.getByText("Revenue")).toBeInTheDocument();
});
