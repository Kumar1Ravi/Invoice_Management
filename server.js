const express = require("express");
const path = require("path");
const session = require("express-session");
const cors = require("cors");

// Routers
const loginRouter = require("./Backend/login_api");
const uploadRouter = require("./Backend/upload_api");
const invoiceRouter = require("./Backend/invoice_api");
const analysisRouter = require("./Backend/analysis_api");
const invoiceConsRouter = require("./Backend/invoice_cons_api");

const app = express();

// CORS - allow all origins for Vercel deployment
app.use(cors({
    origin: true, // Allow all origins
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || "mysecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Secure in production
        sameSite: 'lax'
    }
}));

// Serve frontend
app.use(express.static(path.join(__dirname, "Frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Frontend/login.html"));
});

// API routes
app.use("/api", loginRouter);
app.use("/api", uploadRouter);
app.use("/api", invoiceRouter);
app.use("/api", analysisRouter);
app.use("/api", invoiceConsRouter);

// Export app for Vercel
module.exports = app;

// For local development
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
}
