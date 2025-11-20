import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import ApiError from "../utils/apiError.js"
import ApiResponse from "../utils/apiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"
import uploadOnCloudinary, {deleteFromCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId
    } = req.query

    if (userId && !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID")
    }

    if (userId) {
        const userExists = await User.exists({_id: userId})
        if (!userExists) {
            throw new ApiError(404, "User not found")
        }
    }

    const matchStage = {
        isPublished: true
    }

    if (query?.trim()) {
        matchStage.$or = [
            {title: {$regex: query.trim(), $options: "i"}},
            {description: {$regex: query.trim(), $options: "i"}}
        ]
    }

    if (userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const pipeline = [
        {$match: matchStage},
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {$first: "$owner"}
            }
        }
    ]

    const sortField = typeof sortBy === "string" && sortBy.trim() ? sortBy : "createdAt"
    const sortOrder = String(sortType).toLowerCase() === "asc" ? 1 : -1

    pipeline.push({
        $sort: {
            [sortField]: sortOrder
        }
    })

    const aggregate = Video.aggregate(pipeline)

    const videos = await Video.aggregatePaginate(aggregate, {
        page: Math.max(parseInt(page, 10) || 1, 1),
        limit: Math.max(parseInt(limit, 10) || 10, 1)
    })

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})
const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body
    const titleTrimmed = title?.trim()
    const descriptionTrimmed = description?.trim()

    if (!titleTrimmed || !descriptionTrimmed) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoLocalPath =
        req.files?.videoFile?.[0]?.path ??
        (req.file?.fieldname === "videoFile" ? req.file.path : undefined)
    const thumbnailLocalPath =
        req.files?.thumbnail?.[0]?.path ??
        (req.file?.fieldname === "thumbnail" ? req.file.path : undefined)

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is required")
    }

    const uploadedVideo = await uploadOnCloudinary(videoLocalPath)
    if (!uploadedVideo?.url) {
        throw new ApiError(500, "Failed to upload video")
    }

    const uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!uploadedThumbnail?.url) {
        throw new ApiError(500, "Failed to upload thumbnail")
    }

    const video = await Video.create({
        title: titleTrimmed,
        description: descriptionTrimmed,
        videoFile: uploadedVideo.url,
        thumbnail: uploadedThumbnail.url,
        duration: uploadedVideo.duration || 0,
        owner: req.user._id
    })

    const populatedVideo = await Video.findById(video._id).populate(
        "owner",
        "fullName username avatar"
    )

    return res
        .status(201)
        .json(new ApiResponse(201, populatedVideo, "Video published successfully"))
})
const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }

    const video = await Video.findById(videoId).populate(
        "owner",
        "fullName username avatar"
    )

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const isOwner =
        req.user?._id &&
        video.owner?._id &&
        video.owner._id.toString() === req.user._id.toString()

    if (!video.isPublished && !isOwner) {
        throw new ApiError(403, "You don't have access to this video")
    }

    video.views += 1
    await video.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"))
})


export {
    getAllVideos,
    publishAVideo,
    getVideoById
}