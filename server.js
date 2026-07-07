import express from "express"

// create express server app
const app = express()

// serve static files on client folder
app.use(express.static("client"))

// setup json middleware
app.use(express.json())

// define api
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "name@example.com" && password === "Pas$w0rd") {
    res.send({ success: true })
  }
  else {
    res.send({ success: false })
  }
})

// start server 
app.listen(3000, () => {
  // started callback
  console.log("Server started! http://localhost:3000")
})
