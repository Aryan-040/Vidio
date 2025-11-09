import express from "express"
import cors from "cors"
import cookiesParcer from "cookies-parcer"

const app = express()

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credential : true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(express.static("public")) 

app.use(cookiesParcer())

export default app  