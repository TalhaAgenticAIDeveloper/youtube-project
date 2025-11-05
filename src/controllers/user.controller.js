import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler( async (req, res) => {
    
    // get user details from front-end
    // validation - not empty
    // check if user already exists: username and email
    // check for images, check for avatar
    // upload them to cloudinary - avatar
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user creation 
    // return response



    // get user details from front-end
    // if data coming from json or form then you can get it from req.body
    const {fullName, username, email, password} = req.body
    console.log("email: ", email);
    console.log("password: ", password);
    



/************************************************************************************** */
// validation - not empty

// if(fullName === "" || username === "" || email === "" || password === "") {
    //  throw new ApiError(400, "All fields are required");   
    // }
    
    // yahan bhi same kam ho rha hy yahan agr field hy to trim hogi of trim hony k bad bhi agr 
    // empty hy to error
    if(
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required");  
    }
    
    


/************************************************************************************** */
// check if user already exists: username and email
    const existingUsername = User.findOne({ username });
    if (existingUsername) {
        throw new ApiError(409, "Username already exists");
    }

    const existingEmail = User.findOne({ email });
    if (existingEmail) {
        throw new ApiError(409, "Email already exists");
    }



/************************************************************************************** */
// check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }



/************************************************************************************** */
// upload them to cloudinary - avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar image is required");
    }


/************************************************************************************** */
// create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // as it is optional
        email,
        password,
        username: username.toLowerCase(),
    })

/************************************************************************************** */
// remove password and refresh token from response
    const createdUser = await user.findById(user._id).select("-password -refreshToken");



/************************************************************************************** */
// check for user creation 
    if(!createdUser) {
        throw new ApiError(500, "User registration failed");
    }




/************************************************************************************** */
// return response
    res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );

})





export {registerUser}