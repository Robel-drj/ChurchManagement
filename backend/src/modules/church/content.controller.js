
import {
  createPost,
  listManagePosts,
  getPostDetails,
  updatePost,
  changePostStatus,
  addPostMedia,
  removePostMedia,
  deletePost,
  listPublishedPosts,
  getPublishedPost,
  setPublishedPostLike,
} from "./content.service.js";

import {
  createPostSchema,
  updatePostSchema,
  postIdSchema,
  listPostsQuerySchema,
  postActionSchema,
} from "./content.validation.js";

function validatePostId(value) {
  return postIdSchema.safeParse(value);
}

export async function addPost(req, res, next) {
  try {
    const validation = createPostSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const post = await createPost(
      req.church.id,
      req.churchMembership.id,
      validation.data
    );

    return res.status(201).json({
      success: true,
      message: "Post created as a draft.",
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

export async function getManagePosts(req, res, next) {
  try {
    const validation = listPostsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const result = await listManagePosts(
      req.church.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getManagePost(req, res, next) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    const post = await getPostDetails(
      req.church.id,
      idValidation.data
    );

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

export async function editPost(req, res, next) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    const validation = updatePostSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const post = await updatePost(
      req.church.id,
      idValidation.data,
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Post updated successfully.",
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePostStatus(req, res, next) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    const validation = postActionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const post = await changePostStatus(
      req.church.id,
      idValidation.data,
      validation.data.action
    );

    return res.status(200).json({
      success: true,
      message: `Post ${validation.data.action} successful.`,
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadPostMedia(req, res, next) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one image or video.",
      });
    }

    const media = await addPostMedia(
      req.church.id,
      idValidation.data,
      req.files
    );

    return res.status(201).json({
      success: true,
      message: "Media uploaded successfully.",
      data: media,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePostMedia(req, res, next) {
  try {
    const postValidation = validatePostId(req.params.postId);
    const mediaValidation = validatePostId(req.params.mediaId);

    if (!postValidation.success || !mediaValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Valid post and media IDs are required.",
      });
    }

    const result = await removePostMedia(
      req.church.id,
      postValidation.data,
      mediaValidation.data
    );

    return res.status(200).json({
      success: true,
      message: "Media deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function removePost(req, res, next) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    const result = await deletePost(
      req.church.id,
      idValidation.data
    );

    return res.status(200).json({
      success: true,
      message: "Post and its media records deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublishedFeed(req, res, next) {
  try {
    const validation = listPostsQuerySchema
      .omit({ status: true })
      .safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: validation.error.flatten(),
      });
    }

    const result = await listPublishedPosts(
      req.church.id,
      req.churchMembership.id,
      validation.data
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublishedPostDetails(req, res, next) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    const post = await getPublishedPost(
      req.church.id,
      idValidation.data,
      req.churchMembership.id
    );

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
}

async function changePublishedPostLike(req, res, next, liked) {
  try {
    const idValidation = validatePostId(req.params.postId);

    if (!idValidation.success) {
      return res.status(400).json({
        success: false,
        message: "A valid post ID is required.",
      });
    }

    const state = await setPublishedPostLike(
      req.church.id,
      idValidation.data,
      req.churchMembership.id,
      liked
    );

    return res.status(200).json({
      success: true,
      message: liked ? "Post liked." : "Post like removed.",
      data: state,
    });
  } catch (error) {
    next(error);
  }
}

export async function likePublishedPost(req, res, next) {
  return changePublishedPostLike(req, res, next, true);
}

export async function unlikePublishedPost(req, res, next) {
  return changePublishedPostLike(req, res, next, false);
}
