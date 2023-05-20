const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const https = require("https");
const colors = require("colors")

const app = express();

const printNetworkAddresses = () => {
  const { networkInterfaces } = require("os");

  const nets = networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
          const familyV4Value = typeof net.family === "string" ? "IPv4" : 4;
          if (net.family === familyV4Value && !net.internal) {
              console.log(net.address.bold)
          }
      }
  }
};


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
    if (err || !files) {
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

const setTerminalTitle = (title) => {
  process.stdout.write(
    String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
  );
}

// Start the HTTPS server
const PORT = process.env.PORT || 5000;
const options = {
  key: fs.readFileSync("private-key.pem"),
  cert: fs.readFileSync("certificate.pem"),
};

console.clear();
https.createServer(options, app).listen(PORT, () => {
  setTerminalTitle(`Сервер на порте ${PORT}`)
  console.log(`Сервер запущен на порте ${PORT}\n______ _______ __ _____ ____\n`.rainbow);
  console.log("IP адреса на сети:\n".bold)
  
  printNetworkAddresses()
});