// server.js
const express = require("express");
const cors = require("cors");
const booksRouter = require("./routes/books");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/books", booksRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Books API is running on http://localhost:${port}`);
  });
}

module.exports = app;
