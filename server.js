const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const replaced = file.originalname.replaceAll(" ", "_");
    cb(null, `${Date.now()}_${encodeURI(replaced)}`);
  },
});

const upload = multer({ storage: storage });

// Enable CORS
app.use(cors());

// Handle file upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    res.send(`/files/${await req.file.filename}`);
  } catch (err) {
    res.status(400).send(err);
  }
});

// Get list of uploaded files
app.get("/files", (req, res) => {
  const directoryPath = path.join(__dirname, "uploads");

  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      res.status(500).send({ error: "Unable to scan directory" });
    }

    const fileInfos = [];

    files.forEach((file) => {
      const fileInfo = {
        name: file,
        url: `${req.protocol}://${req.hostname}:${
          process.env.PORT || 5000
        }/files/${file}`,
      };
      fileInfos.push(fileInfo);
    });

    res.send(fileInfos);
  });
});

// Serve uploaded files
app.use(
  "/files",
  (req, res, next) => {
    const filePath = path.join(__dirname, "uploads", req.path);
    fs.access(filePath, (err) => {
      if (err) {
        res.status(404).send("File not found");
      } else {
        next();
      }
    });
  },
  express.static("uploads")
);

// Start the HTTPS server
const PORT = process.env.PORT || 5000;
const options = {
  key: fs.readFileSync("private-key.pem"),
  cert: fs.readFileSync("certificate.pem"),
};

console.clear();
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});