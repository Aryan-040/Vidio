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
export {
    getAllVideos,
   
}