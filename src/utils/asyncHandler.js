// ************************************* TRY AND CATCH TRICK *************************************

// const asyncHandler = (fn) => async (req,res,next) => {

//     try {
//         fn(req,res,next)
//     } catch (error) {
//         res.send(error.code || 500).json({message: error.message || "Something went wrong"})
//     }
// }




// export { asyncHandler }





// ************************* PROMISE TRICK *************************************

const asyncHandler = (requestHandler) =>{
   return (req,res,next) => {
        Promise
        .resolve(requestHandler(req,res,next))
        .catch((err) => next(err))
    }
}


export { asyncHandler }