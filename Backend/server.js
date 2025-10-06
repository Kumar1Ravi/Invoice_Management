const express = require("express");
const path = require("path");
const session = require("express-session");
const cors = require("cors");

// Routers
const loginRouter = require("./login_api");
const uploadRouter = require("./upload_api");
const invoiceRouter = require("./invoice_api");
const analysisRouter = require("./analysis_api");
const invoiceConsRouter = require("./invoice_cons_api");  // ADD THIS


const app = express();

// CORS
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}));

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// API routes
app.use("/api", loginRouter);
app.use("/api", uploadRouter);
app.use("/api", invoiceRouter);
app.use("/api", analysisRouter);
app.use("/api", invoiceConsRouter);  // ADD THIS

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:3000`);
});