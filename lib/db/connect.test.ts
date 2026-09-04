jest.mock("mongoose", () => ({ connect: jest.fn().mockResolvedValue({ connection: { readyState: 1 } }) }));

test("reuses the cached mongoose connection", async () => {
  process.env.MONGODB_URI = "mongodb://test";
  const mongoose = await import("mongoose");
  const { connectToDatabase } = await import("./connect");
  await connectToDatabase();
  await connectToDatabase();
  expect(mongoose.connect).toHaveBeenCalledTimes(1);
});
