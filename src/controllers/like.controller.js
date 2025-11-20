import {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {Video} from "../models/video.model.js"
import {Comment} from "../models/comment.model.js"
import {Tweet} from "../models/tweet.model.js"
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
const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    
    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findById(commentId)
    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res
            .status(200)
            .json(new ApiResponse(200, {liked: false}, "Comment like removed"))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Comment liked successfully"))
})
const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    
    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if (existingLike) {
        await existingLike.deleteOne()
        return res
            .status(200)
            .json(new ApiResponse(200, {liked: false}, "Tweet like removed"))
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res
        .status(200)
        .json(new ApiResponse(200, {liked: true}, "Tweet liked successfully"))
})
const getLikedVideos = asyncHandler(async (req, res) => {
    const likes = await Like.find({
        likedBy: req.user?._id,
        video: {$exists: true, $ne: null}
    })
        .populate({
            path: "video",
            populate: {
                path: "owner",
                select: "fullName username avatar"
            }
        })
        .sort({createdAt: -1})

    const videos = likes
        .map((like) => like.video)
        .filter((video) => Boolean(video))

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Liked videos fetched successfully"))
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike
}