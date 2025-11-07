import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


    // get user details from front-end
    // validation - not empty
    // check if user already exists: username and email
    // check for images, check for avatar
    // upload them to cloudinary - avatar
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user creation 
    // return response




const registerUser = asyncHandler( async (req, res) => {
    
    // get user details from front-end
    // if data coming from json or form then you can get it from req.body
    const {fullName, username, email, password} = req.body

    



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
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
        throw new ApiError(409, "Username already exists");
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
        throw new ApiError(409, "Email already exists");
    }



/************************************************************************************** */
// check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // isko hum is terha sy is liye kr rhy hain Q k yeh optional hy agr user coverImage nhi bhej rha to phir path bhi nhi hona chahiye 
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "avatarLocalPath image is required");
    }




/************************************************************************************** */
// upload them to cloudinary - avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ?  await uploadOnCloudinary(coverImageLocalPath) : null;



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
    console.log("Newly created user: ", user);

/************************************************************************************** */
// remove password and refresh token from response
    // const createdUser = await user.findById(user._id).select("-password -refreshToken");
const createdUser = user.toObject();
delete createdUser.password;
delete createdUser.refreshToken;



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


    console.log("code: 201, User registered successfully");
    
})





export {registerUser}