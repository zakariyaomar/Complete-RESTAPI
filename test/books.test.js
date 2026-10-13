// AI-assisted: These integration tests verify the API responses and state changes through HTTP requests.
const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const app = require("../server");

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  return { status: response.status, body: await response.json() };
}

test("filters books by genre and availability", async () => {
  const response = await request("/api/books?genre=fiction&available=true");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.count, 4);
  assert.ok(response.body.data.every((book) => book.genre === "fiction" && book.available));
});

test("searches books and returns pagination metadata", async () => {
  const response = await request("/api/books?search=ngugi&page=1&limit=1");

  assert.equal(response.status, 200);
  assert.equal(response.body.count, 1);
  assert.equal(response.body.pagination.total, 2);
  assert.equal(response.body.pagination.totalPages, 2);
});

test("creates a valid book and rejects an invalid ISBN", async () => {
  const invalidResponse = await request("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Invalid ISBN",
      author: "Test Author",
      isbn: "invalid",
      genre: "fiction"
    })
  });
  assert.equal(invalidResponse.status, 400);

  const response = await request("/api/books", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Things Fall Apart",
      author: "Chinua Achebe",
      isbn: "978-0-385-47454-2",
      genre: "fiction"
    })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.data.id, 9);
  assert.equal(response.body.data.available, true);
  assert.equal(response.body.data.borrowedBy, null);
});

test("does not delete a borrowed book and reports missing books", async () => {
  const borrowedResponse = await request("/api/books/2", { method: "DELETE" });
  const missingResponse = await request("/api/books/999", { method: "DELETE" });

  assert.equal(borrowedResponse.status, 400);
  assert.equal(
    borrowedResponse.body.error,
    "Cannot delete a book that is currently borrowed"
  );
  assert.equal(missingResponse.status, 404);
  assert.equal(missingResponse.body.error, "Book not found");
});

test("borrows and returns a book while enforcing borrowing rules", async () => {
  const borrowResponse = await request("/api/books/1/borrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ borrower: "Wanjiku" })
  });
  assert.equal(borrowResponse.status, 200);
  assert.equal(borrowResponse.body.data.available, false);
  assert.equal(borrowResponse.body.data.borrowedBy, "Wanjiku");

  const duplicateBorrowResponse = await request("/api/books/1/borrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ borrower: "Brian" })
  });
  assert.equal(duplicateBorrowResponse.status, 400);
  assert.equal(
    duplicateBorrowResponse.body.error,
    "Book is already borrowed by Wanjiku"
  );

  const returnResponse = await request("/api/books/1/return", { method: "POST" });
  assert.equal(returnResponse.status, 200);
  assert.equal(returnResponse.body.data.available, true);
  assert.equal(returnResponse.body.data.borrowedBy, null);
});
