import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";



// This method is reuseable in other projects aswell
const generateAccessAndRefreshToken = async (userId) => {

    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Token generation failed");
    }

}






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


const loginUser = asyncHandler( async (req, res) => {
    
    // Data form req.body
    // username or Email
    // find the user
    //password check
    // generate access and refresh token
    // send cookies
    


    // Data form req.body
    const { username, email, password } = req.body;

    // username or Email
    if (!username && !email) {
        throw new ApiError(400, "Username or Email is required");
    }

    // find the user
    const user = await User.findOne({
        // $or: [{ username: username?.toLowerCase() }, { email: email }],
        $or: [{ username: username?.toLowerCase() }, { email: email }],
    })

    if (!user) {
        throw new ApiError(404, "User not found");
    }


    //password check         // to access our created method in user model use "user" not "User"
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }


    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = user.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json(
        new ApiResponse(200, 
            {user: loggedInUser, accessToken, refreshToken}, 
            "User logged in successfully"
        )
    )

})


const logoutUser = asyncHandler( async (req, res) => {
    // get user from req.user
    await User.findByIdAndUpdate(
        req.user._id,
        { 
        $set: { refreshToken: undefined }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(
        new ApiResponse(200, null, "User logged out successfully")
    )
    });


const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unzuthorized Request ");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
            
        const user = await User.findById(decodedToken?._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token mismatch");
        }
    
    
        const options = {
            httpOnly: true,
            secure: true,
        }
    
        const {accessToken, newRefreshToken} = await user.generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("refreshToken", newRefreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, 
                {accessToken, refreshToken: newRefreshToken}, 
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }
})


const changeCurrentPassword = asyncHandler( async (req, res) => {
   
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(
        new ApiResponse(200, null, "Password changed successfully")
    )


})


const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    )
});



const updateAccountDetails = asyncHandler( async (req, res) => {

    const { fullName, username, email } = req.body;

    if(!fullName?.trim() || !username?.trim() || !email?.trim()) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                username: username.toLowerCase(),
                email,
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "User details updated successfully")
    )
});


const updateUserAvatar = asyncHandler( async (req, res) => {

    const avatarLocalPath = req.files?.avatar[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) {
        throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "User avatar updated successfully")
    )

});


const updateUserCoverImage = asyncHandler( async (req, res) => {

    const coverImageLocalPath = req.files?.avatar[0]?.path;

    if(!coverImageLocalPath) {
        throw new ApiError(400, "cover image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) {
        throw new ApiError(500, "Avatar upload failed");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password");

    return res
    .status(200)
    .json(
        new ApiResponse(200,user, "User coverImage updated successfully")
    )

});


const getUserChannelProfile = asyncHandler( async (req, res) => {
    const { username } = req.params;

    if(!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: { 
                username: username.toLowerCase()

            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
        }
    },
    {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
        }
    },
    {
        $addFields: {
            subscribersCount: { 
                $size: "$subscribers"
            },
            channelsSubscribedToCount: { 
                $size: "$subscribedTo" 
            },
            isSubscribed: {
                $cond:{
                    if:{$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
    }
    },
    {
        $project: {
            fullName: 1,
            username: 1,
            email: 1,
            subscribersCount: 1,
            channelsSubscribedToCount: 1,
            isSubscribed: 1,
            avatar: 1,
            coverImage: 1
        }
    }
    
    ])

    if(!channel?.length) {
        throw new ApiError(404, "Channel not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    )


});


const getWatchHistory = asyncHandler( async (req, res) => {

    const user = await User.aggregate([
        {
            $match: { 
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        }, 
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline:[
                            {
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1,
                            }
                        }
                        ]
                }
            },
            {
                $addFields:{
                    owner: { 
                        $first:"$owner"
                    }
                }
            }
            ]
        }
    }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    )
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};