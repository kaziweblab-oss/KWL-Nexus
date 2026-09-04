import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

test("renders a primary action with its label", () => {
  render(<Button>Save changes</Button>);
  expect(screen.getByRole("button", { name: "Save changes" })).toHaveClass("bg-primary");
});

test("supports the outline variant", () => {
  render(<Button variant="outline">Cancel</Button>);
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass("border");
});
