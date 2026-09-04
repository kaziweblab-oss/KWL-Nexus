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
  notFound: jest.fn(),
}));

test("homepage exposes the store promise and browse CTA", () => {
  render(<LanguageProvider><Home /></LanguageProvider>);
  expect(screen.getByRole("heading", { name: /Discover\. Download\. Deploy/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Browse Apps/ })).toHaveAttribute("href", "/apps");
});

test("app detail page renders plans and manual payment flow", () => {
  render(<AppDetailPage params={{ id: "focus-flow" }} />);
  expect(screen.getByRole("heading", { name: "Focus Flow" })).toBeInTheDocument();
  // Support both English and Bengali plan header (page uses Bengali per spec)
  expect(screen.getByText(/Choose your plan|প্ল্যান নির্বাচন করুন/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Pay manually/ })).toBeInTheDocument();
});

test("admin dashboard metrics render for overview", () => {
  render(<AdminStatCards />);
  expect(screen.getByText("Total Apps")).toBeInTheDocument();
  expect(screen.getByText("Revenue")).toBeInTheDocument();
});
