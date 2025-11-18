import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";



// as we are not using 'res' here that is why underscore is used
// export const verifyJWT = asyncHandler(async (req, _, next) => {


export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        
        const token = req.cookies.accessToken || req.headers("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "unauthorized access");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        if (!user) {
            throw new ApiError(401, "unauthorized access");
        }
    
        req.user = user;
        next();

    } catch (error) {
        throw new ApiError(401, "unauthorized access");
    }
});