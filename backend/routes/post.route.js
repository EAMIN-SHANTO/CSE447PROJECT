import express from "express";
import { getPosts,getPost,createPost,updatePost,deletePost } from "../controllers/post.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { uploadPostImages } from "../middleware/upload-post-images.js";




const router = express.Router();



// router.get("/anothertest", (req, res) => {
//     res.status(200).send("Hello from user route");
// });


router.get("/",getPosts);
router.get("/:slug",getPost);
router.post("/",authenticate,uploadPostImages,createPost);
router.patch("/:id",authenticate,uploadPostImages,updatePost);
router.delete("/:id",authenticate,deletePost);

   




export default router;