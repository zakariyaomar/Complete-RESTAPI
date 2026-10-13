// AI-assisted: This router stores the in-memory book collection and implements its library operations.
const express = require("express");
const { validateBook, validateBorrower } = require("../middleware/validate");

const router = express.Router();

let books = [
  { id: 1, title: "Weep Not, Child", author: "Ngugi wa Thiong'o", isbn: "978-0-14-018650-2", genre: "fiction", available: true, borrowedBy: null },
  { id: 2, title: "The River Between", author: "Ngugi wa Thiong'o", isbn: "978-0-14-018651-9", genre: "fiction", available: false, borrowedBy: "Amina Wanjiku" },
  { id: 3, title: "Born a Crime", author: "Trevor Noah", isbn: "978-0-399-59043-2", genre: "autobiography", available: true, borrowedBy: null },
  { id: 4, title: "Americanah", author: "Chimamanda Ngozi Adichie", isbn: "978-0-307-45592-8", genre: "fiction", available: true, borrowedBy: null },
  { id: 5, title: "The Lean Startup", author: "Eric Ries", isbn: "978-0-307-88789-4", genre: "business", available: false, borrowedBy: "Brian Ochieng" },
  { id: 6, title: "Clean Code", author: "Robert C. Martin", isbn: "978-0-13-235088-4", genre: "technology", available: true, borrowedBy: null },
  { id: 7, title: "Dust", author: "Yvonne Adhiambo Owuor", isbn: "978-1-78470-045-2", genre: "fiction", available: true, borrowedBy: null },
  { id: 8, title: "Half of a Yellow Sun", author: "Chimamanda Ngozi Adichie", isbn: "978-1-4000-9520-3", genre: "fiction", available: true, borrowedBy: null }
];

function findBook(id) {
  return books.find((book) => book.id === Number(id));
}

function parsePositiveInteger(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    return `${fieldName} must be a positive integer`;
  }

  return number;
}

router.get("/", (req, res) => {
  const { genre, available, search, page, limit, sort, order = "asc" } = req.query;
  let result = [...books];

  if (genre) {
    result = result.filter(
      (book) => book.genre.toLowerCase() === genre.toLowerCase()
    );
  }

  if (available !== undefined) {
    if (available !== "true" && available !== "false") {
      return res
        .status(400)
        .json({ success: false, error: "Available must be true or false" });
    }
    result = result.filter((book) => book.available === (available === "true"));
  }

  if (search) {
    const searchTerm = search.toLowerCase();
    result = result.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
  }

  if (sort) {
    if (!["title", "author"].includes(sort) || !["asc", "desc"].includes(order)) {
      return res.status(400).json({
        success: false,
        error: "Sort must be title or author and order must be asc or desc"
      });
    }

    result.sort((first, second) => {
      const comparison = first[sort].localeCompare(second[sort]);
      return order === "asc" ? comparison : -comparison;
    });
  }

  const parsedPage = parsePositiveInteger(page, "Page");
  const parsedLimit = parsePositiveInteger(limit, "Limit");
  if (typeof parsedPage === "string" || typeof parsedLimit === "string") {
    return res.status(400).json({
      success: false,
      error: typeof parsedPage === "string" ? parsedPage : parsedLimit
    });
  }

  const response = { success: true, count: result.length, data: result };
  if (parsedPage !== undefined || parsedLimit !== undefined) {
    const currentPage = parsedPage || 1;
    const currentLimit = parsedLimit || result.length || 1;
    const total = result.length;

    response.data = result.slice(
      (currentPage - 1) * currentLimit,
      currentPage * currentLimit
    );
    response.count = response.data.length;
    response.pagination = {
      page: currentPage,
      limit: currentLimit,
      total,
      totalPages: Math.ceil(total / currentLimit)
    };
  }

  res.json(response);
});

router.post("/", validateBook(), (req, res) => {
  const book = {
    id: Math.max(0, ...books.map((existingBook) => existingBook.id)) + 1,
    title: req.body.title.trim(),
    author: req.body.author.trim(),
    isbn: req.body.isbn.trim(),
    genre: req.body.genre.trim(),
    available: req.body.available === undefined ? true : req.body.available,
    borrowedBy: req.body.available === false ? req.body.borrowedBy.trim() : null
  };

  books.push(book);
  res.status(201).json({ success: true, data: book });
});

router.get("/:id", (req, res) => {
  const book = findBook(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, error: "Book not found" });
  }

  res.json({ success: true, data: book });
});

router.put("/:id", validateBook(true), (req, res) => {
  const index = books.findIndex((book) => book.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Book not found" });
  }

  books[index] = {
    id: books[index].id,
    title: req.body.title.trim(),
    author: req.body.author.trim(),
    isbn: req.body.isbn.trim(),
    genre: req.body.genre.trim(),
    available: req.body.available,
    borrowedBy: req.body.borrowedBy === null ? null : req.body.borrowedBy.trim()
  };

  res.json({ success: true, data: books[index] });
});

router.delete("/:id", (req, res) => {
  const index = books.findIndex((book) => book.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Book not found" });
  }

  if (!books[index].available) {
    return res.status(400).json({
      success: false,
      error: "Cannot delete a book that is currently borrowed"
    });
  }

  const [deletedBook] = books.splice(index, 1);
  res.json({ success: true, data: deletedBook });
});

router.post("/:id/borrow", validateBorrower, (req, res) => {
  const book = findBook(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, error: "Book not found" });
  }

  if (!book.available) {
    return res.status(400).json({
      success: false,
      error: `Book is already borrowed by ${book.borrowedBy}`
    });
  }

  book.available = false;
  book.borrowedBy = req.body.borrower.trim();
  res.json({ success: true, data: book });
});

router.post("/:id/return", (req, res) => {
  const book = findBook(req.params.id);
  if (!book) {
    return res.status(404).json({ success: false, error: "Book not found" });
  }

  if (book.available) {
    return res
      .status(400)
      .json({ success: false, error: "Book is not currently borrowed" });
  }

  book.available = true;
  book.borrowedBy = null;
  res.json({ success: true, data: book });
});

module.exports = router;
