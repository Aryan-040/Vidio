import {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import ApiError from "../utils/apiError.js"
import ApiResponse from "../utils/apiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    
    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res.status(200).json(
            new ApiResponse(200, {liked: false}, "Video like removed")
        )
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Video liked successfully"))
})



export {toggleVideoLike}