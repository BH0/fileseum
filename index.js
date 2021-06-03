let fs = require("fs"); 
const stream = require('stream')
const multer = require("multer"); 
const uuid = require("uuid"); 
const path = require("path"); 
let express = require("express"); 
let app = express(); 

function sendStream(pathToFile, contentType, req, res) {
  const path = pathToFile; 
  const stat = fs.statSync(path); 
  const fileSize = stat.size; 
  const range = req.headers.range; 
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-"); 
    const start = parseInt(parts[0], 10); 
    const end = parts[1] ? parseInt(parts[1], 10)  : fileSize - 1; 
    const chunksize = (end-start) + 1; 
    const file = fs.createReadStream(path, {start, end}); 
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    }
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  } 
}

app.use(express.static(__dirname + '/public'));

const storage = multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, 'uploads/');
  },

  filename: function(req, file, callback) {
      let id = uuid.v4(); 
      callback(null, file.fieldname + '-' + id + path.extname(file.originalname));
  }
});

app.post('/upload', (req, res) => {
  let upload = multer({ storage: storage }).single('upload');
  upload(req, res, function(err) {
      if (req.fileValidationError) {
          return res.send(req.fileValidationError);
      }
      else if (!req.file) {
          return res.send('Please select a file to upload');
      }
      else if (err instanceof multer.MulterError) {
          return res.send(err);
      }
      else if (err) {
          return res.send(err);
      }

      // /audio/upload-filename.mp3 /video/upload-filename.mp4  /text/upload-filename.txt /image/upload-filename.png  
      res.send(req.file.path); 
  });
});

app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, '/public/upload.html'));
}); 

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
}); 

app.get('/video/:filename', function(req, res) {
  sendStream(`uploads/${req.params.filename}.mp4`, "video/mp4", req, res); 
}); 

app.get('/audio/:filename', function(req, res) {
  sendStream(`uploads/${req.params.filename}.mp3`, "audio/mpeg", req, res); 
}); 

app.get("/image/:filename", (req, res) => {
  const readableStream = fs.createReadStream(`uploads/${req.params.filename}.png`); 
  const passThrough = new stream.PassThrough();
  stream.pipeline(
  readableStream,
  passThrough,
  (err) => {
    if (err) {
      console.log(err) 
      return res.sendStatus(400); 
    }
  })
  passThrough.pipe(res) 
});

app.get("/text/:filename", (req, res) => {
  sendStream(`uploads${req.params.filename}.txt`, "text/plain", req, res); 
});
  

app.listen(3000); 