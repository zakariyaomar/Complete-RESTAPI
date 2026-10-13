// AI-assisted: These middleware helpers validate book input and keep availability data consistent.
const requiredBookFields = ["title", "author", "isbn", "genre"];

function isValidIsbn(isbn) {
  return (
    typeof isbn === "string" &&
    isbn.length >= 10 &&
    /\d/.test(isbn) &&
    /-/.test(isbn)
  );
}

function validateBook(isUpdate = false) {
  return (req, res, next) => {
    const errors = [];
    const { title, author, isbn, genre, available, borrowedBy } = req.body;

    for (const field of requiredBookFields) {
      if (
        typeof req.body[field] !== "string" ||
        req.body[field].trim().length === 0
      ) {
        errors.push(`${field[0].toUpperCase()}${field.slice(1)} is required`);
      }
    }

    if (isbn && !isValidIsbn(isbn)) {
      errors.push("ISBN must contain digits and dashes and be at least 10 characters");
    }

    if (isUpdate && typeof available !== "boolean") {
      errors.push("Available must be true or false");
    }

    if (isUpdate && !Object.prototype.hasOwnProperty.call(req.body, "borrowedBy")) {
      errors.push("BorrowedBy is required");
    }

    if (typeof available === "boolean") {
      if (available && borrowedBy !== null) {
        errors.push("BorrowedBy must be null when a book is available");
      }

      if (
        !available &&
        (typeof borrowedBy !== "string" || borrowedBy.trim().length === 0)
      ) {
        errors.push("BorrowedBy is required when a book is borrowed");
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, error: errors.join(", ") });
    }

    next();
  };
}

function validateBorrower(req, res, next) {
  if (
    typeof req.body.borrower !== "string" ||
    req.body.borrower.trim().length === 0
  ) {
    return res
      .status(400)
      .json({ success: false, error: "Borrower is required" });
  }

  next();
}

module.exports = { validateBook, validateBorrower };
