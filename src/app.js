import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";

const app = express();





app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({
    limit:"16kb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))

app.use(express.static("public"))

app.use(cookieParser())


// Routes Import

import userRouter from "./routes/user.routes.js"



// Routes Declaration
app.use("/api/v1/users", userRouter) // this is standard practic to add /api/v1 or /api/v2 as prefix


// test route
app.get("/", (req, res) => {
  res.send("Server is working!");
});


export { app }